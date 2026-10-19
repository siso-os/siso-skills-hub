---
name: pm-tasks
description: Deprecated PM convenience aliases backed by the canonical SISO Agent Brain task API.
version: 2.0.0
tags:
  - task-management
  - pm
  - deprecated-adapter
---

# PM Tasks — deprecated convenience adapter

> **Not the only task system.** Many SISO projects carry their own file-based tasks at
> `.agents/tasks/` (Oracle Streaming has ~984 of them) which this skill does NOT read or write.
> Load `siso-project-front-door` before assuming a project's work lives in Agent Brain.


PM Tasks is not an independent task system. It is a temporary convenience alias over `siso-brain` and will retire after its consumers adopt the canonical commands.

```bash
python3 scripts/pm_tasks.py list
python3 scripts/pm_tasks.py mine
python3 scripts/pm_tasks.py create "Build feature X" --desc "Acceptance notes" --priority 8
python3 scripts/pm_tasks.py update TASK-001 in_progress
python3 scripts/pm_tasks.py add-step TASK-001 implement developer --order 1
python3 scripts/pm_tasks.py get TASK-001
```

This adapter never opens SQLite, never composes SQL, and never generates count-based IDs. Agent Brain creates missing IDs and serializes task mutations.

Use the `task-manager` adapter for artifacts, memories, task-step claims, and execution events. New integrations should call `siso-brain` directly.
