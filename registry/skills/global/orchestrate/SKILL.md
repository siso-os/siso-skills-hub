---
name: orchestrate
description: "orchestrate \u2014 meta-skill for herdr-native multi-agent orchestration"
---

# orchestrate — meta-skill for herdr-native multi-agent orchestration

You are the **orchestrator**: one Opus that runs a project by dispatching work to many workers living in their own herdr panes, then reading, judging, and integrating their results. You do NOT do the bulk work — workers produce, you orchestrate.

**The scarce resource is YOUR context.** Every design rule below exists to keep it clean. If you find yourself reading a worker's full transcript, you have already lost — stop and read its *status contract* instead (§status).

This skill is **policy**. The low-level "how to drive a pane" mechanics live in the **`herdr` skill** — read it for spawn/read/route/teardown command details. This skill assumes you know those and tells you how to run a whole fleet on top of them.

**Siblings:** `herdr` = mechanics; `subagents` (scenario recipes) = scenario routing (pick-the-recipe for a given KIND of work); this skill = pane-fleet policy (run a whole project as one fleet).

> Prereq: `HERDR_ENV=1`. If not set, say you are not inside herdr and stop. `$HERDR` = `~/.local/bin/herdr`.

---

## The one-paragraph model

A **run** is a project execution. It has: a **task list** (the work graph — `TaskCreate/Update`, already persistent, with `blockedBy` deps), an **agent tree** (a hybrid HTML+JSON file binding each task to a worker *by durable identity*), and a set of **herdr panes** (the live workers). You spawn workers under an **admission-controlled** ceiling, they report status through a **sidecar contract** (not their transcript), a **watchdog** catches the ones that die silently, and the whole thing **rehydrates from disk + the herdr session** if you (the orchestrator) restart. Claude workers get reasoning/taste/design lanes; Codex workers get mechanical/codegen/review lanes and spend their *own* account.

---

## Five laws (violating any one breaks the system)

1. **Identity is `terminal_id` + `name`, never `pane_id`.** herdr renumbers `pane_id` on every pane close. Store the durable `terminal_id` and the human `name` in the tree. **Never cache a `pane_id` across a command.** Re-resolve it fresh (from `agent list`) immediately before any keystroke-submitting op (`pane run`/`send`). Reads may use a just-fetched id; writes must re-resolve. This makes misrouting structurally impossible.

   **Two name layers — do not conflate them.** herdr has a **tab label** (what the human named the lane, e.g. `UI`, `CAMSODA`, `SECURITY`) and an **agent `name`** (the addressable agent handle in `agent list`). A pane started without an explicit agent name reports `name: "claude"` (or `codex`) even though its TAB is meaningfully labelled. **The human's intended identity lives in the tab label.** When onboarding pre-existing agents, derive identity from the **tab label**, not the agent `name` — and if the agent `name` is the bare engine default, `agent rename <terminal_id> <tab-label-slug>` to align it. Never assume an agent is "unnamed" just because `name == "claude"`; check its tab label first.
2. **The orchestrator reads STATUS, never transcripts.** Liveness comes from one `agent list` call; semantics come from a worker's capped sidecar note + handoff file. You `pane read` a worker's screen ONLY when it is `blocked` or flagged `SUSPECT`, one worker, ≤40 lines. Bulk transcript reading is the failure mode this whole skill prevents.
3. **`done` is a lie; gate on the handoff file.** `agent_status == done` is a herdr heuristic that also fires on stall, crash, and permission-prompt. A task is complete ONLY when `handoffs/<name>.result.html` exists AND contains a `PASS` line. Never `TaskUpdate completed` off `agent_status` alone.
4. **Admission control is mandatory** (this is the antidote to the load-storm scar). Before every spawn: refuse if live workers ≥ `MAX_LIVE` (default 6), refuse if `ORCH_DEPTH ≥ 1` (no worker-spawns-worker past depth 1), respect the spawn-rate cap. **Refuse, do not queue.** If the task graph has `in_progress` tasks but zero `ready` ones → **HALT and escalate to the human; never spin.**
5. **Status can lie; liveness cannot.** A worker self-reports optimistically and LLM workers drift. The authoritative liveness signal is the **heartbeat sidecar** (written by a launch wrapper, not the worker) + handoff/note **mtime advancing** — not the worker's own claim. Treat self-report as a fast-path hint, the heartbeat as truth.

---

## Run lifecycle

### 0. Orient (always first)
Read the live map fresh — never trust a remembered one (ids are volatile):
```bash
$HERDR workspace list && $HERDR tab list && $HERDR agent list
```
**A run is scoped to ONE herdr workspace (space).** herdr spaces map 1:1 to projects — STREAMING is one project, LIFE LOG another. When onboarding or reconciling, filter `agent list` to the run's `workspace_id` and ignore agents in other spaces; they belong to other projects' runs. Never pull a worker from a different space into this run.

If a run already exists for this project (`.orchestrate/runs/<run_id>/agent-tree.html`), **do not start fresh** — go to §rehydrate.

### 1. Plan → task list
Decompose the project into tasks with `TaskCreate`. Set `blockedBy` deps. The task list is the **spine**; everything else binds to a `task_id`. Keep tasks worker-sized (one clear deliverable each).

### 2. Bind tasks → lanes → workers
For each ready (unblocked) task, pick the lane via `templates/bindings.json`:
- **Default to Codex for anything mechanical or verifiable.** Codex has far more usage headroom than the Claude plan and spends its own account — so code, tests, refactors, scaffolding, and review should go to Codex unless they genuinely need Claude's judgment. Don't burn the Claude plan on work Codex can do.
- **Vary the Codex reasoning effort by task depth** (this is the key nuance):
  - **`fast` (medium effort)** — `codex -m <codex-model> -c model_reasoning_effort=medium` — for quick deterministic work where speed matters: renames, file ops, boilerplate, mechanical refactors, fast checks. Don't pay for deep thinking on a one-line edit.
  - **`deep` (xhigh effort)** — `codex -m <codex-model> -c model_reasoning_effort=xhigh` — for hard work where correctness matters more than latency: feature implementation, subtle bugs, architecture-bearing code, adversarial review. Don't run fast on a concurrency bug.
- **Claude** (`claude --dangerously-skip-permissions`) — reserve for **reasoning / taste / design / ambiguity / cross-domain synthesis**. The stuff Codex can't do well.
- **ephemeral fan-out** (a search, a one-shot extraction, a burst that returns and dies) → NOT a pane at all. Use the in-process **Agent tool** or a **Workflow**. Panes are only for long-lived workers worth tracking.

`bindings.json` encodes this: each lane maps to an `engine` (`claude` / `codex_fast` / `codex_deep`) with its launch command. When you classify a task, pick the lane and the engine follows — and you're biased toward Codex by construction.

### 2.5. Codex goal mode for long-running lanes

For Codex workers that should keep moving for a while (multi-file implementation, broad review, cartography/indexing, cleanup waves, UI polish loops), give them an explicit **goal-mode contract** instead of a one-shot prompt. Codex can work much longer when it has a concrete goal, success criteria, and stop rules.

Use goal mode when the task is expected to take more than ~20 minutes, has multiple verifiable substeps, or would otherwise need repeated nudges from the orchestrator. Do **not** use it for a one-file edit, quick smoke, or anything already blocked on human taste/input.

The worker brief should include:

```text
Start a Codex goal if your client supports `/goal`; otherwise treat this as your active goal.

Objective: <one concrete outcome>
Scope: <allowed files/areas>
Do not touch: <dirty/owned/risky paths>
Success criteria:
- <machine-verifiable check>
- <artifact or handoff path>
- <human-review boundary, if any>
Checkpoint cadence:
- write notes/<name>.ndjson after each meaningful substep or every ~30 minutes
- write handoffs/<name>.result.html with PASS/FAIL before claiming done
Stop and report if:
- blocked on credentials/human choice/live window
- the same verifier fails twice
- scope needs to expand
- another live worker owns the files
```

If the Codex UI accepts slash commands, send the worker a literal `/goal <objective>` first, then the structured brief. If the slash command is not available, the structured brief is still the goal contract.

Reusable templates live in `goal-mode/`:

- `goal-mode/codex-goal-contract.md`
- `goal-mode/context-cartographer.example.md`

Goal mode is **not** a replacement for the orchestrate laws:

- Law 3 still wins: task completion gates on `handoffs/<name>.result.html` containing PASS, not on a Codex "goal complete" claim.
- Law 5 still wins: liveness comes from heartbeat/note/handoff mtime, not worker optimism.
- Admission control still wins: long-running Codex goals count against `MAX_LIVE`.
- Context hygiene still wins: workers write artifacts to disk and report compactly; the orchestrator does not read long transcripts.

### 3. Spawn (orphan-safe + admission-controlled)
Use `scripts/spawn-worker.sh` — never spawn by hand, because it enforces the ceiling and the orphan-close:
```bash
scripts/spawn-worker.sh <name> <role> <task_id> <claude|codex> <lane> -- <argv...>
```
It writes the tree row `spawning` *before* `agent start`, captures `terminal_id`, closes the orphan root, verifies the tab has one pane, seeds the note file, and launches the heartbeat sidecar. If it exits 3 you hit `MAX_LIVE` — wait for a worker to finish, don't override.

After spawn, send the worker its brief with `pane run` (re-resolve the pane id first — Law 1). The brief MUST tell the worker to write `handoffs/<name>.result.html` with a `PASS`/`FAIL` line + a one-line outcome when done (this is how you gate completion, not their `done` status).

### 4. Supervise (the cheap poll loop — keeps your context clean)
Loop on a cadence (don't busy-wait):
```bash
$HERDR agent list                 # liveness for the whole tree, ONE call
scripts/watchdog.sh               # staleness + deadlock check; prints NEEDS-YOU / SUSPECT / DEADLOCK
scripts/orchestrate-tree.sh reconcile   # match tree ↔ live terminal_ids
```
- **Stay asleep unless `watchdog.sh` prints a `NEEDS-YOU` line.** No news = workers fine.
- A worker `done` → check its handoff file. PASS → `TaskUpdate completed`, then claim the next ready task. No handoff / FAIL → it lied or died; `pane read` it (≤40 lines), decide.
- A worker `SUSPECT` (stale) → `pane read` it once; if truly wedged, kill + reset its task to pending + respawn.
- `DEADLOCK` → halt, escalate to the human. Do not respawn into a cycle.
- Workers can negotiate directly (file-conflict rebases, etc.) via `pane run` to each other — let them; just track the outcome.

### 5. Teardown
When a worker's task is complete (handoff PASS) and nothing depends on it staying live, close its tab (`tab close`) — never `session stop` (that kills the whole run). On project completion, render the final tree, then close remaining tabs. Audit: every tab should be `panes 1`; no orphans left behind.

---

## Status contract (how status flows WITHOUT polluting your context)

| Channel | What it carries | How you read it | Cost |
|---|---|---|---|
| **A — `agent list`** | liveness + `terminal_id` for the WHOLE fleet | one JSON call | ~1 call/loop |
| **B — `notes/<name>.ndjson`** | worker's own ≤120-char status line | `tail -1` (byte-capped at merge) | 1 stat |
| **C — `handoffs/<name>.result.html`** | completion + PASS/FAIL + outcome | file-exists + grep PASS | 1 stat |
| **D — `notes/<name>.heartbeat.ndjson`** | liveness independent of the worker | mtime / last ts (watchdog) | 1 stat |
| **E — `pane read`** | the actual screen | ONLY when blocked/SUSPECT, ≤40 lines, one worker | rare, bounded |

**Verified herdr facts this rests on** (probed against the running binary — do not assume more):
- `agent list` exposes ONLY: `agent, agent_status, cwd, focused, name, pane_id, revision, tab_id, terminal_id, workspace_id`.
- There is **no** `custom_status` / `source` / `seq` field — that is why semantic status rides sidecar files (B/C), not `report-agent`.
- `report-agent --state` *does* write `agent_status`, but herdr auto-detection can override it → it's a hint, not authoritative. Liveness truth = heartbeat + mtime (Law 5).

---

## Persistence & restart (the orchestrator can die and recover)

Four authoritative stores, no duplication:
- **herdr named session** — the live runtime (panes/tabs). Survives orchestrator restart.
- **`.orchestrate/runs/<run_id>/agent-tree.html`** — the PLAN: per-worker `{name, terminal_id, role, task_id, model, lane, spawn_state}`. `live_status` is NOT stored — read fresh.
- **Task list** (`Task*` tools) — the work graph + deps.
- **`notes/` + `handoffs/`** — the trail.

**Rehydrate** (`scripts/rehydrate.sh <run_id>`): attach the session → load the tree JSON → `reconcile` (match each tree row to a live `terminal_id` in `agent list`: present = adopt, gone+handoff = complete, gone+no handoff = LOST→reset task to pending) → relaunch heartbeat sidecars for still-live workers → print live/complete/lost/suspect counts. Reconcile, never rebuild. Re-ping any `blocked` worker that was waiting on the dead orchestrator.

---

## Files in this skill

| Path | Role |
|---|---|
| `SKILL.md` | this — the policy/lifecycle (composes the `herdr` skill for mechanics) |
| `scripts/lib.sh` | shared resolvers (`resolve_pane_by_name`, `resolve_terminal_by_name`) — always fresh, never cache |
| `scripts/spawn-worker.sh` | orphan-safe + admission-controlled spawn (Law 4) |
| `scripts/heartbeat.sh` | per-worker liveness sidecar (Law 5) |
| `scripts/watchdog.sh` | staleness + deadlock pass → NEEDS-YOU / SUSPECT / DEADLOCK |
| `scripts/orchestrate-tree.sh` | CRUD + reconcile over the hybrid tree file |
| `scripts/rehydrate.sh` | restart recovery |
| `templates/agent-tree.template.html` | hybrid HTML+JSON tree template |
| `templates/bindings.json` | lane→model→recipe map + MAX_LIVE / depth / heartbeat / stale defaults |

## Workflow synthesis — the monolithic-synthesis trap (learned the hard way)

A workflow's final "synthesize everything into one big HTML report" step is the **#1 failure point**. Three separate workflows have died here with the identical signature: `agent stalled on all 6 attempts (no progress for 180000ms each)`. Root cause: the synthesis agent receives ~20K tokens of accumulated findings as input AND is asked to emit a large multi-section HTML document in a single turn. It cannot produce that much output before the 180s no-progress timeout, retries 6× (burning millions of tokens), and fails — *after* all the expensive finder/verifier work already succeeded.

**Rules to avoid it:**
1. **Synthesis agents WRITE TO DISK, they do not RETURN large output.** Prompt the final agent to `Write` the HTML file directly with its tools and return ONLY a short confirmation (path + headline + top-3). Returning a full document through the result channel is what stalls.
2. **Never embed all raw findings in the synthesis prompt.** Pass a pre-reduced summary (scores computed deterministically, findings already filtered by verdict) — not the full 20K-token blob. Do the reduction in plain code (a Python pass over the results) before the synthesis agent ever runs.
3. **The data is always recoverable even if synthesis dies.** Every completed agent's result is cached in the run's `journal.jsonl` (`type:"result"` entries) and in per-agent `.jsonl` transcripts. If a synthesis step fails, DO NOT re-run the whole workflow — read the journal, extract the cached results, and do the synthesis yourself (or with one disk-writing worker). The finder/verifier tokens are never lost.
4. **A failing synthesis is not a runaway to panic-kill — it's the 6-retry backoff thrashing.** Let it fail on its own (it will, after 6 attempts); meanwhile recover from the journal in parallel. Killing it loses nothing the journal doesn't already hold.

## Definition of done (the system is proven only when this passes)
Spawn N workers (mixed Claude+Codex) → kill the orchestrator → `rehydrate` adopts every live worker by `terminal_id` with zero double-spawns → `watchdog` flags a deliberately-wedged worker as `SUSPECT` → completion gates on handoff PASS not `done` → teardown leaves zero orphan panes.
