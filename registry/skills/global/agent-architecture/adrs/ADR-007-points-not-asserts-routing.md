# ADR-007 — CLAUDE.md POINTS, never ASSERTS volatile status

- **Principle:** P2
- **Status:** ACCEPTED · **Classification: UNIVERSAL** (corpus-corroborated)
- **Layer:** Universal code-layout (orientation)

## Context

A boot doc (`CLAUDE.md`) that inlines volatile facts — "the dashboard is on port 3100", "client-base domain is in progress", "current state is X" — rots the instant the fact changes, and a rotted boot doc is worse than no boot doc: it actively misleads a cold agent into a wrong action. The corpus's recurring failure mode is exactly this: status assertions baked into the one file every session reads first.

## Decision

`CLAUDE.md` is a **router, not a status board.** It answers each question with **exactly ONE destination** — a question→destination table where the answer is a pointer (`file:line`, a path, a ledger), not the fact itself. Only **timeless invariants** are asserted inline (import alias rules, the single-writer law, "never edit `.SystemDB` directly"). Every **dated or volatile** fact lives in an append-only ledger that the table points to, never in the boot doc.

One question, one destination. No fact appears in two places (that violates ADR-009 one-registry at the doc level and guarantees they will disagree).

## Consequences

- Cold pickup lands in <5k tokens: read the router, jump to the one destination for the question at hand, never scan.
- The boot doc stops rotting, because it holds nothing that changes — volatility is pushed down into ledgers that are *expected* to change.
- **Honest discount:** the linter that "enforces" points-not-asserts has historically been **warn-only theater** (kept on the convention, dropped on the gate). The convention is load-bearing; making the gate real (ADR-002 executable-layout) is the open work. The B-answer's own falsifiable prediction expects a new CLAUDE.md to STILL leak ≥1 inline volatile assertion — i.e. the convention is right but hard to hold without a real gate.

## When this applies

Every boot/orientation doc, at every scope (workspace, project, subtree). The nearest-CLAUDE.md-wins routing means each scope's router points to that scope's destinations.

## Evidence

UNIVERSAL — corroborated by `ant-design-pro` (reserved dir names that route), `fastapi` (per-area READMEs as destinations). Reference wiring: oracle-streaming's CLAUDE.md is a literal question→destination route table defended by an authority-claim linter + an on-ramp drift-guard. Source: GQ-001 ANSWER.html, surviving principle #2, External Corpus Pass CORROBORATED (P2), Oracle deep-wiring pass (P2 points-not-asserts).
