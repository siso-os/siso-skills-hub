---
name: async-codex-review
description: "Async Codex Review"

disable-model-invocation: true
---

# Async Codex Review

Fire-and-forget background Codex reviews for non-trivial code work.

## Trigger

```bash
/async-codex-review --changes <file_or_dir> --context "<what was just done>"
```

Example:
```
/async-codex-review --changes convex/ --context "schema migration for webcamSessions table"
```

## What happens

1. `trigger.sh` writes a job spec to `~/.claude/.codex-reviews/pending/<timestamp>.json`
2. A background Haiku picks it up, calls `codex:rescue`, writes results to `done/`
3. On your next turn, the surfacer hook injects a 1-3 line summary

## JSON Schema

### Pending job (`pending/<timestamp>.json`)
```json
{
  "review_id": "ISO8601 timestamp",
  "files": ["path/to/file1", "path/to/file2"],
  "context": "what was just done",
  "created_at": "ISO8601",
  "status": "pending"
}
```

### Done review (`done/<timestamp>.json`)
```json
{
  "review_id": "ISO8601 timestamp from pending",
  "files_reviewed": ["path/to/file1"],
  "codex_verdict": "approved|needs_changes|critical",
  "issues": [
    { "file": "path", "line": 42, "severity": "error|warning|suggestion", "message": "..." }
  ],
  "suggestions": ["text1", "text2"],
  "reviewed_at": "ISO8601",
  "context": "what was reviewed"
}
```

## Requirements

- `codex:rescue` skill must be configured
- Background Haiku workers must be available

## When to use

After completing:
- Non-trivial features (>1 file, >50 lines)
- Schema migrations
- Multi-file refactors
- Anything that could use a second opinion before commit
