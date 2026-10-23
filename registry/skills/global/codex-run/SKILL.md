---
name: codex-run
description: Use when dispatching an implementation job or coordinating parallel builders with disjoint files; resolve routing, run codex-run and integrate checked artifacts.
---

# Dispatch through the real launcher

Read the current `agents/zero/routing.json`, the destination AGENTS.md and `codex-run --help`.
Use `job-brief` to specify outcome, exact owned files, constraints and one acceptance command.
Invoke the existing `codex-run` launcher with its supported options and an isolated checkout or disjoint file ownership.
Do not invent a model or bypass routing. Never run bare codex without an explicit model.
Arm `a0-await` for seats or the launcher's supported completion waiter, then inspect files and check output.
The tool source is `agents/harness/bin/codex-run`; no new dispatcher or process ledger is needed.
