<!--
  FILE-TREE.md — THE CANONICAL PROJECT LAYOUT (the "what lives where" first read)
  ============================================================================
  ENFORCES: P7 (a "what lives where" first-read map — hand-curated README tree),
            P9 (partition by DOMAIN/feature not technical layer; every slice
            self-similar; cross-module access only via an explicit contract),
            P11 (a named folder IS the dependency boundary; directed-arrow rule),
            P13 (name-normalized operational entrypoint layer at a known path),
            P14 (two-bucket monorepo root: apps/ deployables vs packages/ libs +
            ONE task/build graph file), P15 (quarantine derived/generated code to
            its own sibling address; inherit config from a central rig), P16
            (non-uniform fractal + a maintained system map whose nodes ARE folders).
  KEY NUANCE: boot layer = Markdown (CLAUDE/README/AGENTS/ARCHITECTURE/FILE-TREE);
            state/ledger/report layer = HTML (NOT blanket-HTML). The split below
            shows exactly which files are MD and which are HTML, and why.
  HOW TO ADAPT: rename the example domains (billing/inventory/identity) to YOURS.
            Keep the SHAPE: apps/ vs packages/, one task-graph file, domains
            self-similar with a public contract/ surface, derived code quarantined,
            ops scripts name-normalized, the manifest.yaml indirection layer.
  This file is human+agent-facing navigation, so it is Markdown (boot layer).
-->

# Project File Tree — what lives where

> **Read this before any Glob/Grep.** Every question of the form "where does X
> live / where do I put a new Y" is answered here. This is the hand-curated map
> (P7); a generated lazy map (`.siso-wiki/`, graphify) may sit ON TOP of it but
> does not replace it.

## The two-bucket root (P14)

```
.
├── apps/                  # DEPLOYABLES — each is a runnable/shippable unit. Flat, no nesting.
│   ├── web/               #   a deployable app; depends on packages/*, never on a sibling app
│   └── worker/            #   another deployable; same rule
├── packages/              # LIBRARIES — importable, never independently deployed. Flat.
│   ├── core/              #   the inner ring: depends on NOTHING (P11 core-depends-on-nothing)
│   ├── contracts/         #   shared types/DTOs/events — the cross-domain lingua franca (P12)
│   └── ui/                #   shared component lib
├── turbo.json             # THE ONE task/build graph file (P14). Exactly one. (or nx.json / moon.yml)
├── tsconfig.json          # declares path aliases (@repo/*, @core/*) so deps are NAMED not ../-reached (P12)
│
├── CLAUDE.md              # BOOT layer (MD) — the points-not-asserts router (P2). The ONE on-ramp.
├── README.md              # BOOT layer (MD) — human first read.
├── AGENTS.md              # BOOT layer (MD) — agent operating rules.
├── ARCHITECTURE.md        # BOOT layer (MD) — the durable design invariants.
├── FILE-TREE.md           # BOOT layer (MD) — this file.
│
├── .planning/             # STATE spine, SHARDED BY VOLATILITY (P3). Never one mega-doc.
│   ├── REQUIREMENTS.md     #   IMMUTABLE — what we're building. Rarely changes. (MD: durable doc)
│   ├── STATE.html         #   VOLATILE — current status, what's proven. (HTML: state/ledger layer)
│   ├── ROADMAP.html       #   VOLATILE — sequence/priorities. (HTML: state layer)
│   └── DECISION-LOG.html  #   APPEND-ONLY ledger — one entry per decision/trap. (HTML: ledger)
│
├── .tasks/                # THE ONE REGISTRY (P5). File-canonical; the DB/hub is a MIRROR (P6).
│   ├── backlog/           #   TASK-NNNN/ folders. A plan is a HYPOTHESIS until it has a task id.
│   ├── in_progress/
│   ├── completed/
│   └── manifest.yaml      #   INDIRECTION LAYER (see "the manifest indirection" below)
│
├── docs/                  # REPORTS / derived knowledge. State layer => HTML.
│   ├── reports/*.html     #   machine/agent reports (HTML — agents pack more structure in)
│   └── CODE-CONTEXT-GRAPH.json  # compiled from the <context> blocks (P1), coverage-gated
│
├── script/                # NAME-NORMALIZED ops entrypoint layer (P13). Same path in every repo.
│   ├── bootstrap          #   install deps / first-run setup
│   ├── setup              #   idempotent re-setup
│   ├── server             #   run the app locally
│   ├── test               #   run the tests
│   └── update             #   pull + migrate
│
├── fitness/               # EXECUTABLE-LAYOUT enforcement (P10/P17/P18/P22).
│   ├── structure-score.mjs       # the 0-100 KPI (P18)
│   ├── structure-ratchet.mjs     # the anti-degradation Δ-gate (P17)
│   ├── no-orphan-scripts.mjs     # ops-layer liveness gate (P22)
│   └── baseline/structure-ratchet.json  # the frozen metrics (P17)
│
├── .gates/                # provenance + bypass-instrumentation gates.
│   ├── dep-ratchet.mjs    #   new-dependency provenance gate (P21)
│   └── hook-trace.jsonl   #   positive trace of vetted commits (--no-verify detector)
│
├── .githooks/pre-commit   # the gate chain (P10/P19) — see pre-commit.sh
├── .dependency-cruiser.cjs # the import-boundary lint (P11/P9/P19)
│
└── generated/             # QUARANTINE for DERIVED code (P15). Its own sibling address.
    └── (genproto, openapi clients, etc. — never hand-edited, gitignored or clearly marked)
```

## Inside a domain — self-similar, with a public contract surface (P9/P12/P16)

Every domain under `packages/` (or `apps/<x>/src/domains/`) has the SAME shape, so
an agent landing in any one already knows the layout. The fractal is NON-UNIFORM
(P16): a rich domain gets the full internal split; a trivial CRUD domain may be a
single flat file. The invariant is the **public contract surface** — the ONLY way
in from outside.

```
packages/billing/
├── contract/             # THE PUBLIC SURFACE (P12). The ONLY thing other domains may import.
│   └── index.ts          #   re-exports types + IntegrationEvents. No internals leak. No barrel-of-barrels.
├── internal/             # PRIVATE. Unreachable from outside billing/ (enforced by depcruise, P9).
│   ├── Ledger.ts
│   └── PriceEngine.ts
├── README.md             # local "what is this domain" (MD, boot layer) — P16 maintained map node
└── billing.test.ts       # tests mirror the unit 1:1 (P8 stable-addressing outcome)
```

**Directed-arrow rule (P11):** `core` depends on nothing → `contracts` → domains →
apps. Arrows point INWARD only. `core` importing a domain is a forbidden edge and
`.dependency-cruiser.cjs` rejects it.

## The manifest indirection (P5/P6/P8)

`.tasks/manifest.yaml` is the **indirection layer** that keeps addresses stable
while the underlying files move:

```yaml
# .tasks/manifest.yaml — maps STABLE logical ids to physical paths.
# WHY: code and agents reference TASK-0042 by id. The folder can move
# backlog/ -> in_progress/ -> completed/ without breaking a single reference,
# because the lookup goes through this manifest, not a hardcoded path (P8).
# The DB/dashboard is a PROJECTION of this file, never the source (P6).
schemaVersion: 1
tasks:
  TASK-0042:
    path: in_progress/TASK-0042
    title: "Wire the structure ratchet"
    domain: infra
# Renames happen ONLY via describe -> bridge -> move: add the new path, keep a
# bridge entry, then remove the old once nothing points at it. Never a bare mv.
```

## The boot=MD / state=HTML split (the key nuance — NOT blanket-HTML)

| Layer | Format | Files | Why |
|---|---|---|---|
| **Boot / on-ramp / durable design** | **Markdown** | CLAUDE.md, README.md, AGENTS.md, ARCHITECTURE.md, FILE-TREE.md, REQUIREMENTS.md, per-domain README | First-read, human+agent, low-churn. LLMs read MD natively; tag-noise is pure cost here. |
| **State / ledger / report** | **HTML** | STATE.html, ROADMAP.html, DECISION-LOG.html, docs/reports/*.html, dashboards | Machine/agent state with structure to encode (status, provenance, dated rows). Agents pack more structure into HTML and read it back more reliably. |
| **Derived data** | **JSON** | CODE-CONTEXT-GRAPH.json, STRUCTURE-SCORE.json, manifest.yaml | Generated, never hand-edited; consumed by tools. |

> The trap to avoid: blanket-HTML-for-everything. The boot layer stays Markdown.
> Only the volatile, structured state/ledger/report layer goes HTML.
