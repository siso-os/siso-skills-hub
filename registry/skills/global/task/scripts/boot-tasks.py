#!/usr/bin/env python3
"""
boot-tasks — SessionStart hook. Surfaces OPEN tasks for the current repo so a
fresh agent boots warm (sees what's in flight) and is reminded the /task brain
exists. Complements session-mirror's boot-recall (which surfaces session threads);
this one surfaces the durable .tasks/ registry.

Wire as a SessionStart hook:
  python3 <skill>/scripts/boot-tasks.py --cwd "$PROJECT_DIR"
Emits a compact markdown block to stdout (consumed as additionalContext).
Empty output if there's no .tasks/ here or nothing open — silent when irrelevant.
"""
import argparse
import json
import os
import textwrap
from pathlib import Path

LIFECYCLE = ["backlog", "queued", "in_progress", "blocked", "completed", "cancelled"]
OPEN_STATES = {"queued", "in_progress", "blocked"}  # NOT backlog — backlog is a big idea pool, not "in flight"
PRI_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}
INLINE_FUNDAMENTALS_LIMIT = 6
INLINE_FUNDAMENTALS_LINE_LIMIT = 30
BACKLOG_FUNDAMENTALS_LIMIT = 3
WRAP_WIDTH = 112


def find_tasks_dir(start: Path) -> Path | None:
    cur = start.resolve()
    for d in [cur, *cur.parents]:
        for name in (".agents/tasks", ".tasks"):  # new canonical home first (oracle AGENTS-IA 2026-07-03), legacy second
            cand = d / name
            if cand.is_dir():
                return cand
    return None


def default_cwd() -> str:
    return (
        os.environ.get("SISO_PROJECT_DIR")
        or os.environ.get("CODEX_PROJECT_DIR")
        or os.environ.get("CLAUDE_PROJECT_DIR")
        or os.getcwd()
    )


def load_open(tasks: Path):
    out = []
    for folder in LIFECYCLE:
        d = tasks / folder
        if not d.is_dir():
            continue
        for child in d.iterdir():
            tj = child / "task.json"
            if not tj.exists():
                continue
            try:
                data = json.loads(tj.read_text())
            except Exception:
                continue
            if data.get("status") in OPEN_STATES:
                out.append(data)
    out.sort(key=lambda t: (PRI_RANK.get(t.get("priority"), 9), t.get("id", "")))
    return out


def load_backlog_with_fundamentals(tasks: Path):
    out = []
    d = tasks / "backlog"
    if not d.is_dir():
        return out
    for child in d.iterdir():
        tj = child / "task.json"
        if not tj.exists():
            continue
        try:
            data = json.loads(tj.read_text())
        except Exception:
            continue
        if data.get("status") == "backlog" and data.get("fundamentals"):
            out.append(data)
    out.sort(key=lambda t: (PRI_RANK.get(t.get("priority"), 9), t.get("id", "")))
    return out


def top_in_progress_task(open_tasks: list[dict]) -> dict | None:
    in_progress = [t for t in open_tasks if t.get("status") == "in_progress"]
    if not in_progress:
        return None
    in_progress.sort(
        key=lambda t: (
            PRI_RANK.get(t.get("priority"), 9),
            0 if t.get("fundamentals") else 1,
            t.get("id", ""),
        )
    )
    return in_progress[0]


def append_wrapped_bullet(lines: list[str], text: str, first_prefix: str, next_prefix: str):
    wrapped = textwrap.wrap(str(text), width=WRAP_WIDTH, break_long_words=False, break_on_hyphens=False)
    if not wrapped:
        lines.append(first_prefix.rstrip())
        return
    lines.append(f"{first_prefix}{wrapped[0]}")
    for part in wrapped[1:]:
        lines.append(f"{next_prefix}{part}")


def append_fundamentals(lines: list[str], task: dict):
    fundamentals = task.get("fundamentals") or []
    if not fundamentals:
        lines.append("  (no fundamentals — agents will re-derive; add via task update --add-fundamental)")
        return

    lines.append("  FUNDAMENTALS:")
    used_lines = 1
    truncated = False
    for item in fundamentals[:INLINE_FUNDAMENTALS_LIMIT]:
        before = len(lines)
        append_wrapped_bullet(lines, item, "  - ", "    ")
        used_lines += len(lines) - before
        if used_lines > INLINE_FUNDAMENTALS_LINE_LIMIT:
            truncated = True
            del lines[-(used_lines - INLINE_FUNDAMENTALS_LINE_LIMIT):]
            break
    if len(fundamentals) > INLINE_FUNDAMENTALS_LIMIT:
        truncated = True
    if truncated:
        lines.append("  - …fundamentals truncated; read task.md for the full dependency map")


def first_fundamental_line(task: dict) -> str:
    fundamentals = task.get("fundamentals") or []
    if not fundamentals:
        return ""
    return " ".join(str(fundamentals[0]).split())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cwd", default=default_cwd())
    args = ap.parse_args()

    start = Path(args.cwd or os.getcwd())
    tasks = find_tasks_dir(start)
    if not tasks:
        return  # no registry here — stay silent

    open_tasks = load_open(tasks)
    backlog_fundamental_tasks = load_backlog_with_fundamentals(tasks)[:BACKLOG_FUNDAMENTALS_LIMIT]
    if not open_tasks:
        if not backlog_fundamental_tasks:
            return  # nothing in flight — stay silent

    rel = tasks
    lines = [f"## 📋 Open tasks in this repo ({len(open_tasks)}) — `{rel}`"]
    inline_task = top_in_progress_task(open_tasks)
    displayed_tasks = open_tasks[:8]
    if inline_task and inline_task not in displayed_tasks:
        displayed_tasks = displayed_tasks[:7] + [inline_task]
    for t in displayed_tasks:
        owner = t.get("target_agent") or "—"
        lines.append(
            f"- `{t.get('id')}` [{t.get('status')}/{t.get('priority')}] owner={owner} — {t.get('title','')}"
        )
        if t is inline_task:
            append_fundamentals(lines, t)
        elif t.get("status") == "in_progress" and not t.get("fundamentals"):
            lines.append("  (no fundamentals — agents will re-derive; add via task update --add-fundamental)")
    if len(open_tasks) > 8:
        lines.append(f"- …and {len(open_tasks) - 8} more (`task list`)")
    if backlog_fundamental_tasks:
        lines.append(f"Backlog tasks with fundamentals ({len(backlog_fundamental_tasks)} shown):")
        for t in backlog_fundamental_tasks:
            owner = t.get("target_agent") or "—"
            summary = first_fundamental_line(t)
            if len(summary) > 180:
                summary = summary[:177].rstrip() + "..."
            lines.append(
                f"- `{t.get('id')}` [backlog/{t.get('priority')}] owner={owner} — {t.get('title','')} — FUNDAMENTAL: {summary}"
            )
    lines.append(
        "_Resume a task: read its `.tasks/<status>/<ID>/task.md` (GOAL/FUNDAMENTALS/TIMELINE) "
        "before exploring. Update it as you work (`task log`/`task learn`). New multi-session or "
        "multi-agent work → `task init` first._"
    )
    print("\n".join(lines))


if __name__ == "__main__":
    main()
