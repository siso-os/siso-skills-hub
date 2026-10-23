# ADR-005 — Flip a rule warn→error ONLY at a zero violation count

- **Principle:** P19
- **Status:** ACCEPTED · **Classification: SISO HOUSE-BET, wired & proven in production** (enforcement-layer)
- **Layer:** Enforcement

## Context

A too-eager hard gate is self-defeating in a specific, mechanical way. Hard-erroring a rule while **any** real violation still exists rejects every commit that touches the area → the fleet reaches for `git commit --no-verify` → and `--no-verify` bypasses **ALL** gates simultaneously, not just the one that was premature. One overzealous rule disarms the entire pre-commit chain. This is the same failure the ratchet (ADR-003) addresses for metrics, applied to boolean lint rules.

## Decision

A rule may be flipped from **warn → error only when its violation count is exactly ZERO.** While any violation remains, the rule stays at `warn` (and is held by the ratchet so no *new* violations are added — ADR-003). The moment the last violation is cleared, flip it to hard-error to lock the gain in permanently. Document the **single blocking violation next to the rule** so the path to graduation is explicit and visible in the source.

## Consequences

- The hard gate is never the reason someone bypasses the whole chain — it only ever hard-fails on dimensions that are already clean, so a hard failure is always a genuine new regression.
- Clean dimensions get a permanent ratchet-to-zero lock (they can never regress); dirty dimensions get warn+ratchet (they can only improve). Every dimension is covered, none is destructive.
- Requires writing the residual-blocker note inline and keeping it accurate — a stale "flip after X is gone" comment when X is already gone is itself a small rot.

## When this applies

Every boolean architecture/lint rule on a non-clean repo. On a dimension that is already at zero in a greenfield repo, start at error immediately. The rule is specifically about the *transition* on a dirty dimension.

## Evidence

SISO HOUSE-BET, wired and live. Oracle's `.dependency-cruiser.cjs` keeps the renderer↔main rule at `'warn'` with the inline note: *"flip to error AFTER the one residual `src/main/ipc/types.ts` import is gone."* Source: GQ-001 ANSWER.html, Oracle deep-wiring pass (run wfccg04py), net-new principle P19.
