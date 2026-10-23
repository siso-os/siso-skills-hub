---
name: reflect
description: Capture Shaan's corrections as durable lessons. Trigger: "reflect", "what did we learn", "capture lessons".
disable-model-invocation: true
---

# Reflect Skill

Capture Shaan's corrections, preferences, and patterns as durable lessons for future sessions.

## How It Works

1. You invoke via `/reflect` OR hooks auto-trigger (session stop ≥2 captures, pre-compact)
2. Spawn **Haiku** subagent (never Sonnet/Opus)
3. Read state file for `last_reflected_at` per session_id
4. Scan messages since last reflect (or full session if first)
5. Classify and write lessons to the appropriate file
6. Drain matching entries from queue, update state file

## 3-Tier Scope

| Scope | File |
|-------|------|
| `project` | `<PROJECT_ROOT>/tasks/lessons.md` |
| `machine` | `~/.claude/projects/<project>/memory/feedback_*.md` |
| `global` | `~/.claude/lessons/feedback_*.md` |

Global lessons apply everywhere Shaan works — not repo-specific.

## Queue-Aware Scanning

- **The captures live in `~/.claude/.reflect-queue.jsonl`** (one JSON per line: `{timestamp, session_id, prompt}` — full prompt text included). This is the PRIMARY material; grep it by session_id.
- Read `~/.claude/.reflect-state.json` for `last_reflected_at` per session_id
- If first reflect of session: scan full transcript
- Subsequent: scan only messages since `last_reflected_at`
- After reflect: drain matching queue entries (cp queue → `.pre-drain-<sid8>.bak` first, rewrite without drained lines, append a drain-note line), update state

## Pre-compact / wrapper-session trap (recurred 2026-06-08 and 2026-07-11)

When hooks auto-trigger reflect (pre-compact especially), the invocation often lands in a fresh WRAPPER session whose transcript contains only the reflect prompt itself — zero corrections. Do NOT conclude "0 lessons" from that transcript and do NOT mark the wrapper session reflected as if done. Instead: find the parent work session (`ls -t` the project's `*.jsonl`, largest/recent non-wrapper file) and pull its entries from `.reflect-queue.jsonl` by that session_id. The queue entries carry the full prompts — the parent transcript is context-only (windowed grep, never cat; can be multi-MB).

## HARD RULES

- **Haiku only** — never Sonnet/Opus
- **Isolated** — subagent does not pollute main session
- **Read first** — always read existing lessons before writing
- **No duplicates** — skip lessons already captured
- **Sharp over vague** — fewer precise lessons > many generic ones
- **Include WHY + HOW** — every lesson needs incident and application

## Lesson Format

```markdown
---
name: <slug>
description: One-liner summary
tags: [project|machine|global]
---

# <Slug>

**When:** <specific incident>
**Why:** <root cause or reasoning>
**Apply:** <how to avoid this in future>
```

## Invocation

```
/reflect
```

One line summary returned to main session.
