# ADR-014 — Append-don't-reorg; renames via describe→bridge→move; gate the invariant, not the move

- **Principles:** P8 + P20
- **Status:** ACCEPTED · **Classification: MIXED** — the stable-address OUTCOME is UNIVERSAL; the describe→bridge→move RITUAL is SISO HOUSE-PREFERENCE; the existence-check GATE (P20) is a SISO house-bet wired in production
- **Layer:** Universal outcome (P8) + enforcement (P20)

## Context

Agents learn paths. A rename that moves a learned address silently breaks every agent and script that hard-coded it — the burn-scar that motivated this principle was a v4→v5 rename that "broke 8 agents." But the opposite extreme is also wrong: framing "immovable-by-100-hardcoded-paths" as rigor is just accreted tech debt (the same failure that produced the dead-DB pointer), not a design win. And a one-time cleanup that keeps regressing — because scripts re-emit it or agents on stale bases re-create it — proves that a *move* alone never holds.

## Decision

Two layers:

**P8 — Append, don't reorg (stable addresses).** New work appends siblings; existing addresses stay put. When a rename is genuinely necessary, do it only inside a deliberate **describe→bridge→move** window: *describe* the change, *bridge* old→new (so the old address still resolves during transition), then *move*. No learned path breaks without a bridge.

**P20 — Gate the invariant, not the move.** Where a cleanup keeps regressing, do NOT just move it again — add a gate that **FAILS if the forbidden path exists at all.** *"A move is a state; a gate is an invariant."* This makes the bad state **structurally impossible** rather than repeatedly-fixed. This is the real fix for P8's rename-decay.

## Consequences

- Learned paths survive reorganization; the bridge step means no hard break, even mid-migration.
- A recurring regression is killed permanently by an existence-check gate (e.g. oracle's no-docs-double-nest HARD gate), not whack-a-moled every few weeks.
- Honest scoping: the *outcome* (stable, concern-segregated addresses, 1:1 test mirrors) is universal and witnessed everywhere; the *describe→bridge→move ritual* is SISO's specific discipline, not a corpus law.
- **Dropped half (do not re-introduce):** reserved-capacity slots (bake empty top-level slots day-one) is YAGNI — Linux/Rust grow by appending. And immovability-as-virtue is tech debt, not rigor.

## When this applies

P8 (stable addresses / append-don't-reorg) always. The describe→bridge→move ritual whenever a learned address must move. The P20 existence-gate specifically for any state that has regressed more than once despite being "fixed" — promote it from a move to an invariant.

## Evidence

MIXED. Stable-address OUTCOME is UNIVERSAL — `eShop`/`react-starter-kit`/`rushstack` converge on apps/packages/src/tests/infra/docs vocabulary; `buckpal`/`dddsample` mirror the test tree 1:1 to src. The describe→bridge→move ritual is REFUTED as universal ("the explicit discipline is ours"). The existence-gate (P20) is wired in oracle's `fitness/no-docs-double-nest.mjs` (HARD gate, "regressed REPEATEDLY; this makes it structurally impossible"). Source: GQ-001 ANSWER.html, surviving principle #8, External Corpus Pass REFUTED (P8's ritual) / CORROBORATED (P8 outcome), KILLED list (reserved-capacity, immovability-as-virtue), Oracle deep-wiring pass net-new principle P20.
