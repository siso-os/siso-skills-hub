---
name: agent-setup
description: Route agent setup to current Agent Zero ownership; safely refuse the retired V4 memory installer.
version: 1.1.0
tags:
  - agent-management
  - setup
  - routing
---

# Agent Setup

The V4 template and central `claude-mem-lite` setup recipe are retired. Its
`agent_os` source paths no longer exist. Do not recreate that tree, copy old
hooks, initialize a memory database, or overwrite an existing agent directory.

For a bounded job, follow the installed `agent-builder` skill (canonical Hub
source: `registry/skills/code/agent-builder/SKILL.md`). It routes to Agent Zero's
current `AGENTS.md`, `routing.json`, job brief, and existing `soul` / `codex-run`
commands. Inspect current ownership and reuse an existing integrating owner.
A persistent agent or memory integration needs the owning project's current
contract; this entry does not promise a replacement scaffold.

## Legacy command behavior

`scripts/setup.sh <agent_dir> <agent_name>` now exits **2** with migration
instructions before touching any target, including an existing directory.
`--help` exits **0** and prints the same routing instructions. Neither invocation
launches an agent, installs hooks, writes credentials, or creates runtime state.

## Verification and provenance

Run `python3 scripts/test_retired_setup.py` from this skill directory. It checks
help, missing arguments, a new target, and an existing target collision using
only a disposable fixture. No real agent is launched.

Replaced on 2026-10-06 after direct source review of Agent Zero `bin/soul` and
Harness Lab `bin/codex-run`. The original V4 recipe remains in Git history;
Skills Hub owns this compatibility entry, while the runtime owners retain
creation, launch, and memory behavior.
