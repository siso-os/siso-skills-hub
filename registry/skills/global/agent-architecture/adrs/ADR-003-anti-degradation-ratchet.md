# ADR-003 — Anti-degradation RATCHET: gate the delta, not the absolute

- **Principle:** P17 ★★ (the breakthrough)
- **Status:** ACCEPTED · **Classification: SISO HOUSE-BET, wired & proven in production** (enforcement-layer; corpus carried the scattered instinct, oracle integrated it)
- **Layer:** Enforcement

## Context

ADR-002 says "make the layout executable." But you **cannot hard-fail** an absolute structural rule — "files < 250 lines", "no import cycles", "≥91% context-coverage" — on a messy legacy tree. Day one, every commit gets rejected because the pre-existing debt already violates the rule. The fleet's rational response is `git commit --no-verify`, and that single flag bypasses **ALL** gates at once, not just the one that was too strict. The strict gate doesn't enforce quality; it destroys enforcement entirely. This is the precise mechanism by which "executable layout" collapses back into "warn-only theater."

## Decision

Gate the **delta, not the absolute.** Freeze every structural metric at **today's number** as a monotonic baseline stored on disk. Pre-existing debt does NOT block — the repo is never stuck red. But any **NEW** regression past the frozen baseline rejects the commit. The bar can only **tighten**: when the repo improves, a recovery step ratchets the baseline down (`--write-baseline`) so the new, better number becomes the floor and the old slack can never return.

This converts an unenforceable absolute rule into a shippable monotonic one **on day one of any repo**, however messy. It is the missing half of P10 (ADR-002): executable rules are only adoptable if they ratchet.

## Consequences

- "Keep it clean" becomes enforceable on a dirty repo immediately — no big-bang cleanup prerequisite.
- Legacy debt is grandfathered (passes) while new debt is rejected, so the codebase strictly improves or holds, never degrades.
- Requires a committed baseline file and a disciplined `--write-baseline` ritual on genuine improvement — the baseline must be tightened, never loosened, or the ratchet becomes a no-op.
- Composes with the structure score (ADR-004, which measures), warn→error-at-zero (ADR-005, which decides when a dimension graduates to hard-fail), and the no-double-nest existence gate (ADR-016, the absolute-invariant complement for states that must never exist at all).

## When this applies

Any structural metric on a non-greenfield repo. On a true greenfield you *can* start with absolute hard-fails — but the ratchet still pays for itself the moment the first piece of debt is intentionally accepted.

## Evidence

SISO HOUSE-BET, wired and live. The corpus (buckpal/island.is/turborepo) carried the *instinct* of executable rules but not the ratchet; **oracle-streaming integrated it** in `fitness/structure-ratchet.mjs` + `fitness/baseline/structure-ratchet.json` (live frozen baseline with ceilings/floors). Source: GQ-001 ANSWER.html, Oracle deep-wiring pass (run wfccg04py), net-new principle P17 ★★ — described as "the breakthrough." Honesty note: this is a single-integrated-instance bet, not yet independently witnessed across multiple orgs.
