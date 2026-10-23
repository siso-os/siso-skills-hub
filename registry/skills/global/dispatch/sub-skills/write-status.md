# write-status

Append status updates to the plan's sibling status file.

## Where

`.claude/plans/<plan-name>-status.md`

If file doesn't exist, create it with the header template below at start of execution.

## Header (created on first phase)

```markdown
# Status: <plan title from plan's H1>

Plan: .claude/plans/<filename>.md
Started: <YYYY-MM-DD HH:MM>
Last update: <YYYY-MM-DD HH:MM>

## Phases
```

## Phase entry (append per phase)

```markdown
- [<YYYY-MM-DD HH:MM>] Phase <N>: <phase name> → ✅ verified (<which check passed>)
```

For failures + re-dispatch:

```markdown
- [<YYYY-MM-DD HH:MM>] Phase <N>: <phase name> → ❌ <error one-line>
                       re-dispatched with sharper brief
- [<YYYY-MM-DD HH:MM>]                          → ✅ verified on second pass
```

For escalations:

```markdown
- [<YYYY-MM-DD HH:MM>] Phase <N>: <phase name> → 🛑 escalated to caller
                       Reason: <one sentence>
                       Logs: <path to artifact>
```

## Footer (updated on every write)

After each entry, update:

```markdown
## Workers dispatched
Haiku: <running count>
Sonnet: <running count>
Opus consults: <running count>

## Files touched
- <path> (created)
- <path> (modified)

## Failures (if any)
<phase>: <verification command that failed> → <error output snippet>
```

## Final entry (when all phases done)

```markdown
## Final
Completed: <YYYY-MM-DD HH:MM>
Total: <X> phases passed, <Y> failed, <Z> escalated
Time: <delta from Started>
```

## Concurrency

Status writes are sequential (only dispatch writes to this file). No locking needed. If you dispatched parallel workers, write the phase entry only AFTER all workers returned.

## Don't

- Don't write per-worker entries (status is at phase level, not worker level)
- Don't paste worker output into status (keeps file readable)
- Don't delete past entries (file is append-only)
