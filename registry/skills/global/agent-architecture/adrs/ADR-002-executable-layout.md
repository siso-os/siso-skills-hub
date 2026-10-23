# ADR-002 — Make the layout EXECUTABLE, not documentary

- **Principle:** P10
- **Status:** ACCEPTED · **Classification: UNIVERSAL** (corpus-corroborated)
- **Layer:** Universal code-layout · the direct fix for the B-grade weakness

## Context

The B-grade verdict on the original SISO answer was blunt: **"enforcement is warn-only theater."** Nearly every "machine-enforced gate" in the workspace was warn-only by default (`||true`, `GOVERNANCE_STRICT!=1`) or fictional (enforcer scripts that did not exist — `verify_registry.py`, `audit_registry.py`). The wins all came from CONVENTIONS plus the structural diff, NOT from the gates that claimed to guarantee them. A documentary rule ("keep files under 250 lines", "no import cycles", "package X may not import package Y") that lives only in a README or a linter set to warn is a rule that decays the first time a 3am agent ignores it.

The corpus handed us the fix. Across `buckpal` (ArchUnit boundary tests), `modular-monolith-with-ddd` (NetArchTest), and `island.is` (nx `enforce-module-boundaries` blocking bad imports at lint, CI failing untagged projects, new libs only via generators), the universal practice is to **compile the architecture rules INTO the repo** so the build itself fails on a violation.

## Decision

The layout must be **executable, not documentary**. Three legs:

1. **Architecture-as-test** — encode the dependency/boundary rules as tests that run in CI (ArchUnit / NetArchTest / `dependency-cruiser`). A forbidden import is a failing test, not a code-review comment.
2. **Import-boundary-as-lint-gate** — the import graph is checked at lint time; bad imports never merge.
3. **Create-via-generator** — new units (libs/modules/packages) are scaffolded by a generator that bakes in the correct structure, tags, and boundaries, so a hand-rolled non-conforming unit is the exception that stands out.

Reference wiring (oracle-streaming): `dependency-cruiser` runs as the import-boundary gate inside a pre-commit chain (spine → layer-conformance → fitness → branch-hygiene → dep-ratchet). This is the missing enforcement layer, integrated and running in production.

## Consequences

- Rules stop being aspirational. A violation is observable (a red build) instead of inspectable (a reviewer's diligence).
- Pairs with the ratchet (ADR-003) and warn→error-at-zero (ADR-005): you cannot hard-fail every rule on a messy legacy tree day one, so executable rules are gated on the **delta**, not the absolute, and flipped to hard-error only at a clean (zero-violation) count.
- The hook must assume it will be evaded and instrument for it (ADR-014): `--no-verify` is invisible to `git reflog`, so the gate writes a positive trace of every vetted HEAD sha and diffs reflog against the trace to catch bypasses.
- Costs real engineering up front (writing the tests/lint config/generators) — but it is the only thing that makes any of the other layout ADRs *durable* rather than decorative.

## When this applies

Any layout rule you actually care about holding. If a rule is worth writing down, it is worth compiling into the build; if it is not worth a gate, it is a suggestion, not an invariant — label it honestly.

## Evidence

UNIVERSAL — `buckpal`, `modular-monolith-with-ddd`, `island.is`. Source: GQ-001 ANSWER.html, External Corpus Pass net-new principle P10 ★, and the Oracle deep-wiring pass (run wfccg04py) which supplies the reference implementation. Explicitly named "the direct fix for our own B-grade weakness."
