# verify-phase

Run the plan's verification commands and decide pass/fail.

## When to use

After all workers in a phase have returned output. Before marking phase done.

## Steps

1. **Re-read the plan's verification block** for the current phase
2. **Run each command literally** via Bash tool, capture exit code + output
3. **Run anti-slop checks** on worker output (see below)
4. **Decide**:
   - All commands exit 0 + no slop → ✅ PASS, invoke `write-status.md`
   - Any command non-zero → ❌ FAIL, invoke `redispatch.md`
   - Slop detected → ❌ FAIL, invoke `redispatch.md` with anti-slop framing

## Standard verification commands

| Verification | Command |
|---|---|
| File exists | `test -f <path>` |
| Content present | `grep -q "<string>" <path>` |
| TypeScript clean | `pnpm typecheck` |
| Convex synced | `npx convex dev --once` |
| Smoke test | `tsx <script> <known-input>` |
| Lint clean | `pnpm lint` |
| Tests pass | `pnpm test` (or specific test path) |

## Anti-slop checks

Reject worker output if any of these are true:

| Check | Slop indicator |
|---|---|
| Concrete files | Worker said "I would create X" but didn't create it |
| Real content | File exists but contains placeholder text or `// TODO` blocks |
| Verification ran | Worker claims success but didn't run any verification command |
| Specific paths | Worker output references "the file" instead of `path/to/file.ts:42` |
| Single-purpose | Worker did the task AND added unrequested refactors |

## Skill invocation

Before marking phase done, invoke:

```
Skill: superpowers:verification-before-completion
```

This forces dispatch to actually confirm verification ran successfully, not just assume.

## Convex-specific check

If phase modified `convex/*.ts`:
1. Run `npx convex dev --once`
2. If exit non-zero → FAIL
3. Confirm `convex/_generated/` files were updated and staged
4. If `_generated/` not updated → FAIL (would block pre-commit hook)

## Status logging

After verification:
- PASS → invoke `write-status.md` with outcome `✅ verified (<which check passed>)`
- FAIL → invoke `redispatch.md`, then re-run `verify-phase.md` after re-dispatch
- Re-dispatch FAIL twice → invoke `escalate.md`
