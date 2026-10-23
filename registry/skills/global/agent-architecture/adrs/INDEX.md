# Agent-Architecture ADR Set — INDEX

Architecture Decision Records for the `agent-architecture` skill. Each ADR captures one load-bearing decision from **GQ-001 · Agent-Legible Architecture** (graded B → moving toward A on the universal layer).

**Source of truth:** `~/SISO_Workspace/SISO_Agent_Base/Foundry/research/answers/GQ-001-agent-legible-architecture/answer/ANSWER.html`
Evidence runs: `wzebo97jb` (first-party, 59 patterns), `wtelj4qzj` (24 god-source repos), `wfccg04py` (oracle-streaming deep wiring).

## How to read the classification

Every ADR states honestly which kind of decision it is:

- **UNIVERSAL** — corroborated independently across the 24 god-source corpus repos (Bazel / Turborepo / rushstack / moon / domain-driven-hexagon / petclinic / eShop / island.is / buckpal …) in 4 languages. Keep with confidence.
- **SISO HOUSE-BET / HOUSE-PREFERENCE** — valid for an agent-operated repo, NOT a general law. Several are wired and proven in production in oracle-streaming, but as a single integrated instance, not cross-org-witnessed. Said so plainly, every time.

The two layers: a **UNIVERSAL CODE-LAYOUT** layer (the domain-sliced, machine-enforced tree) and a **SISO AGENT-ERGONOMICS** layer (header / worktree / lazy-map) bet on top of it. The **ENFORCEMENT layer** (P17–P22, oracle's breakthrough) is the fix for the B-grade's confessed weakness: "enforcement is warn-only theater."

## The ADRs

| ADR | Title | Principle(s) | Classification |
|-----|-------|--------------|----------------|
| [ADR-001](ADR-001-domain-not-layer-partitioning.md) | Partition the code tree by DOMAIN/feature, not technical layer | P9 ★ | UNIVERSAL |
| [ADR-002](ADR-002-executable-layout.md) | Make the layout EXECUTABLE, not documentary | P10 ★ | UNIVERSAL |
| [ADR-003](ADR-003-anti-degradation-ratchet.md) | Anti-degradation RATCHET: gate the delta, not the absolute | P17 ★★ | HOUSE-BET (wired) |
| [ADR-004](ADR-004-structure-score.md) | Score the structure: deterministic 0–100 legibility KPI | P18 ★ | HOUSE-BET (wired) |
| [ADR-005](ADR-005-warn-to-error-at-zero.md) | Flip a rule warn→error ONLY at a zero violation count | P19 | HOUSE-BET (wired) |
| [ADR-006](ADR-006-boot-md-state-html.md) | Boot layer = Markdown; state/ledger/report layer = HTML | nuance | HOUSE-PREFERENCE |
| [ADR-007](ADR-007-points-not-asserts-routing.md) | CLAUDE.md POINTS, never ASSERTS volatile status | P2 | UNIVERSAL |
| [ADR-008](ADR-008-volatility-sharded-spine.md) | Shard the planning/state spine by VOLATILITY | P3 | UNIVERSAL |
| [ADR-009](ADR-009-files-canonical-db-mirror.md) | Files are canonical; the DB is a mirror (single-writer spine) | P6 | UNIVERSAL (split) |
| [ADR-010](ADR-010-one-registry-no-side-lists.md) | One registry, no side-lists: one canonical ID per unit of work | P5 | UNIVERSAL (at scale) |
| [ADR-011](ADR-011-folder-is-boundary.md) | A named folder IS the dependency boundary (directed-arrow rule) | P11 | UNIVERSAL |
| [ADR-012](ADR-012-worktree-per-task.md) | Worktree-per-task CODE isolation; merge = the verification gate | P4 | HOUSE-PREFERENCE |
| [ADR-013](ADR-013-self-orienting-context-block.md) | The self-orienting unit header (terse machine context block) | P1 | HOUSE-PREFERENCE (narrative form refuted) |
| [ADR-014](ADR-014-describe-bridge-move-and-existence-gate.md) | Append-don't-reorg; describe→bridge→move; gate the invariant | P8 + P20 | MIXED (outcome universal, ritual + gate house) |
| [ADR-015](ADR-015-first-read-map-and-certainty-gradient.md) | First-read "what lives where" map + plan-is-a-hypothesis trust law | P7 + nuance | MIXED (value universal, mechanism house) |
| [ADR-016](ADR-016-detect-not-repair-and-self-instrumenting-hook.md) | Detect rot ≠ repair rot; surface-as-stale; hook instruments its own evasion | nuances | HOUSE-BET (wired) |
| [ADR-017](ADR-017-monorepo-structural-conventions.md) | Export surface, normalized entrypoints, two-bucket root, quarantined derived code, non-uniform fractal | P12, P13, P14, P15, P16 | UNIVERSAL |
| [ADR-018](ADR-018-provenance-and-liveness-gates.md) | Provenance gate on new deps; no-orphan liveness gate on ops layer | P21, P22 | HOUSE-BET (wired) |

## Principle → ADR coverage (all 22 + nuances)

P1→013 · P2→007 · P3→008 · P4→012 · P5→010 · P6→009 · P7→015 · P8→014 · P9→001 · P10→002 · P11→011 · P12→017 · P13→017 · P14→017 · P15→017 · P16→017 · P17→003 · P18→004 · P19→005 · P20→014 · P21→018 · P22→018.
Nuances: boot=MD/state=HTML→006 · detect≠repair / git-falsifiable proof / hook self-instrumentation→016 · certainty-gradient (plan-is-a-hypothesis)→015.

## The honest residual (kept, not hidden)

1. **Enforcement durability is the open frontier.** The structures (universal layer) are right; the gates that guarantee them are largely warn-only or, in oracle's case, a single integrated production instance — not yet cross-org-witnessed. The HOUSE-BET ADRs (003, 004, 005, 016, 018) are the fix-in-progress, not a finished guarantee.
2. **Two unmeasured claims** stay flagged as estimates, not facts: HTML-vs-MD token cost (ADR-006) and the "~50K tokens saved" first-read-map ROI (ADR-015).
3. **Falsifiable prediction** (the A-gate): the next SISO project should KEEP, unprompted, ADR-007/008/015/013/012/009; and DROP the dead ceremonies (per-unit tier+challenge_hook, memory distilled-tiering, Registry-Reality-Parity scripts, scheduled sweeps, reserved slots). If it doesn't, this synthesis is wrong — and that's how we'll know.
