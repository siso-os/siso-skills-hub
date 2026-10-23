# redispatch

When worker output fails verification, send the worker back with a sharper brief.

## Trigger

Invoked by `verify-phase.md` when:
- A verification command exited non-zero
- Anti-slop check failed
- Worker output is incomplete

## NOT for

- Plan-level issues → invoke `escalate.md`
- Architectural questions → invoke `consult-opus.md`
- Unknown facts → invoke `spawn-research-fleet.md`

## Pattern

Re-dispatch ONCE per failure. If second attempt also fails, invoke `escalate.md`. Do not loop.

## Sharper brief structure

Read `~/.claude/skills/dispatch/templates/rejection.md` for template. Brief includes:

1. **What was rejected** — paste the failed verification command output OR the slop indicator
2. **Why it failed** — one sentence root cause (compilation error / file missing / placeholder text / etc.)
3. **What to do this time** — specific corrective steps:
   - "Add the missing import on line N"
   - "Replace `// TODO` with the actual logic from the plan's step 3"
   - "Run `<command>` and paste exit code in your response"
4. **Success criteria** — same as original brief, but with "fix the failure first" prepended
5. **Failure log** — past attempt's output snippet, so worker can see what dispatch saw

## Same model

Re-dispatch uses the same model (Haiku → Haiku, Sonnet → Sonnet). Don't escalate model unless explicitly authorized.

## Status logging

Note re-dispatch in status file:

```
[<timestamp>] Phase 3: convex action → ❌ Zod schema mismatch (line 47)
              re-dispatched with sharper brief
[<timestamp>]                        → ✅ verified (typecheck clean)
```

## Two-strike rule

If re-dispatch fails verification a second time:
1. STOP dispatching this phase
2. Invoke `escalate.md`
3. Hand the failure log + both attempts to the caller

Don't burn budget on a third attempt — root cause is in the plan or in unknown context, not in worker capability.
