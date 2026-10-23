# ADR-018 — Provenance gate on new deps; no-orphan liveness gate on the ops layer

- **Principles:** P21, P22
- **Status:** ACCEPTED · **Classification: SISO HOUSE-BET, wired & proven in production** (enforcement-layer)
- **Layer:** Enforcement

## Context

Two slow legibility taxes accrete invisibly. First, **dependency creep**: a new top-level dependency lands with no recorded reason, and over time the dep graph becomes an un-auditable pile no one can justify or prune. Second, **dead ops code**: scripts in `scripts/`/ops layers stop being reachable but stay on disk, and a dead script is the same legibility tax as a stale doc — an agent reads it, trusts it, and acts on something nothing else calls.

Both are the kind of rot the ratchet (ADR-003) is built for: cheap to gate at the **delta**, where the existing pile is grandfathered and only *new* additions must justify themselves.

## Decision

**P21 — Provenance gate on new dependencies.** A new **top-level** dep must carry a one-line `dep-rationale: <pkg> — <why our code can't do it>` in the **same commit**, or it doesn't land. Version bumps and removals pass free; only a new **name** is gated. The dep graph becomes justified, not accreted.

**P22 — No-orphan liveness gate on the ops layer.** Every script must be **reachable** (a `package.json` entry, or imported by live code) or it is flagged orphan; the **known-orphan allowlist may only shrink** (a ratchet), and each allowlisted orphan requires a written reason. This is the enforcement complement to the normalized entrypoint layer (ADR-017/P13).

## Consequences

- Every dependency in the tree has a recorded one-line justification — `why is X here?` is answerable from the commit that added it, not archaeology.
- The ops layer can't silently accumulate dead scripts; orphans are flagged and the orphan set can only shrink, so the ops surface trends toward fully-live.
- Both are delta-gates (ADR-003): zero migration cost on a messy repo — the existing deps/scripts are grandfathered, only new ones must comply.
- Small ongoing friction (writing the rationale, keeping the allowlist honest) — the intended friction, since it's precisely the moment to think "do we actually need this?"

## When this applies

Any repo where dependency creep or dead-script accumulation is a real cost — i.e. any long-lived agent-operated repo. P21 from the first new dep; P22 once there's an ops/scripts layer worth keeping live (composes with ADR-017/P13).

## Evidence

SISO HOUSE-BET, wired and live. P21: oracle's `.gates/dep-ratchet.mjs` (BLOCKING, wired in `.githooks/pre-commit`, diffs added-vs-removed names). P22: oracle's `fitness/no-orphan-scripts.mjs` (walks `scripts/**`, allowlist requires a written reason). Source: GQ-001 ANSWER.html, Oracle deep-wiring pass net-new principles P21, P22.
