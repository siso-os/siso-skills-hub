---
name: task-manager
description: Compatibility commands for creating, claiming, updating, and reviewing shared work through SISO Agent Brain.
version: 2.0.0
tags:
  - task-management
  - agent-brain
  - cli-adapter
---

# Task Manager — Agent Brain adapter

> **Not the only task system.** Many SISO projects carry their own file-based tasks at
> `.agents/tasks/` (Oracle Streaming has ~984 of them) which this skill does NOT read or write.
> Load `siso-project-front-door` before assuming a project's work lives in Agent Brain.


This skill no longer owns or opens a SQLite database. **SISO Agent Brain** is the canonical shared-state service. The local `siso-tasks.py` file preserves familiar commands while forwarding them to the installed `siso-brain` client.

Configure Agent Brain with `SISO_BRAIN_URL` and `SISO_BRAIN_TOKEN`, or its standard token directory. For packaged/test environments, `SISO_BRAIN_CLI` may point at an explicit client command.

## Core flow

```bash
./siso-tasks.py create-task \
  --id TASK-XYZ --project-id library --pipeline-type execution \
  --description "Publish the task-state map" --assigned-to builder --priority 8

./siso-tasks.py add-step \
  --id STEP-1 --task-id TASK-XYZ --step-name implement --role builder --order 1

./siso-tasks.py view-inbox --role builder
./siso-tasks.py pull --role builder --claimed-by local-agent
./siso-tasks.py update-step --id STEP-1 --status done --output-payload '{"verified":true}'
```

`pull` is an atomic service-side claim. Competing workers cannot receive the same pending step.

## Artifacts, memory, and activity

```bash
./siso-tasks.py update-artifact --task-id TASK-XYZ --step-id STEP-1 --type report --content "verified"
./siso-tasks.py get-artifact --task-id TASK-XYZ --type report
./siso-tasks.py add-memory --task-id TASK-XYZ --type learning --content "Task claims are serialized"
./siso-tasks.py log-execution --task-id TASK-XYZ --action-type tool_call --details "Ran publication checks"
```

Raw SQL is intentionally retired. Use stable commands such as `siso-brain tasks`, `siso-brain steps`, `siso-brain memory-recall`, and `siso-brain artifact-latest` so schema changes do not break every agent.

The decomposition decision and receipts live in the Agent Brain repository’s `LEGACY-TASK-STATE-ASSESSMENT.json` and `docs/TASK-STATE-MIGRATION.html`.
