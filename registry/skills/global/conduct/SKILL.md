---
name: conduct
description: "Conduct \u2014 run the session as a fleet, not a worker"
---

# Conduct — run the session as a fleet, not a worker

You are the conductor. Your context is for judgment, routing, and synthesis — every unit of production goes to a worker. One session run this way did an 80-skill audit + 20-skill collapse + 4 systemic fixes in hours (receipts: ~/.claude/work/SYSTEM-AUDIT.html).

## The loop (every non-trivial task)

1. **RECON ≤60s** — `preflight-lessons` (scar tissue), `~/.local/bin/herdr pane list` if HERDR_ENV=1 (who's around), open tasks, memory grep. Scout the target exists before briefing anyone.
2. **DECOMPOSE** — list independent units. ≥2 → fan out NOW (the `fan-out` skill is the contract: ~6 concurrent, waves, background always).
3. **DISPATCH** — every worker: explicit `model: haiku` + `run_in_background: true` + CONSTRAINTS/RETURN/STOP + an EVIDENCE line (see below). Name workers (`name:`) so you can address them.
4. **STAY LIVE** — while workers run, do the judgment-only work: read the 2 files that need your taste, answer the user, prep the next wave. Never poll a tracked worker.
5. **CONVERGE** — every wave ends in a synthesis rung: fold N compact returns into ONE artifact/decision before dispatching further. Fan-out without convergence is sprawl (the budget hook will tell you).
6. **VERIFY & CLOSE** — re-derive every count/claim from source (`ls | wc -l`, grep -c) before asserting it; spot-read every destructive verdict yourself (classify-by-reading); echo the constraint you honored; update the value ledger / task log.

## Tier routing (hard rules, cost order: Codex < Opus < Fable)

- **haiku (→MiniMax, ~unlimited)** — ALL reads, classification, extraction, precision edits with exact instructions, synthesis of bounded inputs. Set it EXPLICITLY on every spawn — an inherited default can silently run at your own (expensive) tier.
- **Codex (herdr pane via codex-companion, or codex-dispatch for headless batches)** — code that must compile, structural drafts, second opinions. $0 to the Claude plan.
- **Opus workers** — banned except truly unavoidable (hard-gated by hook); argue the exception, don't slip it.
- **Sonnet / Fable workers — never.**

## The EVIDENCE line (append to every recon-shaped worker RETURN)

"EVIDENCE: every numeric, directional, existence, or classification claim must be immediately followed by its receipt — the exact command and raw output line(s). A claim without a receipt will be discarded; unproducible → mark UNVERIFIED."
Then re-derive the single most load-bearing claim yourself before acting. Workers ship confidently-wrong numbers without this (PATH false-positives killed a working skill's verdict twice in one audit).

## Teammate mechanics (the parts nobody tells you)

- Background workers signal completion with an **idle notification — it carries no content.** Their final message lives in the transcript:
  `jq -rs '[.[] | select(.type=="assistant") | .message.content[]? | select(.type=="text") | .text] | last' <session-dir>/subagents/agent-a<name>-*.jsonl`
  Batch-extract to a file, Read it once — never ask each worker to re-send.
- `SendMessage({to: name})` continues a named worker with its context intact; a new Agent call starts cold.
- A blocked dispatch (hook deny) is feedback, not failure — read the reason, fix the prompt, re-issue.
- Peer panes: read them (`herdr pane read`), message them (`pane run` + verify-and-re-Enter) — the `agent-comms` skill is the contract.

## Anti-patterns (each one observed costing real money)

| Anti-pattern | Fix |
|---|---|
| Doing the 3rd similar step inline | Batch the rest, fan out (fan-out self-check) |
| Worker without explicit model | Always `model: haiku` — defaults can run at conductor tier |
| Delegating then re-reading the whole artifact | Read only the typed RETURN; grep/window the rest |
| Verdicts from worker claims without receipts | EVIDENCE line + spot re-derive |
| Killing/merging config by mv alone | Check for projection/symlinks + live hooks + prior decisions (changelog) first |
| Wrapping up with unexecuted findings | Findings unexecuted = zero value; execute or hand off explicitly |

## Close-out contract

Done = observed: counts re-derived from source, destructive changes spot-verified by reading, one milestone report (what LANDED, not what you found), durable state updated (task log / memory / ledger), constraint echoed. If your last paragraph promises work — do the work instead.
