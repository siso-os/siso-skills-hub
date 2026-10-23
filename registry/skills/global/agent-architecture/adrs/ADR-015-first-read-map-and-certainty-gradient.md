# ADR-015 — A "what lives where" first-read map + the plan-is-a-hypothesis trust law

- **Principles:** P7 + the certainty-gradient nuance
- **Status:** ACCEPTED · **Classification: MIXED** — a first-read map is UNIVERSAL (value corroborated); the generated-lazy `.siso-wiki` MECHANISM is SISO HOUSE-INNOVATION; the certainty-gradient trust law is a SISO house-bet wired in production
- **Layer:** Universal value (P7) + SISO mechanism + planning-spine trust law

## Context

A cold agent that starts with `Glob`/`Grep` burns tens of thousands of tokens reconstructing the repo's shape. The corpus's universal answer is a hand-curated **"what lives where" tree in the README** (`react-starter-kit`, `eShop`, `rushstack`). SISO's bet is to make that map **generated, lazy, and the mandated first read** (`.siso-wiki` shard menu / graphify, tree-on-demand for the touched shard only). The VALUE of a first-read map is corroborated; the generated-lazy mechanism is house-innovation, not a universal practice.

Separately: a planning spine that lets a *thought* masquerade as *committed work* causes agents to act on un-ratified plans. Oracle solves this with a trust law mapped onto the directory tree.

## Decision

**Read the first-read map before any Glob/Grep.** It is the mandated first read at project scope. Pick **ONE** map system (a hand-curated README tree, OR `.siso-wiki`, OR graphify) — **not two** (the discount: no freshness gate, and running two map systems is the failure mode to avoid).

**Certainty gradient (trust law):** map the planning spine onto the directory tree as a certainty gradient, enforced by a rule — a plan in `.orchestrate/` is a **HYPOTHESIS**; a worker is **forbidden to act on it until it has a `.tasks/` TASK-ID.** A thought cannot masquerade as committed work. (This is the trust complement to ADR-008 volatility-sharding and ADR-010 one-registry.)

## Consequences

- Cold landing is cheap: read ~500 tokens of map instead of ~50K of exploration (the "~50K saved" figure is asserted, not measured — an open A-gate item; treat as estimate).
- One map only — two map systems drift apart and you're back to reconciling sources.
- The hypothesis→task-id gate stops agents from building on un-ratified plans, which is how the competing-monolith rot starts.
- A generated map needs a **freshness gate** (regenerate on commit) or it rots like any other derived artifact (ADR-016 detect≠repair).

## When this applies

Every project gets a first-read map (universal). Use the generated-lazy mechanism only in agent-operated repos that maintain it; otherwise a hand-curated README tree is the safer universal choice. The certainty-gradient trust law applies wherever plans and committed work share a spine.

## Evidence

MIXED. First-read map value UNIVERSAL — `react-starter-kit`, `eShop`, `rushstack` (hand-curated README trees). The generated-lazy-mandated-first-read mechanism is REFUTED as universal ("our `.siso-wiki` mechanism is house-innovation"). Certainty gradient wired in oracle (`.orchestrate/` hypothesis vs `.tasks/` TASK-ID trust law). Source: GQ-001 ANSWER.html, surviving principle #7 (with the pick-ONE-map discount), External Corpus Pass REFUTED (P7's mechanism), Oracle deep-wiring pass "cleverest nuances" (the certainty gradient / plan-is-a-hypothesis law).
