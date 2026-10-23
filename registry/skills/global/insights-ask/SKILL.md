---
name: insights-ask
description: "insights-ask"

disable-model-invocation: true
---

# insights-ask

A query handle over the **34,047** insights mined from past sessions by the
session-mirror pipeline. Each row is one extracted statement (a failure, idea,
decision, win, friction pattern, etc.) scored 0–1 by importance.

This skill is the **how-to**; the actual SELECTs live in the leaf tool
`scripts/ask.py`. Call the script — don't hand-write SQL unless you need a shape
the script can't produce.

## Source of truth
- DB: `~/SISO_Workspace/.SystemDB/sisosystem.db` (override with `SISO_DB`)
- Table: `session_extract`
- Read-only: `ask.py` opens the DB with `mode=ro`. Never write/update/delete here —
  landing back to memory/lessons is the session-mirror pipeline's job, not this skill's.

## Dimensions (`--dim`)
`ai_failures` · `prompt_improvements` · `user_misuse` · `framework_gaps` ·
`tasks` · `intentions` · `goals` · `decisions` · `ideas` ·
`friction_patterns` · `wins` · `entities`

Key columns: `title`, `body`, `evidence_quote`, `domain`, `severity`,
`recurrence` (# sessions it resurfaced in), `importance` (0–1), `landed`.

## How to ask
```bash
SCRIPT=~/SISO_Workspace/SISO_Agent_Base/templates/profile/skills/insights-ask/scripts/ask.py

# Top insights overall (by importance)
python3 "$SCRIPT" --top 10

# What fails most (highest-importance AI failures)
python3 "$SCRIPT" --fails --top 15

# A whole dimension
python3 "$SCRIPT" --dim ideas --top 20
python3 "$SCRIPT" --dim framework_gaps --min-importance 0.7

# Scoped to a project/domain (substring match)
python3 "$SCRIPT" --domain SISO_Voice --top 10
python3 "$SCRIPT" --domain orb --dim friction_patterns

# Keyword search across title/body/evidence
python3 "$SCRIPT" --query "routing" --top 10

# Only un-landed (not yet projected to memory/lessons)
python3 "$SCRIPT" --landed 0 --dim ai_failures --top 10

# Machine-readable for agent consumption
python3 "$SCRIPT" --top 25 --format json
```

## Flags
| flag | meaning |
|------|---------|
| `--dim DIM` | filter to one dimension |
| `--domain SUB` | substring match on project/domain bucket |
| `--query TEXT` | substring match on title/body/evidence_quote |
| `--min-importance F` | only rows with importance ≥ F |
| `--landed 0\|1` | un-landed vs already-projected |
| `--top N` | max rows (default 10) |
| `--fails` | alias for `--dim ai_failures` |
| `--format table\|json` | output shape (default table) |

Results are always `ORDER BY importance DESC, recurrence DESC, last_seen DESC`,
so the first row is the single most-important match.

## Pre-action injection (read before acting)

`ask.py` is the on-demand query handle. The **pre-action wire** is the
sibling tool `preflight_lessons.py` (same dir as boot-recall). It returns a
tight markdown block of the top avoid-mistakes lessons — meant to be
prepended to an agent's prompt (or piped into an `additionalContext` slot)
**right before the agent picks a tool**, so it reads the lessons before
it acts.

```bash
# Top 10 avoid-mistakes lessons across all domains — paste into prompt.
python3 ~/SISO_Workspace/SISO_Agent_Base/extensions/session-mirror/preflight_lessons.py

# Filter to a project / domain.
python3 ~/SISO_Workspace/SISO_Agent_Base/extensions/session-mirror/preflight_lessons.py --domain SISO_Voice --top 8

# One dim (e.g. friction patterns only).
python3 ~/SISO_Workspace/SISO_Agent_Base/extensions/session-mirror/preflight_lessons.py --dim friction_patterns

# Programmatic: import and inject into a prompt.
python3 -c "from preflight_lessons import inject_block; print(inject_block(domain='orb', limit=5))"
```

Output heading: `## LESSONS FROM PAST SESSIONS (read before acting)`.
Bias: ranks by `importance × log10(recurrence+1)` across the dims that
matter for avoiding mistakes: `ai_failures`, `friction_patterns`,
`framework_gaps`, `user_misuse`, `prompt_improvements`.

**When to use it:** before a worker is dispatched, before a long edit,
or any time an agent is about to act in a domain where it has
historically failed. `boot-recall.py` is the *session-start* spray
(everything); `preflight_lessons.py` is the *on-demand* focus (avoid-mistakes
only). Both are read-only on the spine.

## Remote shared brain (absorbed the brain skill 2026-07-03)

The `brain` skill pointed at `siso-brain`, an always-on shared brain over tailnet that returns authoritative decisions/failures/lessons mined from past sessions across ALL projects. Its transport is independent of the local spine DB this skill reads from — `siso-brain` is the remote ask path, `ask.py` is the local SQL path. Use whichever fits.

### Binary

**Always use the absolute path** — `~/.local/bin/siso-brain`. Bare `siso-brain` will fail in any non-interactive session whose PATH lacks `~/.local/bin` (the same gotcha that bites `herdr`). One binary, full path, every time.

### Examples

```bash
~/.local/bin/siso-brain ask --q "how did we fix the convex deploy" --k 6
~/.local/bin/siso-brain ask --q "what was decided" --cwd "$PWD" --dim decisions
~/.local/bin/siso-brain ask --q "prior attempt for fake done verification"
```

Flags: `--q` (query), `--k` (top-K results, default 6), `--cwd` (scope to a project's bucket), `--dim` (filter to one of the dimensions in this skill).

### Transport

- **URL:** `SISO_BRAIN_URL` (defaults to the Mini's tailnet endpoint on non-Mini hosts; `http://127.0.0.1:8830` on Mini itself)
- **Token:** `SISO_BRAIN_TOKEN` (must export a readable token; the spine will reject anonymous calls)
- **Laptop + non-default hosts:** normally uses the Mini tailnet default — don't override unless you have a reason.
- **Authoritative:** treat the response as ground truth for this environment. Not a local cache.

### When to reach for it (vs `ask.py`)

- **Stuck mid-task** — `siso-brain ask --q "<the thing you're stuck on>" --k 6` BEFORE you re-derive from scratch.
- **Before re-solving** something you suspect has been solved before.
- **Recall decisions** — `siso-brain ask --q "<topic>" --dim decisions` when Shaan says "what did we decide about X".
- **Cross-project** — `siso-brain` covers ALL projects in one ask; `ask.py` is scoped to one DB.

If `siso-brain` is unreachable (transport error, token expired), fall back to `ask.py` (local DB). Don't block on the remote when the local mirror exists.
