---
name: systemdb-query
description: Query the SISO SystemDB (SQLite at ~/SISO_Workspace/.SystemDB/sisosystem.db) — active tasks, agent sessions, timeline events, memory writes. Foundation for the agent monitoring UI.
---

# SystemDB Query

## What it is
Central spine SQLite DB at `~/SISO_Workspace/.SystemDB/sisosystem.db`. WAL mode. ~30 tables: `tasks`, `agents`, `sessions`, `timeline_events`, `memory`, `artifacts`.

## Common queries (bash one-liners)
```bash
# Active tasks
sqlite3 ~/SISO_Workspace/.SystemDB/sisosystem.db "SELECT id, title, status FROM tasks WHERE status NOT IN ('done','failed') ORDER BY updated_at DESC LIMIT 20;"

# Recent timeline events
sqlite3 ~/SISO_Workspace/.SystemDB/sisosystem.db "SELECT type, msg, created_at FROM timeline_events ORDER BY created_at DESC LIMIT 30;"

# Agent sessions list
sqlite3 ~/SISO_Workspace/.SystemDB/sisosystem.db "SELECT id, model, started_at, ended_at FROM sessions ORDER BY started_at DESC LIMIT 20;"

# Task completion rate (last 7 days)
sqlite3 ~/SISO_Workspace/.SystemDB/sisosystem.db "SELECT status, COUNT(*) FROM tasks WHERE updated_at > datetime('now','-7 days') GROUP BY status;"

# Agent uptime (active in last hour)
sqlite3 ~/SISO_Workspace/.SystemDB/sisosystem.db "SELECT id, model FROM sessions WHERE last_heartbeat > datetime('now','-1 hour');"
```

## Write patterns
```bash
# Log a task
sqlite3 ~/SISO_Workspace/.SystemDB/sisosystem.db "INSERT INTO tasks (id, title, status, created_at) VALUES ('task.001','...','active',datetime('now'));"

# Update task status
sqlite3 ~/SISO_Workspace/.SystemDB/sisosystem.db "UPDATE tasks SET status='done',updated_at=datetime('now') WHERE id='task.001';"

# Record timeline event
sqlite3 ~/SISO_Workspace/.SystemDB/sisosystem.db "INSERT INTO timeline_events (type, msg, created_at) VALUES ('COMPLETED','task.001 done',datetime('now'));"

# Write memory
sqlite3 ~/SISO_Workspace/.SystemDB/sisosystem.db "INSERT INTO memory (key, value, updated_at) VALUES ('lesson:fixX','...',datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value;"
```

## Foundation for monitoring UI
This skill is the data layer for the agent monitoring dashboard. Pre-written queries above surface: active task count, recent events timeline, agent session list, completion rates. The UI calls these queries via a thin API wrapper.

## Hard rules
- Read-only by default. Write only when explicitly asked.
- Never `DROP` or `DELETE` tables.
- Never `VACUUM` or `PRAGMA journal_mode`.
