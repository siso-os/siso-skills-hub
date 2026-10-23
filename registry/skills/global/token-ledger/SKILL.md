---
name: token-ledger
description: Use when asking where Claude tokens or spend went by seat, model, login or time window; run token-ledger and report measured totals and coverage.
---

# token-ledger

Owner: the TOKENS seat. The script reads the session transcripts on disk and counts tokens only (0 model tokens,
~20 s). Never open transcripts to answer a spend question yourself, and never quote message text.

## Ask

```sh
L=~/SISO_Workspace/_data/worktrees/siso/live/agents/harness/tokens/ledger.py
heavy -- python3 "$L" --hours 24 --top 10          # last 24 h
heavy -- python3 "$L" --day 2026-10-14             # one local calendar day
heavy -- python3 "$L" --hours 6 --json /tmp/t.json # machine-readable
```

Read the first line (total) and the table you need; pipe through `sed -n '/## By seat/,/^$/p'` to keep only one.
Day-by-day history: `tokens/LEDGER.md` (one line a day, added on demand with `--daily --day D`; nothing is scheduled).
What to cut and who owns it: `tokens/FINDINGS.md`.

## Reading the numbers

- `$` is list price (Opus 5.5 $4 in, $8 1h cache write, $0.20 cache read, $20 out per M); use it for shares,
  not as a bill. About $1,900 of list price was one plan-week on 14 Oct.
- `avg ctx` is the context each call carries; every Opus call re-reads it, so seats x calls x context is the bill.
- Waste columns overlap: `big` cache reads above 100k context; `cold` re-writes after an idle gap past the cache
  TTL; `fetch` Opus read-only calls in runs of 3+; `opsub` sub-agents on Opus.
- A seat in brackets, e.g. `(hq)`, is a repo folder with no known seat name.

## One seat, a crash, a change (same folder as ledger.py)

```sh
heavy -- python3 "${L%/*}/seat.py" --seat '^HALO$' --seat '^UI-HUB'   # where a seat's $ went: parts, what the
                                       # calls did, context over 100k, Opus reads, re-reads, polling, woken turns
heavy -- python3 "${L%/*}/crash.py" --crash 2026-10-15T14:26+07:00/14:34   # turns killed, resumed, re-read cost
heavy -- python3 "${L%/*}/compare.py" --at 2026-10-14T15:17:20Z          # same clock hours before vs after
```

`loops.py` (were the reads needed) and `fill.py` (what fills a context) are fleet-wide. Every script judges Bash with
the fetch-nudge hook's rule: a command is a read only if every piece of it is one.

## Before and after a change

Run `compare.py` at the moment the change went live and put both columns in `tokens/FINDINGS.md`. Behaviour fixes
in another seat's work (seats reading on Opus, not delegating) go in `tokens/FINDINGS.md` for EFFICIENCY, who owns
them at the source.

Resolve current module locations with `bin/siso where` in the live siso checkout: `siso.estate.core`, `siso.estate.laptop-health`, `siso.agents.harness`, and `siso.agents.zero`.
