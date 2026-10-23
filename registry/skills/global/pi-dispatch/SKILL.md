---
name: pi-dispatch
description: "pi-dispatch \u2014 the lean MiniMax bulk lane"
---

# pi-dispatch — the lean MiniMax bulk lane

Headless **MiniMax worker running on the Pi harness** (`@mariozechner/pi-coding-agent`) straight at MiniMax's Anthropic endpoint, instead of `claude-mini` (the full Claude Code CLI). Same background + handoff behavior; **~577x fewer input tokens.**

## Why this exists (measured 2026-07-10/11)
`claude-mini` runs the entire Claude Code harness against MiniMax, so **every bulk call ships ~41,000 input tokens** (system prompt + tool schemas + house instructions) to get back a few hundred — that's why the MiniMax plan burns ~100x too fast. The SAME task through Pi sends **71 fresh input tokens** + a small cached system/tools block. Pi's 4 tools (read/write/edit/bash) are exactly the bulk toolset. The engine wrapper `~/bin/mini-pi` is a drop-in for `claude-mini` (same `-p "<prompt>"` → stdout interface), hardened by 3 rounds of self-review (7 bugs found+fixed by the lane reviewing its own code).

## One command — just prefix `MINI_ENGINE=pi`
Everything the `haiku-dispatch` skill does, prefixed with `MINI_ENGINE=pi`, runs on the lean engine. Use the full paths — `haiku-dispatch` is NOT on PATH; `mini-headless` is at `~/bin/`:
```bash
# fire-and-forget batch, DONE/BLOCKED handoff:
MINI_ENGINE=pi ~/.claude/skills/haiku-dispatch/bin/haiku-dispatch <slug> <brief-file-or-inline>
# single supervised unit, PASS/FAIL verdict + brief-lint gate:
MINI_ENGINE=pi ~/bin/mini-headless --brief <file> --label <name>
# raw one-shot (no handoff, just stdout) — for a quick check:
MINI_ENGINE=pi ~/bin/mini-pi -p "<prompt>"
```
- Handoff → `.orchestrate/handoffs/<slug>.haiku.md` (haiku-dispatch) or the `--out` result file (mini-headless). BLOCKED is always written on failure — poll `haiku-dispatch-status <slug>`.
- The process **exits when the job ends** (fresh context per task — nothing accumulates). Fan out by firing N dispatches; the CALLER is the fan-out layer, never the worker.
- Engine: `~/bin/mini-pi`. Config: `~/.pi/agent/models.json` (minimax provider) + key from `~/.config/siso-secrets/minimax.env`.

## When to use it vs the alternatives
| Lane | Token floor | Use for |
|---|---|---|
| **pi-dispatch (`MINI_ENGINE=pi`)** | **~71 fresh/call** | FAST bounded bulk: grep/classify/verify/mine/extract/audit. **The default for anything that doesn't need a CC-specific tool.** |
| `haiku-dispatch` / `mini-headless` (default `claude-mini`) | ~41K/call | Same jobs when you need a Claude-Code-only tool Pi lacks. Fallback. |
| `Agent` tool `model: haiku` | ~41K/call (CANNOT be made lean — it IS the CC harness, in-context) | When an agent needs the in-context tool loop, not a headless dispatch. |
| Codex / Opus | — | **Deep reasoning** (multi-file code review, hard correctness). NOT this lane. |

## Hard boundary (learned by dogfood 2026-07-11)
MiniMax-M3 reasoning is **slow** — a multi-file code review or heavy-reasoning task can exceed a 2-minute worker TTL and get killed (returns empty). This lane is for **fast bounded bulk**, where MiniMax is quick and the token win is huge. For anything needing sustained reasoning, route to Codex/Opus. That's the split working, not a bug.

## Gotchas
- **`<think>` blocks:** MiniMax preserves its reasoning in `<think>…</think>` tags in the output (correct for reliability). The PASS/FAIL/DONE handoff grep still catches the verdict; expect the think-noise in raw output.
- **Verdict word:** end briefs with an explicit `PASS`/`FAIL`/`DONE` line — the handoff status parser keys on it (a reply that says "DONE" but not "PASS" reads as UNCLEAR).
- **Brief structure:** `mini-headless`/`haiku-dispatch` gate briefs with `brief-lint` (needs CONSTRAINTS/RETURN/STOP). Same contract as the default lane.
- **Guards carried over:** oversized-prompt block + recursive-fanout block (the 2026-07-09 drain mechanism) are enforced in `mini-pi` too; `MINIMAX_ALLOW_RISKY=1` overrides.

## Before a wave: 10-second lane check
`cat ~/SISO_Workspace/.agents/telemetry/LANE-HEALTH.json` — note the MiniMax endpoint is reached DIRECTLY by Pi (bypasses Bifrost), so a Bifrost `haiku_minimax: DOWN` does NOT mean the Pi lane is down. Verify with a one-shot `MINI_ENGINE=pi mini-pi -p "reply PASS"` if unsure.

## To make it the default fleet-wide (when ready)
Flip the default in `~/bin/mini-headless` and `~/.claude/skills/haiku-dispatch/bin/haiku-dispatch` (the `MINI_ENGINE` toggle block) so `mini-pi` is used without the prefix. Until then it's opt-in and the default stays `claude-mini`.
