---
name: pi-fleet
description: Fan out parallel pi-workers (MiniMax, free) for cross-repo lookups, multi-angle research, or bulk file scans. Wraps the existing pi-workers infra. Use when Shaan says "look into X across repos", "scan everything for Y", or needs multiple independent lookups in parallel.
---

# Pi Fleet

Wrapper for `pi-fleet.sh` — dispatches multiple parallel pi-workers (MiniMax-backed, zero Claude Max quota) for independent lookups. ~20x faster cold start than the Task tool.

## When to use

- "Look into X across all repos"
- Need 3+ parallel grep/lookup tasks with no inter-dependencies
- Bulk file scanning across multiple roots
- Multi-angle research where each angle is a separate question
- Anything where you'd otherwise spawn 3-5 Haiku Task agents in parallel

## When NOT to use

- Single lookup (just call `pi-ask.sh` directly)
- Tasks that need each other's output (use sequential Task agents)
- Heavy synthesis required at the end (use Sonnet for that, pi-workers for the fanout)

## Commands

```bash
# Single ask
bash ~/SISO_Workspace/agent_os/hub/skills/registry/skills/devops/pi-workers/scripts/pi-ask.sh \
  [--context topology|agents|library|full] \
  "<task>"

# Fan out
bash ~/SISO_Workspace/agent_os/hub/skills/registry/skills/devops/pi-workers/scripts/pi-fleet.sh \
  "<task1>" "<task2>" "<task3>" ...

# Stats
bash ~/SISO_Workspace/agent_os/hub/skills/registry/skills/devops/pi-workers/scripts/pi-workers-stats.sh
```

## Pattern: parallel research

For "find all places X is used across the SISO ecosystem":
```bash
pi-fleet.sh \
  "grep for X in ~/SISO_Workspace/SISO_Agency, return file:line list" \
  "grep for X in ~/SISO_Workspace/SISO_Internal_Lab/codebase, return file:line list" \
  "grep for X in ~/SISO_Workspace/agent_os, return file:line list" \
  "grep for X in ~/SISO_Workspace/SISO_Library, return file:line list"
```

## Logs

Output at `~/.siso/pi-workers/logs/<timestamp>-<task>.log`.

## Synthesis

After fan-out completes, synthesize results with Sonnet (the orchestrator session) — pi-workers do retrieval, Sonnet does the thinking.
