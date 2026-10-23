---
name: legibility-floor
description: "Legibility Floor"

disable-model-invocation: true
---

# Legibility Floor

The pipeline that turns "a folder of opaque agent transcripts" into "one queryable, shared, append-only log." Three small, stdlib-only Python files; no pip; no daemon; no LLM in the loop.

The data flow is one-way and one-shot:

```
~/.claude/projects/*/*.jsonl   (harness emits)
        |
        v
harvest_events.py  (read-only, normalize to gen_ai.*-style dicts)
        |
        v
event_log.py       (append-only INSERT OR IGNORE into spine DB)
        |
        v
four_truths.py    (5 SQL queries = the 5 reconstruction questions)
```

## When to use

- A new agent joins the fleet and needs to learn who else is here.
- JARVIS wakes and asks "what is happening right now?"
- A claim needs provenance: "why do we believe X?" — pull the events that led to it.
- Postmortem: "what happened in session X between 02:00 and 02:30?"
- Cost review: "what did the last 24h cost in tokens?"
- Any time you would otherwise have to grep raw JSONL by hand.

Do not use this to read a single live session (use the harness's own resume). Do not use it to mutate history — the log is write-once.

## Components

All three live at `~/SISO_Workspace/SISO_Agent_Base/extensions/session-mirror/`.

### 1. `harvest_events.py` — read what the harness emits

`harvest(limit_files=N)` walks `~/.claude/projects/*/*.jsonl` (newest first by mtime), parses each line as a JSON record, and runs `normalize_event()` to flatten it into a dict with OTel-style fields:

```
event_id, session_id, parent_uuid, timestamp,
type, role, model, agent_name,
cwd, git_branch, tool_name,
tokens_in, tokens_out, text_summary, source_file
```

- Pure stdlib. No DB writes. No LLM calls.
- Defensive: malformed lines, unreadable files, and per-record exceptions are silently skipped — one bad record never breaks the run.
- `text_summary` is truncated to 200 chars; tool names are extracted from `tool_use` blocks.

**Principle: harvest-don't-ask.** Read what Claude Code already emits. Do not re-derive structure with an LLM (that's what `harvest.py` does, and it is a different, heavier pipeline).

### 2. `event_log.py` — append-only spine table

`append_events(events)` writes normalized events into the `event_log` table in `~/SISO_Workspace/.SystemDB/sisosystem.db` using `INSERT OR IGNORE`. `event_id` is the primary key; duplicates are silently dropped.

Schema (created idempotently by `ensure_table()`):

```
event_id TEXT PK, session_id, parent_uuid, ts, type, role, model,
agent_name, cwd, git_branch, tool_name, tokens_in, tokens_out,
text_summary, ingested_at
```

Indexes on `session_id` and `ts` for the four-truths query path.

**Contract:** events are write-once. No `UPDATE`, no `DELETE`, no `DROP`. The log is the audit trail; if something is wrong with an event, write a new event that supersedes it.

### 3. `ingest.py` — wires harvest to event_log

The full ingest pass. One call does it all:

1. `ensure_table()` — idempotent DDL.
2. `harvest(limit_files=10)` — read the 10 most-recent transcripts.
3. Map `harvest_events`'s `timestamp` key to `event_log`'s `ts` column.
4. `append_events(rows)` — INSERT OR IGNORE.
5. Print the four numbers: `files_harvested`, `events_normalized`, `rows_inserted`, `event_log_total_rows`.

### 4. `four_truths.py` — the 5 reconstruction queries

Five SQL queries against `event_log`, one per question the ecosystem has to be able to answer:

| # | Question | Query shape |
|---|----------|-------------|
| 1 | **Who works here?** | Distinct `model`, `agent_name`, `cwd` over the last 7d |
| 2 | **What is happening now?** | Last 50 events ordered by `ts` desc |
| 3 | **Why do we believe X?** | Walk `parent_uuid` chain from a given `event_id` to reconstruct provenance |
| 4 | **What happened in session S?** | All events for a `session_id` between two `ts` values |
| 5 | **Cost last 24h?** | `SUM(tokens_in + tokens_out)` grouped by `model` since `ts > now - 24h` |

Each query is a plain `sqlite3` read. No joins, no LLM, no aggregation service.

## Commands

All commands are run from the repo root or with absolute paths. Python is the system `python3`.

```bash
# One-shot full ingest — the 4 numbers you want on your console.
python3 ~/SISO_Workspace/SISO_Agent_Base/extensions/session-mirror/ingest.py

# Harvest only (no DB write) — see what would be normalized.
python3 -c "from sys import path; path.append('~/SISO_Workspace/SISO_Agent_Base/extensions/session-mirror'); from harvest_events import harvest; print(len(harvest(limit_files=5)))"

# Ensure the table exists (idempotent — safe to re-run).
python3 -c "from sys import path; path.append('~/SISO_Workspace/SISO_Agent_Base/extensions/session-mirror'); from event_log import ensure_table, row_count; ensure_table(); print('rows:', row_count())"

# Run the 5 reconstruction queries.
python3 ~/SISO_Workspace/SISO_Agent_Base/extensions/session-mirror/four_truths.py
```

`ingest.py` is safe to put on a cron or a launchd `WatchPaths` job; on a busy machine 1-2x per hour is plenty because the harvest is idempotent.

## Safety

- **Read-only on sources.** `harvest_events.py` never writes to `~/.claude/`. If a JSONL is malformed, it is skipped, never modified.
- **Append-only on the spine.** `event_log.py` uses `INSERT OR IGNORE`. There is no code path that `UPDATE`s or `DELETE`s. The only DDL is `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` — both idempotent.
- **No new tables, no migrations, no schema edits** to the spine DB. The `event_log` table is the only artifact; if you need a new column, add a new event-type in the JSON and a new field on the dict — do not change the schema.
- **No network, no LLM, no pip.** stdlib only. Safe to run in any environment that can read the JSONL folder and write to the DB.
- **Duplicate-safe.** Re-running `ingest.py` is the normal case: `event_id` is the dedupe key, so the row count only grows for genuinely new events.

## Extending

The pipeline is harness-agnostic at the top (any tool that emits OTel-style events) and query-agnostic at the bottom (any SQL against `event_log`). To add a second source:

1. Write `harvest_codex.py` (or similar) that returns the same flat dict shape as `harvest_events.normalize_event()`. Reuse the same column names.
2. Add a `source` field to the dict (e.g. `"source": "codex"`) and an `event_id` namespace prefix so the two sources never collide (`codex-` vs the existing Claude UUIDs).
3. Append the new rows through the same `event_log.append_events()` — no new table, no migration.
4. Optionally add a `WHERE source = ?` filter to the relevant `four_truths` query.

That is the whole extension contract. The spine stays one table; the four truths stay five queries; the only thing that grows is the harvest side. If a future harness emits in a fundamentally different shape (e.g. not line-delimited JSON), add a `harvest_<x>.py` adapter that yields the same normalized dict and call it from a new `ingest_<x>.py`. Do not fork `event_log.py`.
