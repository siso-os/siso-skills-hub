# Execution Framework

## Inputs

Accept a user request, spec path, review report, smoke failure, or issue list. The first action is to ground the work in local files and the closest source of truth.

## Lanes

`just-do-it` is for work with a clear patch and a clear verifier. Run headless Codex directly through `tools/codex-exec-adapter.mjs`.

`needs-reasoning` is for work that needs a plan before edits. Use Haiku glue to break the work down, then headless Codex for the actual reasoning and code changes.

Run both lanes in parallel when the items do not touch the same files or invariants.

## Loop

For each item:

1. Plan and rate the plan `/100`.
2. Implement and rate the implementation `/100`.
3. Verify with an independent skeptical pass and rate verification `/100`.
4. If below the floor, repair and repeat up to the cycle cap.

Default floor: `85/100`.
Default cap: `3` cycles per item.

## Checkpoint

Write one HTML checkpoint with:

- aggregate rating `/100`
- item table
- verifier evidence
- smoke or benchmark summaries
- unresolved risks
- reusable lessons appended to `BEST-PRINCIPLES.html`
