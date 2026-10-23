---
name: haiku-dispatch
description: "haiku-dispatch"
---

# haiku-dispatch

Headless **MiniMax worker** for **read-heavy bounded** work (classify, verify, mine, audit, extract). Runs `claude-mini -p` (MiniMax M3 — ~unlimited, **$0 to the Opus/Claude plan**) as a background process: NO herdr pane, NO Opus-context pollution, and the process **exits when the job ends** (fresh context per task — nothing accumulates).

> **Rewritten 2026-07-10 (GQ-002).** The old version told every worker to "fan it WIDE" and self-spawn sub-agents — that recursive template was the root mechanism of the 2026-07-09 MiniMax drain (2.27B cache-read in 13h), and after the claude-mini guards landed it made every dispatch die silently. The new law: **one worker = one bounded job; decomposition happens at the CALLER.** You fan out by firing N dispatches, never by telling a worker to multiply.

## ⚡ LEAN ENGINE TOGGLE — `MINI_ENGINE=pi` (2026-07-10, ~577x fewer input tokens)
Prefix ANY headless dispatch with `MINI_ENGINE=pi` to run the job through **Pi** (the `@mariozechner/pi-coding-agent` harness) straight at MiniMax's Anthropic endpoint, instead of `claude-mini` (the full Claude Code CLI). Same `-p` interface, same background + `.orchestrate/handoffs/<slug>` + DONE/BLOCKED ping-back — **only the engine underneath swaps**.
- **Why:** measured on-box — a bulk worker call through `claude-mini` sends **~41,000 input tokens** (the CC system-prompt + tool-schema tax); the SAME task through Pi sends **71 fresh** + a cached system/tools block. That's why the MiniMax plan burns ~100x too fast. Pi's 4 tools (read/write/edit/bash) are exactly the bulk toolset.
- **Use it for:** all read/classify/verify/mine/audit fire-and-forget bulk — the default should become Pi for anything that doesn't need a CC-specific tool.
- **How:** `MINI_ENGINE=pi haiku-dispatch <slug> <brief>` · `MINI_ENGINE=pi mini-headless --brief <f> --label <n>`. Engine wrapper: `~/bin/mini-pi` (drop-in for claude-mini). Config: `~/.pi/agent/models.json` (minimax provider) + key from `~/.config/siso-secrets/minimax.env`.
- **Gotcha:** MiniMax preserves its reasoning in `<think>…</think>` blocks that leak into stdout (this is correct for reliability). The PASS/FAIL/DONE handoff grep still catches the verdict; just expect the think-noise in the raw output.
- **Note:** `Agent model:haiku` CANNOT be made lean — it routes *inside* Claude Code (it IS the CC harness). For token-efficient bulk, use this headless Pi lane, not an `Agent model:haiku` sub-agent.

## When to use which lane
- **haiku-dispatch (this)** — READ / CLASSIFY / VERIFY / MINE / AUDIT, headless, fire-and-forget batches. The default bulk lane (prefix `MINI_ENGINE=pi` for the lean engine — see above). NOT for code that must compile.
- **`~/bin/mini-headless`** — same engine, single supervised unit with a PASS/FAIL verdict + brief-lint gate; use when you want to `wait` on the result inline. Honors `MINI_ENGINE=pi`.
- **`~/bin/mini-task`** — MiniMax in a **herdr pane**, only when a human genuinely needs to watch live; spawns fresh, does one task, closes itself (never reuse a pane across tasks — Shaan directive 2026-07-10).
- **codex-dispatch** — code fixes/codegen that must tsc+test green.

## Before a wave: 10-second lane check
`cat ~/SISO_Workspace/.agents/telemetry/LANE-HEALTH.json` — if `minimax_direct`/`haiku_minimax` isn't `UP`, report BLOCKED instead of firing a wave of silent corpses (the 07-10 401 outage killed 6/6 dispatches at 0 tokens with no error surfacing). Budget headroom is in the same file.

## One command
```bash
haiku-dispatch <slug> <prompt-file-or-inline>
```
- handoff → `.orchestrate/handoffs/<slug>.haiku.md`, log → `/tmp/haiku-<slug>.log`.
- The wrapper AUTO-APPENDS: the one-bounded-job law, the evidence-receipt contract (with ABSOLUTE-paths rule — `~` doesn't expand in worker shells), and the DONE/BLOCKED handoff contract. Your prompt is just the task.
- **Task-id join (L0):** put the `TASK-NNNN` id in your prompt when one exists — the wrapper threads it into the handoff so the efficiency rollup can join tokens→delivered work (join rate was 8.7%; every unjoined brief keeps it low).

Parallel batch — the CALLER is the fan-out layer:
```bash
haiku-dispatch audit-a /tmp/p1.txt &
haiku-dispatch audit-b /tmp/p2.txt &
haiku-dispatch audit-c /tmp/p3.txt &
haiku-dispatch-status          # DONE/BLOCKED per handoff
```
Cap ~5-6 concurrent (MiniMax throttles, err 2062); more units → waves.

## Fail-LOUD guarantee (new)
A `BLOCKED` handoff is **always written** — if the worker dies at spawn (guard block, dead key, crash) the wrapper writes `BLOCKED` + the log tail itself. A missing handoff after a few minutes now means exactly one thing: the process is still running. The silent-no-op class is dead.

## Rules
- **One job per dispatch.** Workers never self-fan, never take "next task" follow-ons (fresh-agent-per-task law — context re-sends are the drain).
- **Gate on the handoff file, not process exit** — `claude-mini -p` buffers; the log fills late.
- **Evidence contract:** every count/existence/classification claim carries its receipt or is UNVERIFIED.
- Do NOT use for code that must compile (→ codex-dispatch).

## Files
| Path | Role |
|---|---|
| `SKILL.md` | this |
| `bin/haiku-dispatch` | fire one bounded headless worker (contracts auto-appended, fail-loud handoff) |
| `bin/haiku-dispatch-status` | poll handoffs for DONE/BLOCKED |
