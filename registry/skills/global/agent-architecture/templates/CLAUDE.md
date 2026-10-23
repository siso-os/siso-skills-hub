<!--
  CLAUDE.md — THE POINTS-NOT-ASSERTS ROUTER (the ONE on-ramp)
  ============================================================================
  ENFORCES: P2 (CLAUDE.md POINTS, never ASSERTS volatile status — one
            destination per question; timeless invariants inline, volatile
            facts in dated ledgers). This is the project-scope analog of the
            file-level <context> block and the FILE-TREE map.
  KEY NUANCE: this file is BOOT layer => Markdown (not HTML). It is the single
            mandated first read. It POINTS at where current truth lives; it does
            NOT hard-code dated/runtime facts (those rot — the #1 way a router
            becomes a liar). The ONLY assertions allowed inline are TIMELESS
            invariants (decisions, not status).
  HOW TO ADAPT: replace the project name + the question->destination rows with
            YOUR repo's. Keep the SHAPE: (1) one-paragraph what-this-is, (2) the
            anti-amnesia spine pointer, (3) a question->ONE-destination table,
            (4) timeless invariants only, (5) where-to-write-findings, (6) a
            DO-NOT list naming the gates that will reject a bad commit.
  THE TEST (per the architecture answer): a healthy router is a question->
            destination table that leaks ZERO inline volatile assertions. If you
            find yourself writing "currently uses X" / "as of <date>" / a commit
            SHA / an "N/4 proven" count here — STOP, that belongs in a dated
            ledger, and an on-ramp drift-guard linter should reject it.
-->

# <PROJECT> — Agent Boot (the ONE on-ramp)

One paragraph: what this project IS, in plain terms a cold agent needs. No status,
no dates, no runtime specifics — just the durable shape of the thing.

> This is the only file you read first. It **points**, it does not assert volatile
> status. Anything dated or runtime-specific (what's proven, recent decisions,
> current config) lives in the ledgers linked below — read those for current
> truth, never trust a status claim hard-coded here.

## The knowledge spine — check it BEFORE investigating anything (anti-amnesia)

Every agent that skips this rediscovers solved problems and re-spends tokens. Do
NOT investigate until you've checked whether it's already answered:
- **The map:** `FILE-TREE.md` (what lives where) + the generated map if present.
- **Code self-describes:** load-bearing files carry an in-source `<context>` block
  (purpose / contract / agent-note / links). Read it before editing the file.
  Compiled to `docs/CODE-CONTEXT-GRAPH.json`.
- **Regenerate after meaningful work:** `node scripts/build-spine.mjs` (the
  pre-commit hook also runs it). Never hand-maintain the derived files.

## Route by question (each question → exactly ONE destination)

| Your question | Read |
|---|---|
| **Where does X live / where do I put a new Y?** | `FILE-TREE.md` |
| What's **decided**? What are the rules / current runtime? | `.planning/DECISION-LOG.html` — newest entry wins |
| Is **X already built / proven**? Will I flag a false blocker? | `.planning/PROVEN-LEDGER.html` — reconcile BEFORE flagging anything missing |
| Did we **already investigate / spend tokens** on this? | `.planning/RUN-LEDGER.html` — read BEFORE starting research |
| What are we **building** (the immutable requirements)? | `.planning/REQUIREMENTS.md` |
| What's the **current status / next step**? | `.planning/STATE.html` + `.planning/ROADMAP.html` — newest wins |
| **What tasks exist?** | `.tasks/` is THE registry. `ls .tasks/{backlog,in_progress,completed}/` |
| What does **file Y** do / can I edit it? | its `<context>` block / `docs/CODE-CONTEXT-GRAPH.json` |
| **How do I run / test / set up** this repo? | `script/bootstrap`, `script/server`, `script/test` (P13 — by convention, zero exploration) |
| How does the **data model** work? | `.planning/DATA-MODEL.html` — re-derives from the schema source on conflict |
| What **happened** historically / what did we learn? | `.planning/TIMELINE/` — day → session narrative, newest first |

## Invariants that never rot (the ONLY assertions allowed here — decisions, not status)

- ADAPT: list the TIMELESS decisions — the ones that are true regardless of date
  or runtime. Examples of the shape (replace with yours):
  - **The backend is <X>.** Captured events must reach it.
  - **<Y>-first** where available; fall back to <Z> only otherwise.
  - **Subtractive.** Update existing docs/ledgers; append to DECISION-LOG; never
    spawn per-attempt status docs.
  - **Boot=MD, state=HTML.** Markdown for on-ramp/design; HTML for state/ledgers.
- For anything **volatile** (current runtime, what's proven, recent SHAs) — see
  `.planning/DECISION-LOG.html` (newest wins). Do NOT assert it here; it rots.

## Where to write findings

- A decision / trap / win / lesson → append ONE entry to `.planning/DECISION-LOG.html`
  (never a new per-attempt doc).
- A task → `.tasks/` (a plan is a HYPOTHESIS until it has a task id).
- A durable fact → `memory/` + a pointer in the memory index.
- After meaningful work → `node scripts/build-spine.mjs`.

## DO-NOT (these fail the pre-commit hook or burn tokens)

- Do **NOT** add a second "read first" / "single source of truth" / "START HERE"
  doc — the **authority-claim linter** rejects competing-authority sprawl.
- Do **NOT** write a dated status claim, an "X/N proven" count, a runtime name, or
  a commit SHA into the Invariants above — the **on-ramp drift-guard** rejects it.
  Put it in DECISION-LOG / a ledger where it is dated and supersedable.
- Do **NOT** add a new top-level dependency without a `dep-rationale:` line in the
  same commit — the **dep-ratchet** (P21) rejects it.
- Do **NOT** regress a structural metric below the frozen baseline — the
  **structure-ratchet** (P17) rejects the commit.
