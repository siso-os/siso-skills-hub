# ADR-017 — Monorepo structural conventions: export surface, normalized entrypoints, two-bucket root, quarantined derived code, non-uniform fractal

- **Principles:** P12, P13, P14, P15, P16
- **Status:** ACCEPTED · **Classification: UNIVERSAL** (all five corpus-corroborated across 24 repos)
- **Layer:** Universal code-layout

## Context

Domain partitioning (ADR-001) and folder-boundaries (ADR-011) set the *axis* of the tree. Five further conventions, all independently witnessed across the god-source corpus, make that tree navigable cold by an agent. They are grouped here because they are one coherent "shape of a legible monorepo" and each is small.

## Decision

**P12 — Explicit public export surface.** Each unit declares what it exports; dependencies are **named** (`@repo/*`), never relative-path-reached (`../`), and **barrel `index` files are banned.** The import graph becomes a verifiable contract you can lint (composes with ADR-002, ADR-011).

**P13 — Name-normalized operational entrypoint layer.** A `script/` (or equivalent) layer at a **known, identical path in every repo**, with normalized names (`bootstrap` | `setup` | `test` | `server`), single-responsibility, chaining. "How do I run this?" is answered by convention with zero exploration — the repo-level analog of the self-orienting header (ADR-013).

**P14 — Two-bucket monorepo root.** `apps/` (deployables) vs `packages/` (libraries), flat with no nesting, plus **exactly ONE task/build graph file** (`turbo.json` etc.). Extends one-registry (ADR-010) from work to build topology.

**P15 — Quarantine derived/generated code.** Generated code lives at its own **sibling address** (`genproto/`, `common/genproto/`), never interleaved with hand-written source; shared config is **inherited from a central rig**, not duplicated per-unit. Extends ADR-009/ADR-014 down to the code+config level.

**P16 — Non-uniform fractal.** The fractal is **NOT uniform** — each unit gets a LOCAL architecture matched to its complexity (rich domain → full hexagonal; trivial CRUD → flat), plus a **maintained system map whose nodes ARE the folders.** Refines ADR-013: don't force ceremony where the domain is trivial.

## Consequences

- The import graph is a contract (P12); a forbidden import is a lint failure, not a review note.
- "How do I run this?" and "what's deployable vs library?" are answered by convention, identically across repos — an agent transfers knowledge between repos with zero re-learning (P13, P14).
- Generated code can be wiped and regenerated without touching source (P15); a stale `genproto/` is obvious because it's a sibling, not buried.
- Ceremony is proportional to complexity (P16) — a CRUD endpoint doesn't carry hexagonal boilerplate, so the structure stays honest about where complexity actually lives.

## When this applies

Any monorepo or multi-package repo. P13 (normalized entrypoints) applies even to single-package repos. P16 applies anywhere there's a mix of trivial and rich domains — i.e. almost always.

## Evidence

UNIVERSAL — P12: `turborepo` (exports field, no `../`, no barrels), `rushstack`, `bazel` (visibility declarations). P13: `github/scripts-to-rule-them-all` (3.3k★), `react-starter-kit`, `eShop`. P14: `turborepo` (apps/ vs packages/, single turbo.json), `full-stack-fastapi`. P15: `wild-workouts` (common/genproto/), `rushstack` (rigs/ + one common/). P16: `library-nestjs` (per-context local arch + docs/c4 1:1 to libs/), `create-t3-app` (per-path purpose table). Source: GQ-001 ANSWER.html, External Corpus Pass net-new principles P12–P16.
