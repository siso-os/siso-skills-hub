#!/usr/bin/env python3
"""
task.py — the global /task CLI: a durable, shared, per-task brain.

The .tasks/ FOLDER is the source of truth (90%, read/write-hot, git-trackable,
every CLI can cat it). The spine DB + brain-API hold a THIN index/event mirror
(10%) so agents in other tabs/CLIs/machines can discover a task and see its
timeline. File writes always succeed locally; the brain bridge is best-effort
and degrades to braind's outbox — never a silent no-op.

Subcommands:
  init "title"     create a task (scaffolds .tasks/ if absent)
  claim TASK-NNNN  atomically take ownership
  log   TASK-NNNN "note"     append a timeline entry
  learn TASK-NNNN "lesson"   append a distilled learning (carry-forward)
  update TASK-NNNN --status … [--field …]   set fields / move lifecycle
  check [TASK-NNNN]          consistency gate (promised Next == tracked item)
  render TASK-NNNN           regenerate task.md from task.json
  recall [--q …]            what tasks exist across agents (brain-API)
  show  TASK-NNNN            print task.json
  list  [--status …]        list tasks

Design steals (see SKILL.md): beads dotted-IDs, temporal event-sourcing,
Memorix atomic claim, openclaw learnings-promotion, mcruzae check-gate.
"""
import argparse
import fcntl
import json
import os
import shutil
import subprocess
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# constants / locations
# ---------------------------------------------------------------------------
SKILL_DIR = Path(__file__).resolve().parent.parent
TEMPLATES = SKILL_DIR / "templates"

LIFECYCLE = ["backlog", "queued", "in_progress", "blocked", "completed", "cancelled"]
OPEN_STATES = ["backlog", "queued", "in_progress", "blocked"]
VALID = {
    "status": LIFECYCLE,
    "priority": ["critical", "high", "medium", "low"],
    "domain": ["ui", "security", "backend", "lifecycle", "infra", "data", "research", "ops"],
    "category": ["feature", "idea", "gap", "bugfix", "infrastructure", "research", "content", "setup"],
}


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def die(msg: str, code: int = 1):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def info(msg: str):
    print(msg)


# ---------------------------------------------------------------------------
# .tasks/ discovery & scaffolding
# ---------------------------------------------------------------------------
def find_tasks_dir(start: Path = None) -> Path | None:
    """Walk up from CWD looking for an existing .tasks/ dir."""
    cur = (start or Path.cwd()).resolve()
    for d in [cur, *cur.parents]:
        for name in (".agents/tasks", ".tasks"):  # new canonical home first (oracle AGENTS-IA 2026-07-03), legacy second
            cand = d / name
            if cand.is_dir():
                return cand
    return None


def scaffold_tasks_dir(at: Path) -> Path:
    """Create a fresh .tasks/ in `at` from templates. Idempotent."""
    tasks = at / ".tasks"
    for folder in LIFECYCLE:
        (tasks / folder).mkdir(parents=True, exist_ok=True)
    (tasks / "scripts").mkdir(exist_ok=True)
    schema_dst = tasks / "task_schema.json"
    if not schema_dst.exists():
        shutil.copy(TEMPLATES / "task_schema.json", schema_dst)
    readme_dst = tasks / "README.md"
    if not readme_dst.exists():
        shutil.copy(TEMPLATES / "README.md", readme_dst)
    return tasks


def get_or_create_tasks_dir() -> Path:
    """For `init` only — may scaffold a new registry."""
    found = find_tasks_dir()
    if found:
        return found
    # scaffold in CWD
    info(f"no .tasks/ found — scaffolding in {Path.cwd()}")
    return scaffold_tasks_dir(Path.cwd())


def require_tasks_dir() -> Path:
    """For every command EXCEPT init — fail closed, never scaffold.
    A read/gate command (check/log/etc) that auto-creates an empty registry and
    reports clean is exactly the fake-green a gate exists to prevent."""
    found = find_tasks_dir()
    if not found:
        die("no .tasks/ registry found here (run `task init` first, or cd into the project). "
            "Refusing to scaffold from a non-init command.")
    return found


# ---------------------------------------------------------------------------
# task.json read/write (folder mirrors status)
# ---------------------------------------------------------------------------
def task_folder(tasks: Path, task_id: str) -> Path | None:
    """Find the folder for a task id across all lifecycle dirs."""
    for folder in LIFECYCLE:
        cand = tasks / folder / task_id
        if (cand / "task.json").exists():
            return cand
    return None


def load_task(tasks: Path, task_id: str) -> tuple[dict, Path]:
    folder = task_folder(tasks, task_id)
    if not folder:
        die(f"task {task_id} not found in {tasks}")
    try:
        data = json.loads((folder / "task.json").read_text())
    except json.JSONDecodeError as e:
        die(f"task {task_id} has malformed task.json ({e}) — repair {folder}/task.json")
    return data, folder


def try_load_task(tasks: Path, task_id: str):
    """Non-fatal load for bulk scans (#8/#20): a single corrupt task must not crash
    a scoped operation on an unrelated task. Returns (data, folder) or (None, folder)."""
    folder = task_folder(tasks, task_id)
    if not folder:
        return None, None
    try:
        return json.loads((folder / "task.json").read_text()), folder
    except (json.JSONDecodeError, OSError):
        return None, folder


def save_task(folder: Path, data: dict):
    """Atomic write (#4): tmp + fsync + os.replace so a crash/kill mid-write never
    leaves the 90%-of-truth file half-written and unparseable."""
    target = folder / "task.json"
    tmp = folder / f".task.json.{os.getpid()}.tmp"
    with open(tmp, "w") as fh:
        fh.write(json.dumps(data, indent=2) + "\n")
        fh.flush()
        os.fsync(fh.fileno())
    os.replace(tmp, target)


@contextmanager
def task_lock(tasks: Path, task_id: str):
    """Per-task advisory lock (#1/#2/#3/#5): serialize read-modify-write across
    concurrent agents/processes so timeline appends and claims can't lose writes.
    Lock file lives under .tasks/.locks/<id>.lock; flock auto-releases on close/crash."""
    lockdir = tasks / ".locks"
    lockdir.mkdir(exist_ok=True)
    lf = lockdir / f"{task_id}.lock"
    fh = open(lf, "w")
    try:
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
        yield
    finally:
        try:
            fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
        finally:
            fh.close()


def next_id(tasks: Path) -> str:
    """Scan ALL lifecycle folders so ids never collide across moves."""
    mx = 0
    for folder in LIFECYCLE:
        d = tasks / folder
        if not d.is_dir():
            continue
        for child in d.iterdir():
            name = child.name
            if name.startswith("TASK-"):
                head = name[5:].split(".")[0]
                if head.isdigit():
                    mx = max(mx, int(head))
    return f"TASK-{mx + 1:04d}"


def append_event(data: dict, action: str, by: str, notes: str = ""):
    data.setdefault("execution_log", []).append(
        {"timestamp": now_iso(), "action": action, "by": by, "notes": notes}
    )


def agent_name(explicit: str | None) -> str:
    return explicit or os.environ.get("SISO_AGENT_ID") or os.environ.get("AGENT_ID") or "agent"


# ---------------------------------------------------------------------------
# brain-API bridge (best-effort; never blocks the file write)
# ---------------------------------------------------------------------------
def siso_brain(*args: str) -> dict | None:
    """Call `siso-brain` if available. Returns parsed JSON or None. Never raises.

    siso-brain pretty-prints JSON across multiple lines, so parse the WHOLE
    stdout, not the last line. A successful write returns {"ok": true, "id": ...};
    a degraded write returns {"queued": true}; a failed read returns
    {"unreachable": true} or a non-zero exit.
    """
    exe = shutil.which("siso-brain")
    if not exe:
        return None
    try:
        out = subprocess.run(
            [exe, *args], capture_output=True, text=True, timeout=12
        )
        body = out.stdout.strip()
        if body:
            try:
                parsed = json.loads(body)  # full multi-line JSON
            except json.JSONDecodeError:
                # unparseable but we got something — treat as soft failure, not success
                return {"error": f"unparseable response: {body[:120]}"}
            # carry the exit code so _bridge_ok can reject a nonzero-exit-with-body (#7)
            if isinstance(parsed, dict):
                parsed.setdefault("_rc", out.returncode)
            return parsed
        if out.returncode != 0:
            return {"error": out.stderr.strip() or "nonzero exit", "unreachable": True}
        return {"error": "empty response"}
    except Exception as e:  # timeout, etc — bridge is best-effort
        return {"error": str(e), "unreachable": True}


def _bridge_ok(res: dict | None) -> bool:
    """A write truly succeeded only if braind acked positively. An `id` is NOT enough —
    a nonzero exit or ok:false means failure even when an id is echoed (#7)."""
    if not res:
        return False
    if res.get("_rc", 0) != 0:
        return False
    if res.get("ok") is False:
        return False
    return res.get("ok") is True or "id" in res


def bridge_timeline(task_id: str, by: str, event_type: str, message: str):
    """Mirror a timeline event to the spine via brain-API. Reports queued/sent/skip."""
    res = siso_brain("timeline", "--agent", by, "--type", event_type,
                     "--message", message, "--task", task_id)
    if res is None:
        return "bridge: siso-brain not on PATH (file-only)"
    if res.get("queued"):
        return "bridge: queued to outbox (braind unreachable — run `siso-brain drain`)"
    if _bridge_ok(res):
        return f"bridge: event mirrored to spine ({res.get('id', 'ok')})"
    return f"bridge: FAILED ({res.get('error', 'unknown')}) — file write OK, index NOT updated"


def bridge_memory(task_id: str, by: str, text: str):
    res = siso_brain("memory-write", "--content", text, "--agent", by,
                     "--tier", "semantic_fact", "--task", task_id)
    if res is None:
        return "bridge: siso-brain not on PATH (file-only)"
    if res.get("queued"):
        return "bridge: learning queued to outbox"
    if _bridge_ok(res):
        return f"bridge: learning promoted to spine memories ({res.get('id', 'ok')})"
    return f"bridge: learning NOT mirrored ({res.get('error', 'unknown')})"


# ---------------------------------------------------------------------------
# rendering: task.json -> task.md
# ---------------------------------------------------------------------------
def render_md(data: dict) -> str:
    tmpl = (TEMPLATES / "task.md.tmpl").read_text()

    def bullets(items, fmt):
        if not items:
            return "_none_"
        # tolerate mixed shapes: agents append plain strings where the schema
        # expects dicts (e.g. locations_of_truth) — render strings as-is
        return "\n".join(f"- {it}" if isinstance(it, str) else fmt(it) for it in items)

    parent = data.get("parent_task_id", "")
    parent_line = f" · **parent** `{parent}`" if parent else ""
    ev = data.get("evidence", "")
    evidence_line = f"\n> **evidence** {ev}" if ev else ""

    timeline = bullets(
        data.get("execution_log", []),
        lambda e: f"- `{e.get('timestamp','')}` **{e.get('action','')}** ({e.get('by','')}) — {e.get('notes','')}",
    )
    learnings = bullets(
        data.get("learnings", []),
        lambda l: f"- {l.get('text','')}  _(src: {', '.join(l.get('source_task_ids', []) or ['—'])})_",
    )
    fundamentals = bullets(data.get("fundamentals", []), lambda f: f"- {f}")
    lots = bullets(
        data.get("locations_of_truth", []),
        lambda x: f"- `{x.get('path','')}` — {x.get('what','')}",
    )
    pointers = bullets(data.get("context_pointers", []), lambda p: f"- {p}")

    plan_items = []
    spec = data.get("spec", {}) or {}
    for o in spec.get("objectives", []) or []:
        plan_items.append(f"- [ ] {o}")
    for a in spec.get("acceptance_criteria", []) or []:
        plan_items.append(f"- [accept] {a}")
    for dep in data.get("dependencies", []) or []:
        plan_items.append(f"- (depends on {dep})")
    plan = "\n".join(plan_items) if plan_items else "_none_"

    goal = spec.get("description", "") or "_TODO_"

    out = tmpl
    repl = {
        "{{id}}": data.get("id", ""),
        "{{title}}": data.get("title", ""),
        "{{status}}": data.get("status", ""),
        "{{priority}}": data.get("priority", ""),
        "{{domain}}": data.get("domain", ""),
        "{{category}}": data.get("category", ""),
        "{{target_agent}}": data.get("target_agent", "") or "—",
        "{{created_at}}": data.get("created_at", ""),
        "{{created_by}}": data.get("created_by", ""),
        "{{parent_line}}": parent_line,
        "{{verified}}": "✅" if data.get("verified") else "⬜ (unverified)",
        "{{evidence_line}}": evidence_line,
        "{{goal}}": goal,
        "{{fundamentals}}": fundamentals,
        "{{locations_of_truth}}": lots,
        "{{context_pointers}}": pointers,
        "{{plan}}": plan,
        "{{timeline}}": timeline,
        "{{learnings}}": learnings,
    }
    for k, v in repl.items():
        out = out.replace(k, v)
    return out


def write_render(folder: Path, data: dict):
    (folder / "task.md").write_text(render_md(data))


# ---------------------------------------------------------------------------
# subcommands
# ---------------------------------------------------------------------------
def cmd_init(a):
    tasks = get_or_create_tasks_dir()
    by = agent_name(a.by)
    tid = next_id(tasks)
    now = now_iso()
    data = {
        "id": tid,
        "title": a.title,
        "status": "backlog",
        "priority": a.priority,
        "domain": a.domain,
        "category": a.category,
        "target_agent": "",
        "created_at": now,
        "created_by": by,
        "evidence": a.evidence or "",
        "verified": False,
        "spec": {"description": a.desc or "", "objectives": [], "acceptance_criteria": [],
                 "context": "", "files_affected": []},
        "dependencies": [d.strip() for d in (a.deps or "").split(",") if d.strip()],
        "execution_log": [{"timestamp": now, "action": "created", "by": by, "notes": "logged to backlog"}],
        "parent_task_id": "",
        "root_task_id": tid,
        "fundamentals": [],
        "locations_of_truth": [],
        "context_pointers": [],
        "learnings": [],
    }

    # ---- lineage carry-forward (Phase 2) ----
    if a.parent:
        pdata, _ = load_task(tasks, a.parent)
        data["parent_task_id"] = a.parent
        data["root_task_id"] = pdata.get("root_task_id") or a.parent
        # inherit parent's fundamentals + distilled learnings into this task's fundamentals
        inherited = list(pdata.get("fundamentals", []))
        for l in pdata.get("learnings", []):
            txt = l.get("text", "").strip()
            if txt:
                inherited.append(f"(inherited from {a.parent}) {txt}")
        data["fundamentals"] = inherited
        append_event(data, "note", by, f"inherited {len(inherited)} fundamentals/learnings from {a.parent}")

    folder = tasks / "backlog" / tid
    folder.mkdir(parents=True, exist_ok=True)
    save_task(folder, data)
    write_render(folder, data)

    bridge = bridge_timeline(tid, by, "ACTION", f"created task: {a.title}")
    info(f"created {tid}  [{a.domain}/{a.category}/{a.priority}]  {a.title}")
    info(f"  {folder}/task.json")
    info(f"  {bridge}")


def _require_owner(data: dict, by: str, task_id: str, force: bool):
    """Ownership enforcement (#10): once claimed, only the owner mutates — else the
    atomic-claim guarantee is cosmetic. --force records an explicit takeover."""
    owner = data.get("target_agent", "")
    if owner and owner != by and not force:
        die(f"{task_id} is owned by '{owner}', not '{by}'. Use --force to take over "
            f"(records a handoff), or claim it first.", code=2)
    if owner and owner != by and force:
        append_event(data, "handoff", by, f"forced takeover from {owner}")
        data["target_agent"] = by


def cmd_claim(a):
    tasks = require_tasks_dir()
    by = agent_name(a.by)
    with task_lock(tasks, a.task_id):                 # lock makes check-then-set truly atomic (#2)
        data, folder = load_task(tasks, a.task_id)
        cur_owner = data.get("target_agent", "")
        if cur_owner and cur_owner != by:
            die(f"{a.task_id} already claimed by '{cur_owner}' — claim rejected", code=2)
        data["target_agent"] = by
        if data["status"] == "backlog":
            data["status"] = "in_progress"
        append_event(data, "claimed", by, a.notes or "took ownership")
        data, folder = _move_if_needed(tasks, data, folder)
        save_task(folder, data)
        write_render(folder, data)
    bridge = bridge_timeline(a.task_id, by, "HANDOFF", f"claimed by {by}")
    info(f"claimed {a.task_id} -> {by}  (status: {data['status']})")
    info(f"  {bridge}")


def cmd_log(a):
    tasks = require_tasks_dir()
    by = agent_name(a.by)
    with task_lock(tasks, a.task_id):                 # serialize append so no event is lost (#1)
        data, folder = load_task(tasks, a.task_id)
        _require_owner(data, by, a.task_id, a.force)
        append_event(data, a.action, by, a.note)
        save_task(folder, data)
        write_render(folder, data)
    etype = {"tested": "ACTION", "done": "COMPLETED", "blocked": "ERROR",
             "handoff": "HANDOFF", "note": "THOUGHT"}.get(a.action, "ACTION")
    bridge = bridge_timeline(a.task_id, by, etype, f"[{a.action}] {a.note}")
    info(f"logged on {a.task_id}: [{a.action}] {a.note}")
    info(f"  {bridge}")


def cmd_learn(a):
    tasks = require_tasks_dir()
    by = agent_name(a.by)
    with task_lock(tasks, a.task_id):
        data, folder = load_task(tasks, a.task_id)
        _require_owner(data, by, a.task_id, a.force)
        learning = {"text": a.text, "source_task_ids": [a.task_id], "timestamp": now_iso()}
        data.setdefault("learnings", []).append(learning)
        append_event(data, "learned", by, a.text)
        save_task(folder, data)
        write_render(folder, data)
    bridge = bridge_memory(a.task_id, by, a.text)
    info(f"learned on {a.task_id}: {a.text}")
    info(f"  {bridge}")


def _move_if_needed(tasks: Path, data: dict, folder: Path) -> tuple[dict, Path]:
    """If status changed, move the folder to mirror it. Saves the new snapshot
    atomically BEFORE the move (#5) so a crash can't strand the task with a folder
    that disagrees with its status field."""
    want = data["status"]
    cur_parent = folder.parent.name
    if cur_parent == want:
        return data, folder
    dst = tasks / want / data["id"]
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        die(f"destination {dst} already exists — refusing to overwrite")
    save_task(folder, data)               # persist new status in the OLD location first
    shutil.move(str(folder), str(dst))    # then move; if it crashes here, status already matches dst
    return data, dst


def cmd_update(a):
    tasks = require_tasks_dir()
    by = agent_name(a.by)
    with task_lock(tasks, a.task_id):
        data, folder = load_task(tasks, a.task_id)
        _require_owner(data, by, a.task_id, a.force)
        changed = []
        if a.status:
            if a.status not in VALID["status"]:
                die(f"--status must be one of {VALID['status']}")
            data["status"] = a.status
            changed.append(f"status={a.status}")
        if a.priority:
            data["priority"] = a.priority
            changed.append(f"priority={a.priority}")
        if a.verified is not None:
            want_verified = a.verified == "true"
            # verified:true requires evidence (#16) — else the trust model is defeated
            if want_verified and not (a.evidence or data.get("evidence")):
                die("--verified true requires evidence — pass --evidence 'file:line proof' "
                    "(an unverified item is a candidate, not a fact)")
            data["verified"] = want_verified
            changed.append(f"verified={data['verified']}")
        if a.evidence:
            data["evidence"] = a.evidence
            changed.append("evidence")
        for truth in a.add_truth:  # repeatable — all accumulate, none silently dropped
            path, _, what = truth.partition("|")
            if not what:
                die(f"--add-truth needs 'path|what' (got '{truth}' — the 'what' explains what lives there)")
            data.setdefault("locations_of_truth", []).append({"path": path.strip(), "what": what.strip()})
            changed.append("location_of_truth")
        for f in a.add_fundamental:
            data.setdefault("fundamentals", []).append(f)
            changed.append("fundamental")
        for ptr in a.add_pointer:
            data.setdefault("context_pointers", []).append(ptr)
            changed.append("context_pointer")
        if not changed:
            die("nothing to update — pass --status / --priority / --verified / --evidence / --add-truth / --add-fundamental / --add-pointer")
        append_event(data, "note", by, "update: " + ", ".join(changed))
        data, folder = _move_if_needed(tasks, data, folder)
        save_task(folder, data)
        write_render(folder, data)
    bt = ""
    if a.status:
        et = "COMPLETED" if a.status == "completed" else "ACTION"
        bt = "\n  " + bridge_timeline(a.task_id, by, et, f"status -> {a.status}")
    info(f"updated {a.task_id}: {', '.join(changed)}{bt}")


def cmd_check(a):
    """Consistency gate (mcruzae): every promised 'Next:' must have a tracked counterpart.
    Filesystem-only, no LLM. Returns nonzero on orphans. Fail-closed: never scaffolds (#6)."""
    import re
    tasks = require_tasks_dir()
    ids = [a.task_id] if a.task_id else _all_task_ids(tasks)
    orphans = []
    for tid in ids:
        data, _ = load_task(tasks, tid)
        # collect promised next-steps from notes + spec.context
        promised = []
        blob = []
        for e in data.get("execution_log", []):
            blob.append(e.get("notes", ""))
        blob.append((data.get("spec", {}) or {}).get("context", ""))
        for line in blob:
            for m in re.finditer(r"(?i)\bnext\b[:\-]\s*(.+)", line or ""):
                promised.append(m.group(1).strip().rstrip(". "))
        if not promised:
            continue
        # tracked items: objectives, acceptance_criteria, dependencies, child task titles
        tracked = []
        spec = data.get("spec", {}) or {}
        tracked += [o.lower() for o in spec.get("objectives", []) or []]
        tracked += [c.lower() for c in spec.get("acceptance_criteria", []) or []]
        tracked += [d.lower() for d in data.get("dependencies", []) or []]
        for child in _all_task_ids(tasks):
            cd, _ = try_load_task(tasks, child)   # skip unrelated corrupt tasks (#20)
            if cd and cd.get("parent_task_id") == tid:
                tracked.append(cd.get("title", "").lower())
        for p in promised:
            pl = p.lower()
            if not any(pl in t or t in pl for t in tracked if t):
                orphans.append((tid, p))
    if orphans:
        print(f"CHECK FAILED — {len(orphans)} promised next-step(s) with no tracked counterpart:")
        for tid, p in orphans:
            print(f"  {tid}: \"{p}\" — add it as an objective/dependency/child task")
        sys.exit(3)
    print(f"CHECK PASSED — {len(ids)} task(s), every promised next-step is tracked.")


def _all_task_ids(tasks: Path) -> list[str]:
    out = []
    for folder in LIFECYCLE:
        d = tasks / folder
        if not d.is_dir():
            continue
        for child in d.iterdir():
            if (child / "task.json").exists():
                out.append(child.name)
    return sorted(out)


def cmd_render(a):
    tasks = get_or_create_tasks_dir()
    if a.task_id:
        data, folder = load_task(tasks, a.task_id)
        write_render(folder, data)
        info(f"rendered {a.task_id} -> {folder}/task.md")
    else:
        n = 0
        for tid in _all_task_ids(tasks):
            data, folder = load_task(tasks, tid)
            write_render(folder, data)
            n += 1
        info(f"rendered {n} task(s)")


def cmd_recall(a):
    """Cross-agent discovery via brain-API. Reports BLOCKED, never fake-empty, if unreachable."""
    by = agent_name(a.by)
    res = siso_brain("tasks", "--agent", by) if not a.q else siso_brain("memory-recall", "--q", a.q)
    if res is None:
        # missing binary is NOT an authoritative empty — cross-agent view is BLOCKED (#9)
        info("recall: BLOCKED for cross-agent — siso-brain not on PATH. "
             "Showing LOCAL .tasks/ only (this machine; may miss other agents/tabs):")
        _recall_local()
        return
    if res.get("unreachable") or res.get("error"):
        info(f"recall: BLOCKED — braind unreachable ({res.get('error','?')}). Local .tasks/ below (partial):")
        _recall_local()
        return
    print(json.dumps(res, indent=2))


def _recall_local():
    tasks = find_tasks_dir()
    if not tasks:
        info("  (no local .tasks/ found)")
        return
    for tid in _all_task_ids(tasks):
        data, _ = try_load_task(tasks, tid)       # tolerate a corrupt task in the scan
        if data and data.get("status") in OPEN_STATES:
            owner = data.get("target_agent") or "—"
            print(f"  {tid}  [{data.get('status')}]  owner={owner}  {data.get('title')}")


def cmd_show(a):
    tasks = require_tasks_dir()
    data, _ = load_task(tasks, a.task_id)
    print(json.dumps(data, indent=2))


def cmd_list(a):
    tasks = require_tasks_dir()
    for tid in _all_task_ids(tasks):
        data, _ = try_load_task(tasks, tid)       # one corrupt task must not break `list`
        if not data:
            print(f"{tid}  [CORRUPT task.json — needs repair]")
            continue
        if a.status and data.get("status") != a.status:
            continue
        owner = data.get("target_agent") or "—"
        print(f"{tid}  [{data.get('status')}]  {data.get('priority')}  owner={owner}  {data.get('title')}")


# ---------------------------------------------------------------------------
# argparse
# ---------------------------------------------------------------------------
def build_parser():
    p = argparse.ArgumentParser(prog="task", description="durable shared per-task brain")
    sub = p.add_subparsers(dest="cmd", required=True)

    pi = sub.add_parser("init", help="create a task")
    pi.add_argument("title")
    pi.add_argument("--domain", default="ops", choices=VALID["domain"])
    pi.add_argument("--category", default="feature", choices=VALID["category"])
    pi.add_argument("--priority", default="medium", choices=VALID["priority"])
    pi.add_argument("--parent", help="parent TASK id (lineage carry-forward)")
    pi.add_argument("--desc", help="goal / definition-of-done")
    pi.add_argument("--evidence", help="file:line proof")
    pi.add_argument("--deps", help="comma-separated dependency ids")
    pi.add_argument("--by", help="agent name (else $SISO_AGENT_ID)")
    pi.set_defaults(fn=cmd_init)

    pc = sub.add_parser("claim", help="atomically take ownership")
    pc.add_argument("task_id")
    pc.add_argument("--by")
    pc.add_argument("--notes")
    pc.set_defaults(fn=cmd_claim)

    pl = sub.add_parser("log", help="append a timeline entry")
    pl.add_argument("task_id")
    pl.add_argument("note")
    pl.add_argument("--action", default="note",
                    help="seeded|done|tested|blocked|handoff|note")
    pl.add_argument("--by")
    pl.add_argument("--force", action="store_true", help="mutate a task owned by another agent (records a takeover)")
    pl.set_defaults(fn=cmd_log)

    pe = sub.add_parser("learn", help="append a distilled learning (carry-forward)")
    pe.add_argument("task_id")
    pe.add_argument("text")
    pe.add_argument("--by")
    pe.add_argument("--force", action="store_true", help="mutate a task owned by another agent (records a takeover)")
    pe.set_defaults(fn=cmd_learn)

    pu = sub.add_parser("update", help="set fields / move lifecycle")
    pu.add_argument("task_id")
    pu.add_argument("--status", choices=VALID["status"])
    pu.add_argument("--priority", choices=VALID["priority"])
    pu.add_argument("--verified", choices=["true", "false"])
    pu.add_argument("--evidence")
    pu.add_argument("--add-truth", dest="add_truth", action="append", default=[],
                    help="'path|what' — a location of truth (repeatable)")
    pu.add_argument("--add-fundamental", dest="add_fundamental", action="append", default=[],
                    help="an invariant (repeatable)")
    pu.add_argument("--add-pointer", dest="add_pointer", action="append", default=[],
                    help="a context pointer (repeatable)")
    pu.add_argument("--by")
    pu.add_argument("--force", action="store_true", help="mutate a task owned by another agent (records a takeover)")
    pu.set_defaults(fn=cmd_update)

    pck = sub.add_parser("check", help="consistency gate")
    pck.add_argument("task_id", nargs="?")
    pck.set_defaults(fn=cmd_check)

    pr = sub.add_parser("render", help="regenerate task.md")
    pr.add_argument("task_id", nargs="?")
    pr.set_defaults(fn=cmd_render)

    prc = sub.add_parser("recall", help="cross-agent discovery (brain-API)")
    prc.add_argument("--q", help="semantic query (memory-recall); else lists agent tasks")
    prc.add_argument("--by")
    prc.set_defaults(fn=cmd_recall)

    ps = sub.add_parser("show", help="print task.json")
    ps.add_argument("task_id")
    ps.set_defaults(fn=cmd_show)

    pls = sub.add_parser("list", help="list tasks")
    pls.add_argument("--status", choices=VALID["status"])
    pls.set_defaults(fn=cmd_list)

    return p


def main():
    args = build_parser().parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
