---
name: codex-subagent-routing
description: Select and invoke the built-in MiniMax M3 and GPT-5.6 Luna Codex subagent roles. Use when a task mentions delegation, subagents, workers, explorers, MiniMax, Luna, cheap agents, model routing, or choosing which worker should handle research, implementation, tests, or verification.
---

# Codex Subagent Routing

Route through custom `agent_type` roles. Do not imitate a model switch in prose.

## Role matrix

| Agent type | Model | Sandbox | Prefer for |
|---|---|---|---|
| `minimax_explorer` | MiniMax M3 via Bifrost | read-only | free exploration when scale matters and parent checking or retries are acceptable |
| `minimax_worker` | MiniMax M3 via Bifrost | workspace-write | free, bounded execution whose result is cheap to verify |
| `luna_explorer` | GPT-5.6 Luna | read-only | cheap, stronger analysis when ambiguity, nuance, or first-pass confidence matters |
| `luna_worker` | GPT-5.6 Luna | workspace-write | cheap, stronger implementation when correctness, integration, or avoiding rework matters |

Use the parent agent for final synthesis and consequential judgment unless the task explicitly assigns that responsibility to a child.

## Dispatch contract

1. Choose the role from the matrix.
2. Call `spawn_agent` with `agent_type` set to the exact role name.
3. Set `fork_turns: "none"` so the custom role keeps its configured model and receives only the bounded task brief.
4. Omit the direct `model` field. In the current Codex CLI, direct Luna model overrides are filtered even though the role-backed route works.
5. Give the child a concrete objective, owned scope, output contract, and verification requirement.
6. Tell write-capable workers that other agents share the worktree and that they must preserve unrelated edits.

Example shape:

```json
{
  "agent_type": "luna_worker",
  "task_name": "fix_parser",
  "fork_turns": "none",
  "message": "Own src/parser.ts only. Fix the reported parser bug, run its focused tests, and return changed files, test results, and any residual risk. Other agents share the worktree; preserve unrelated edits."
}
```

## Decision policy

Choose autonomously per task. The tradeoff on this machine is:

- MiniMax is free. Choose it when zero marginal cost or high-volume coverage matters most and the parent can cheaply check, retry, or repair the result.
- Luna is not free, but it is still cheap and is generally the smarter, more reliable option. Choose it when ambiguity, nuance, correctness, latency, or avoiding retries and rework matters more than eliminating the small model cost.
- Consider expected total cost, including retries, verification, and parent cleanup—not only the price of the first call.
- There is no mandatory `bulk = MiniMax` or `hard = Luna` split. An all-Luna team is valid when the quality gain is worth the small cost; an all-MiniMax team is valid when free execution dominates; a mixed team is valid when it improves the total outcome.
- Treat Luna as the preferred quality/cost balance and MiniMax as the zero-cost option, while letting task characteristics and explicit user preferences decide.

Operational rules:

- Use explorers for evidence only and workers for authorized edits.
- Do not dispatch an agent merely to restate the prompt. Give it independent work with a falsifiable completion condition.
- Do not claim a role exists if it is absent from the current `spawn_agent` schema. Custom roles load at session startup; start a fresh Codex session after installing or changing them.

## Verify model identity when it matters

For routing changes, smoke tests, or suspicious results, verify the child session artifact:

- `session_meta.payload.source.subagent.thread_spawn.agent_role` must equal the requested role.
- `turn_context.payload.model` must equal `Minimax/MiniMax-M3` or `gpt-5.6-luna` as expected.
- Treat response text such as “I am Luna” as insufficient evidence.

If the recorded model differs, report the mismatch and stop treating the run as valid.
