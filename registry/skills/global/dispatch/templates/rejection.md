# Worker rejection / re-dispatch template

When a worker's output fails verification, send it back with this sharper brief.

```
# Re-dispatch from dispatch — your previous output was rejected

## What was rejected
<paste failed verification command + its output OR slop indicator>

## Why it failed
<one sentence root cause — e.g. "the file you created has placeholder text on line 47 instead of the actual schema">

## What to do this time
<specific corrective steps — be precise>
- <e.g. "Replace line 47 with the actual schema definition from the plan's step 3">
- <e.g. "Run `pnpm typecheck` before reporting done; paste the exit code">

## Original task
<paste original plan's sub-task block>

## Failure log from previous attempt
<excerpt of previous worker output showing the failure>

## Anti-slop reminder
- Produce real files with real content
- Run verification before claiming success
- If you can't fix the specific failure above, return "FAILED: <root cause>" — do not pretend success
- Two-strike rule: this is your second and final attempt. If this fails, dispatch will escalate.
```
