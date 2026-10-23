# `.tasks/` — durable shared per-task brain

One registry every agent (and human) reads + writes. Each task is the **source of truth for that task**: its goal, fundamentals, locations-of-truth, a running timeline of done/tested/learned, and distilled learnings that carry forward to child tasks. Managed by the global `/task` skill (`task` CLI).

## Why this exists
Agents reconstruct task intent from raw context every session and forget the fundamentals. Multi-agent (orchestrator + workers in different tabs/CLIs) makes it worse — each tab is amnesiac and can't see the others' progress. A `.tasks/` entry gives the task a brain that survives across sessions, agents, and machines.

## Layout
- `task_schema.json` — the shape of an entry (source of truth for validation).
- `backlog/TASK-NNNN/task.json` — each task (+ a rendered `task.md` beside it).
- `queued/ in_progress/ blocked/ completed/ cancelled/` — lifecycle folders; the folder mirrors the `status` field.
- The folder is the SOURCE. Any dashboard/hub view is a rendered projection, never the source.

## Use it via the `task` CLI (never hand-edit ids or the execution_log)
```
task init "Goal title" [--domain ui --priority high --parent TASK-0007]   # create
task claim TASK-0042 [--by agent-name]        # atomically take ownership
task log   TASK-0042 "tested X — passed" [--action tested]   # append timeline
task learn TASK-0042 "Y is the real constraint"             # append a distilled learning
task update TASK-0042 --status completed       # move lifecycle (also moves folder)
task check  [TASK-0042]                         # consistency gate: every promised Next has a tracked item
task render TASK-0042                           # regenerate task.md from task.json
task recall [--q "..."]                         # what tasks exist across agents/tabs (via brain-API)
```

## Rules (baked in)
1. **One registry.** No side-lists (`MISSING-X.md`, `progress.md`). Append here; fold session audits in, then delete the seed.
2. **`verified:false` until a second pass confirms.** Unverified items are candidates, not facts. Put `file:line` proof in `evidence`.
3. **Status is the lifecycle**, not the folder alone — the CLI keeps folder and field in sync.
4. **execution_log is append-only.** Never rewrite history; only append (the CLI enforces this).
5. **Lineage is explicit.** A child task carries `parent_task_id` and inherits the parent's learnings into its fundamentals — never reconstruct lineage by guessing.
6. **Cross-agent:** the file is the source of truth; the spine DB + brain-API hold a thin index/event mirror so a Codex or MiniMax worker in another tab/machine can discover this task and see its timeline.
