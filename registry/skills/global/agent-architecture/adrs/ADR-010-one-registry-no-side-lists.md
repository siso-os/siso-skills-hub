# ADR-010 — One registry, no side-lists: every unit of work has one canonical ID

- **Principle:** P5
- **Status:** ACCEPTED · **Classification: UNIVERSAL** (corroborated where a build/task graph resolves names) — optional at reference-app scale
- **Layer:** Universal code-layout / work tracking

## Context

When work is tracked in multiple places — a `.tasks/` folder, a hub dashboard, a side-list in someone's notes, a second sprint doc — the lists disagree and you spend real time reconciling which is "real." The corpus's "no side-lists" violation recurs across this very workspace; oracle's own `sprints/` grew 2 same-day launch plans, neither canonical. A unit of work that exists in two registries effectively exists in neither, because nothing is authoritative.

## Decision

**Every unit of work resolves to exactly ONE canonical ID before it counts.** One registry is the source; the hub/dashboard is a **rendered projection** of that registry, never a parallel source. No side-lists. When checking for a gap, **reconcile against the proven ledger** (the canonical registry), not against a projection or a memory.

This is the work-tracking instance of the same law as ADR-009 (one canonical source, projections derive) and ADR-007 (one destination per question).

## Consequences

- "Is this tracked?" has one answer: does it have a canonical ID in the registry? A plan without an ID is a hypothesis, not work (ADR-015).
- The hub can be regenerated from the registry at any time; a stale or wrong hub is a rendering bug, not a truth conflict.
- **Scale caveat (corpus):** a HARD on-disk registry is required where a build/task graph must resolve names (`rush.json`, moon) but optional at reference-app scale (EventualShop ships none — convention + CI suffice). Match the formality to the scale; don't build a registry resolver for a 3-package repo.
- **Dropped:** scoped `{domain}.{function}` IDs justified by DB range-scans (`WHERE id LIKE 'agency.%'`) — the range-scan rationale is dead weight since agents rarely query the DB. Only "the name answers a question, never `utils`/`helpers`/`misc`" survives.

## When this applies

Any system tracking units of work or resolving names across a build graph. Required at build-tool/monorepo scale; convention-enforced at small scale. Always: no second list.

## Evidence

UNIVERSAL (at scale) — `rushstack`, `moon`, `jhipster` (one registry as projection); `EventualShop` shows it's convention+CI at reference-app scale. Reference wiring: oracle's file-canonical `.tasks/` with DB/dashboard explicitly derived. Source: GQ-001 ANSWER.html, surviving principle #5, External Corpus Pass (P5 refuted-as-universal-hard-registry / corroborated-as-projection), KILLED list (scoped-ID range-scan rationale).
