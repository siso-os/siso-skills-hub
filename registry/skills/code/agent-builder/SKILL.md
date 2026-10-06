---
name: agent-builder
description: Route bounded agent work to existing Agent Zero owners and launchers; the V3 template recipe is retired.
version: 1.1.0
tags:
  - agent-management
  - routing
---

# Agent Builder

The old V3 template recipe is retired. Do not copy `agent_os` templates or
create a parallel agent runtime. This skill routes work to its current owner.

1. Resolve the workspace (`${SISO_WORKSPACE:-$HOME/SISO_Workspace}`), then read
   `SISO_Agents/agent-zero/siso-agent-zero/AGENTS.md` and `routing.json` there.
   Read the target project's instructions and check existing ownership before
   assigning a new bounded job. Reuse its integrating owner; do not duplicate a
   standing agent or interrupt an active session.
2. Use Agent Zero's `.claude/skills/job-brief/SKILL.md` to prepare one brief:
   outcome, exact owned paths, excluded state, an executable acceptance check,
   and a return path. Parallel writers need disjoint ownership or isolated
   worktrees. A request for a persistent agent needs the owning project's
   contract; this skill does not scaffold one.
3. For an authorized bounded execution job, use the existing
   `SISO_Agents/siso-harness-lab/bin/codex-run` with an explicit model chosen
   from current `routing.json`, an existing working directory, and that brief:

   ```bash
   codex-run --as "$worker_name" -m "$reviewed_model" -C "$worktree" "$brief_file"
   ```

   For an authorized hosted Agent Zero chat, use the existing
   `SISO_Agents/agent-zero/siso-agent-zero/bin/soul` contract:

   ```bash
   SOUL_MODEL="$reviewed_model" soul "$unique_name" "$brief_file" "$return_file" "$effort"
   ```

   These commands launch work: do not execute them merely to validate this
   skill. Inspect the current launcher before use; if unavailable, report the
   missing owner/command rather than restoring retired paths. Never stop an
   existing chat to resolve a name collision; choose an unused name.
4. Read the final return and run the brief's acceptance check. A start handle
   does not prove completion, installation, integration, or live behavior.

## Provenance

Replaces the V3 `agent_os/module_templates/agents/live/v3` recipe on 2026-10-06.
The prior recipe remains in Git history. `TESTING_AGENT.md` is a historical
example, not a current launch or browser policy. Agent Zero owns coordination;
Harness Lab owns `codex-run`; Skills Hub owns this routing entry.
