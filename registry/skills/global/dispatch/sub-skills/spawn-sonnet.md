# spawn-sonnet

Brief and dispatch Sonnet workers for taste / synthesis / verifier work.

## When to use

Phase worker type is `Sonnet single` or `Sonnet verifier`.

## When NOT to use

- Mechanical edits → use `spawn-haiku.md`
- File creation from rigid spec → use `spawn-haiku.md`
- Schema additions → use `spawn-haiku.md`

Sonnet is for tasks where judgment, taste, or cross-cutting synthesis is required.

## Pattern

Single Agent call:

```
Agent({
  description: "<short verb phrase>",
  subagent_type: "general-purpose",
  model: "sonnet",
  prompt: <use templates/sonnet-brief.md template>
})
```

## Worker brief structure

Read `~/.claude/skills/dispatch/templates/sonnet-brief.md` for template.

Sonnet briefs are LONGER than Haiku briefs. Include:

1. **Full context files** — read paths
2. **The taste / judgment problem** — what we're trying to achieve, not just steps
3. **Examples of good output** — file paths to past work that hit the bar
4. **Examples of slop to avoid** — what fails
5. **Concrete deliverable** — write to <path>, return <format>
6. **Verification** — quality bar, not just "does it run"

## Verifier pattern

When phase is `Sonnet verifier` (reviews parallel-Haiku output):

```
"You are reviewing the output of 5 Haiku workers. Read each output file:
  - <path1>
  - <path2>
  ...

For each, check:
  - <success criteria from plan>
  - <anti-slop bar from plan>

For each file, return: ✅ ACCEPTED or ❌ REJECTED with specific reason.
If any rejected, list the worker and the failure mode so dispatch can re-dispatch."
```

## After dispatch

- Wait (foreground — Sonnet runs are slower but more accurate)
- If Sonnet returns review verdicts: dispatch interprets and re-dispatches failed Haikus via `redispatch.md`
- If Sonnet returns produced artifact: pass to `verify-phase.md`
