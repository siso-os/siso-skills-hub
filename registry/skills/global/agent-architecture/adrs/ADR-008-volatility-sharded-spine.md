# ADR-008 — Shard the planning/state spine by VOLATILITY

- **Principle:** P3
- **Status:** ACCEPTED · **Classification: UNIVERSAL** (corpus-corroborated)
- **Layer:** Universal code-layout (planning spine)

## Context

The cleanest before/after in the entire corpus: Blackbox4 kept its design in one churning mega-doc and produced **3 contradicting same-day design docs** — three "current" plans, none canonical, each silently wrong about what the others said. The cause is mixing facts of different volatility in one file: immutable requirements churn alongside today's status, so every status edit risks corrupting a requirement and the file as a whole is never trustworthy.

## Decision

**Shard the planning/state spine by volatility, never one mega-doc.** Separate, at minimum:

- **REQUIREMENTS** — immutable / slow-changing (what we are building and why). Edited rarely, deliberately.
- **STATE** — volatile (what is done, in progress, broken right now). Edited constantly, append-oriented.
- **ROADMAP** — medium-volatility (sequence/intent).

Each shard has its own cadence and its own trust level. A reader who wants requirements never has to wade through status churn; a status edit can never corrupt a requirement.

**Caveat (corpus correction):** do NOT over-fragment. Co-volatile concerns that always change together should stay together — splitting them into ceremonial folders adds navigation overhead for no isolation benefit (per `postgresql-event-sourcing`). Shard by *volatility class*, not by maximal subdivision.

## Consequences

- Eliminates the competing-monolith rot (3 contradicting same-day docs) at the structural level — there is one place for each volatility class.
- Pairs with the certainty gradient (ADR-015): a plan in the volatile/hypothesis tier is forbidden to act as committed work until it has a task ID.
- **Watch item:** the killed anti-pattern re-emerges one layer up — oracle's own `sprints/` accumulated 2 same-day launch plans, neither canonical. The cure is load-bearing precisely because the failure keeps trying to return; the volatility shard must be *enforced* (ADR-002), not just conventional.

## When this applies

Any project with a planning/state spine — i.e. any non-trivial project. The split is mandatory the moment a single design doc starts carrying both "what we're building" and "where we are."

## Evidence

UNIVERSAL — `domain-driven-hexagon` ("Infrastructure = most volatile layer"), with the don't-over-fragment caveat from `postgresql-event-sourcing`. The before/after (Blackbox4's 3 contradicting docs → oracle's `.planning/`) is "the cleanest before/after in the corpus." Source: GQ-001 ANSWER.html, surviving principle #3, External Corpus Pass CORROBORATED (P3).
