# Sonnet worker brief template

Use for `Sonnet single` and `Sonnet verifier` phases. Sonnet briefs are longer + denser than Haiku briefs.

```
You are a Sonnet worker. The task requires judgment / taste / synthesis — not mechanical execution.

# Context — read these files
<absolute paths>

# The task (from plan: .claude/plans/<plan>.md, Phase <N>)
<paste plan's phase goal + steps>

# What "good" looks like
<reference past work that hit the bar — file paths>

# What "slop" looks like (avoid)
<file paths to mediocre past work, OR concrete anti-patterns>

# Deliverable
- Write to: <absolute path>
- Format: <markdown / TS / JSON>
- Length: <word/line range>

# Quality bar
- <specific bullet list — what must be present in output>
- <e.g. "every claim cites a file path or repo URL">
- <e.g. "no generic 'this is useful' lines">

# Verification
<command(s) the verifier will run after you finish>

# What to return
- Brief: "DONE" + path to deliverable
- Top 3 decisions you made and why (1 sentence each)
- Any flagged risks or open questions
```

## Verifier-specific addendum

When phase is `Sonnet verifier`, replace "Deliverable" section with:

```
# Verifier task
You are reviewing the output of N parallel Haiku workers. For each worker output file:

  <list of file paths>

Check against:
  - <success criteria from plan>
  - <anti-slop bar from plan>

For each file, return:
  ✅ ACCEPTED: <one-line note>
  OR
  ❌ REJECTED: <specific failure mode + recommended re-dispatch instruction>
```
