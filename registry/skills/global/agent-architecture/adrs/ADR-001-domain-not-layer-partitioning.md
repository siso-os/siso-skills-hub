# ADR-001 — Partition the code tree by DOMAIN/feature, not technical layer

- **Principle:** P9
- **Status:** ACCEPTED · **Classification: UNIVERSAL** (corpus-corroborated)
- **Layer:** Universal code-layout

## Context

When a code tree is organized by technical layer (`controllers/`, `services/`, `models/`, `views/`), a single unit of change — one feature — is smeared across every top-level folder. To touch "billing" you open five directories none of which is named billing. For a human this is annoying; for an agent landing cold it is fatal, because there is no single address that *is* the feature. The unit of change (a feature/domain) and the unit of layout (a technical layer) are misaligned, so cold pickup is O(repo-scan) instead of O(open-the-folder).

The external corpus pass (24 god-source repos, run wtelj4qzj) flagged this as the **single highest-value gap** our docs-only derivation entirely missed: all 8 of the original SISO principles described the STATE/spine (headers, ledgers, registry, worktrees) and said nothing about the organizing axis of the SOURCE TREE.

## Decision

Partition the source tree by **domain/feature**, not by technical layer. Make the unit-of-change (a feature) the unit-of-layout. Each slice is **self-similar** (it carries its own internal structure — see P16/ADR-016 for non-uniform fractal), and cross-module access happens **only through an explicit contract assembly** — e.g. only `IntegrationEvents` are callable by other modules; everything else inside a module is private to it. The boundary between domains is a real, enforced wall (see ADR-010 executable-layout, ADR-011 folder-is-boundary), not a naming convention.

## Consequences

- An agent landing cold lands in the *right place* by reading one folder name — the feature it was asked to change.
- The blast radius of a change is contained to one domain folder; cross-domain coupling is forced through a narrow, named contract you can grep for.
- Requires discipline: the temptation to add a top-level `utils/`/`shared/` layer re-introduces the layer axis through the back door. Name folders as the answer to a question, never `utils`/`helpers`/`misc` (the surviving half of the dropped scoped-ID principle).
- Trivial CRUD domains should NOT be forced into heavyweight per-domain ceremony — match local architecture to complexity (ADR-016).

## When this applies

Always, for any new code tree. This is the load-bearing layout axis. The only exception is a single-purpose throwaway script with no domains to separate.

## Evidence

UNIVERSAL — independently corroborated across `modular-monolith-with-ddd` ("only IntegrationEvents callable by other modules"), `EcommerceDDD`, `spring-petclinic`, `open-saas`, `library-nestjs`, in C#, Java, and TypeScript. Source: GQ-001 ANSWER.html, External Corpus Pass (run wtelj4qzj), net-new principle P9 ★. Marked the "single highest-value gap" in the corpus table.
