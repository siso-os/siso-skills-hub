# Agent-Architecture Playbook — SCENARIO → ACTION

> The operating manual an agent follows when **laying out or modifying a codebase** so it stays legible to other agents.
> Source of truth + evidence: `../../../../../Foundry/research/answers/GQ-001-agent-legible-architecture/answer/ANSWER.html` (GQ-001, grade B→A on the universal layer). Read that for the *why* and the per-principle evidence; this file is the *what to do, when*.

**How to read this file.** Find your situation in the DECISION TABLE, jump to its SCENARIO block, do the ACTION, obey the DO/DON'T. Every action cites the principle (`Pn`) it implements so you can trace it back to evidence.

**The 22 principles live in two-and-a-half layers — be honest about which you're invoking:**

- **UNIVERSAL CODE-LAYOUT (P2, P3, P5, P6, P8, P9–P16)** — externally corroborated across 24 god-source repos in 4 languages + wired in oracle-streaming. These are *laws*. Apply them in any repo, agent-operated or not.
- **ENFORCEMENT LAYER (P17–P22)** — the breakthrough that makes the above *enforceable on a messy repo on day one* instead of warn-only theater. Wired in oracle-streaming, running in production. Apply these to turn conventions into gates.
- **SISO AGENT-ERGONOMICS (P1, P4, P7)** — house bets. Valid and high-payoff for **agent-operated** repos, **NOT universal law** (0 of 24 corpus repos use the narrative header; worktree-per-task and lazy-wiki are SISO mechanisms). Say so when you apply them. Use the *universal form* (terse machine `<context>` block; README tree; branch+merge) when the repo isn't ours to run agents on.

---

## DECISION TABLE — situation → principle → first move

| Situation | Principle(s) | First move |
|---|---|---|
| Starting a new project | P14, P9, P13, P2, P3, P10, P17 | Two-bucket root (`apps/`+`packages/`), one task-graph file, `script/` ops layer, points-not-asserts CLAUDE.md, volatility-split planning spine, and wire the ratchet at baseline=today **before** writing feature code |
| Adding a new domain/feature | P9, P11, P12, P16 | New **vertical** slice under the domain axis, self-similar to siblings, with an explicit public export surface; local arch matched to its complexity |
| Where does this new file go? | P9, P11, P15 | By **feature/domain**, not technical layer; derived/generated code to its own sibling address; respect the directed-arrow boundary |
| A file is getting too big | P9, P16, P17 | Split along a sub-feature seam (not a layer seam); never let the ratchet's file-size ceiling *rise* |
| Adding a cross-module dependency | P11, P12, P9 | Only via the other module's **explicit contract assembly**; named dep (`@repo/*`), no `../` reach, no barrel; obey core-depends-on-nothing |
| Adding a 3rd-party dependency | P21 | One-line `dep-rationale: <pkg> — <why our code can't do it>` in the **same commit**, or it doesn't land |
| The layout rule keeps getting violated | P10, P20, P11, P12 | Stop warning, start failing the **build/lint**: architecture-as-test + import-boundary-as-lint; if it *keeps* regressing, make the bad state structurally impossible (existence-check gate) |
| Enforcement is warn-only theater / rot creeps back | P17, P18, P19, P22 | Ratchet (freeze metric at today), score it 0–100 and trend it, flip warn→error **only at zero violations**, no-orphan liveness gate on ops |
| Renaming / moving code | P8, P20 | `describe → bridge → move` (stable addresses); if a path keeps coming back wrong, gate its existence |
| Writing docs | P2, P3, P7, KEY-NUANCE(MD) | Boot/doc layer = **Markdown**; point to one destination per question; timeless inline, volatile in dated ledgers; first-read map |
| A doc / derived file went stale | KEY-NUANCE(detect≠repair), P18 | Cheap deterministic detect every commit → write a red "I am stale" banner + the refresh command **into** the file; never auto-run the expensive repair |
| Starting a task | P5, P1, P4, KEY-NUANCE(hypothesis) | One canonical task ID **first** (a plan is a hypothesis until it has one); self-orienting header; worktree off fresh `origin/main` |
| Two agents on one repo | P4, P6, P5, P8 | Worktree-per-task CODE isolation; single-writer spine (files canonical, DB mirror); merge = the verification gate; no side-lists |
| Is the architecture getting better or worse? | P18, P17, P16 | Read the 0–100 structure score + its trend; check the ratchet baselines tightened, not loosened; check the system map is current |
| Landing cold in an unfamiliar repo | P7, P2, P13, P1, P16 | Read the first-read map → CLAUDE.md route table → `script/` to run it → unit headers as you descend → system map for the macro shape |

---

## SCENARIO BLOCKS

### 1. Starting a new project

**Trigger:** an empty repo (or a greenfield directory) you're about to lay out.

**Action.** Establish the skeleton in this order, because later principles assume earlier ones:

1. **Two-bucket monorepo root (P14).** `apps/` for deployables, `packages/` for libraries — flat, no nesting. Exactly **ONE** task/build graph file at the root (`turbo.json` / `moon.yml` / `rush.json` / a single Makefile). This is the build-topology analog of "one registry."
2. **Domain-partitioned source tree (P9).** Inside each app/package, partition by **domain/feature**, never by technical layer (`controllers/`, `services/`, `models/` across the whole app is the anti-pattern). Each slice is self-similar to its siblings.
3. **Name-normalized ops layer (P13).** `script/bootstrap`, `script/setup`, `script/test`, `script/server`, `script/update` at the **same path** in every repo. "How do I run this" is answered by convention, zero exploration.
4. **Points-not-asserts CLAUDE.md (P2).** A literal **question → single-destination** route table. Timeless invariants inline; *every* volatile/dated fact lives in an append-only ledger the table points to. (Boot layer = Markdown — KEY NUANCE.)
5. **Volatility-split planning spine (P3).** Never one mega-doc. Shard: immutable `REQUIREMENTS` vs volatile `STATE` vs `ROADMAP`. This is the single cleanest before/after in the corpus.
6. **Wire the ratchet at baseline = today (P17), score = day-one (P18).** Even on an empty repo, install `structure-ratchet` and `structure-score` so degradation is impossible from the first commit. On a greenfield the baseline is near-perfect; the bar can only tighten from there.

**DO:** lay the executable enforcement (P10/P17) *before* the first feature, so there's never a "we'll add gates later" debt. **DON'T:** build the "perfect static tree" up front with numbered folders and reserved-capacity slots (explicitly killed — YAGNI; Linux/Rust grow by appending). Lock the *loop*, not the *layout*.

---

### 2. Adding a new domain / feature

**Trigger:** a genuinely new bounded concern (a new product area, a new integration, a new vertical).

**Action.** Create a **new vertical slice on the domain axis (P9)**, self-similar to its siblings. Inside it:

- Give it a **local architecture matched to its complexity (P16)** — a rich domain gets full hexagonal/DDD; a trivial CRUD area gets a flat module. Do **not** force the heavyweight skeleton onto a trivial feature (that's the ceremony P16 explicitly refines away).
- Declare its **public export surface (P12)** — what other modules may import. Everything else is private to the slice.
- Cross-module calls go **only through an explicit contract assembly (P11)** — the modular-monolith law: "only IntegrationEvents are callable by other modules." Respect the directed arrow: core depends on nothing, outer points inward.
- If the repo uses generators (P10), create the slice **via the generator**, not by hand-copying a sibling — the generator bakes in the boundary tags that the lint/CI gate checks.

**DO:** make the feature the unit of layout, so an agent landing cold finds the right folder by naming the concern. **DON'T:** scatter the feature across `controllers/ + services/ + models/` layer-folders — that forces a repo-wide scan to understand one change.

---

### 3. Adding a new file — where does it go?

**Trigger:** you wrote code and need a home for it.

**Action.** Resolve placement in this priority order:

1. **By feature/domain first (P9).** Which bounded concern does this code *belong to*? It goes inside that slice. If it belongs to none, that's a signal you may need a new slice (Scenario 2) — or that it's cross-cutting infra (see 3).
2. **Is it DERIVED/generated? (P15)** Generated protobufs, codegen output, compiled assets → their **own sibling address** (`genproto/`, `generated/`, `__generated__/`), never interleaved with hand-written source. Inherit shared config from the **central rig**, don't duplicate config per-unit.
3. **Respect the dependency arrow (P11).** A file in `core/` may not import from `outer/`. If your file needs to, it's in the wrong layer — move the file, don't add the import.
4. **Name it as the answer to a question (survivor of the dropped scoped-ID rule).** Never `utils/`, `helpers/`, `misc/`, `common/` as a dumping ground. The name should tell the next agent what lives there.

**DO:** ask "what feature is this?" before "what kind of thing is this?" **DON'T:** create a `utils.ts` — that's the corpus's canonical legibility tax.

---

### 4. A file is getting too big

**Trigger:** a file is over the repo's line cap (commonly ~250 lines) or the ratchet's file-size dimension is about to regress.

**Action.** Split along a **sub-feature seam (P9/P16)**, not a technical-layer seam. Ask "what are the two *concerns* tangled in here?" not "let me extract the types into a `types.ts`." A god-file is a P18 score-killer (`god-files` is a scored dimension) and the **ratchet (P17) will reject** a commit that *raises* the files-over-cap count.

**DO:** carve out a cohesive sub-module with its own small public surface. **DON'T:** "fix" the size by mechanically sharding into `types.ts` / `constants.ts` / `helpers.ts` — that multiplies files without improving legibility and re-introduces the banned barrel pattern. **DON'T** `--no-verify` past the ratchet to land the oversized file; the hook instruments its own bypass (P19 nuance) and the orphan/score debt compounds.

---

### 5. Adding a cross-module dependency

**Trigger:** code in module A needs something from module B.

**Action.** Route it through B's **explicit contract assembly (P11/P12)**:

- Import B's **declared public surface only** — the named dependency (`@repo/b`, B's `exports` field), never a relative `../../b/internal/thing` reach (P12 bans `../` cross-module and bans barrel `index` files).
- Obey the **directed-arrow rule (P11):** the dependency must point *inward* (toward core). If A is core and B is outer, you may **not** add this edge — invert the dependency or move the shared piece into core.
- If the repo enforces boundaries as lint/test (P10 — `nx enforce-module-boundaries`, ArchUnit, dependency-cruiser), the new import will **fail the gate** unless the contract permits it. That failure is the feature; fix the design, don't suppress the rule.

**DO:** make the import graph a verifiable contract. **DON'T:** reach into another module's internals because it's faster — that's exactly the `renderer↔main` import oracle's dependency-cruiser forbids.

---

### 6. Adding a 3rd-party dependency

**Trigger:** you're about to add a new top-level package to `package.json` / `Cargo.toml` / `go.mod`.

**Action.** **Provenance gate (P21).** In the **same commit** that adds the dependency, add a one-line rationale:

```
dep-rationale: <pkg> — <why our own code can't reasonably do this>
```

A *new name* is gated; version bumps and removals pass free. This is `.gates/dep-ratchet.mjs`, BLOCKING, wired in `.githooks/pre-commit` — it diffs added-vs-removed names. The point is a **justified, not accreted, dep graph**: every dependency answers "why is this here" forever.

**DO:** justify it in one line at the moment of adding. **DON'T:** add a dep "to try it" and clean up later — later never comes, and now the next agent inherits an unexplained edge.

---

### 7. The layout rule keeps getting violated

**Trigger:** a convention (domain boundaries, no `../`, file caps) is documented but agents/humans keep breaking it.

**Action.** The rule is **documentary; make it executable (P10).** Compile the rule INTO the repo so the **build fails on violation:**

- Boundaries → **architecture-as-test** (ArchUnit / NetArchTest) + **import-boundary-as-lint** (dependency-cruiser, `nx enforce-module-boundaries`).
- New units → **create-via-generator** so the correct shape is the *only* easy path.
- If a *specific* bad state keeps regressing despite the gate (a script re-emits it, agents on stale bases re-create it), escalate to **P20 — make it structurally impossible:** add a gate that FAILS if the forbidden path/import exists *at all*. "A move is a state; a gate is an invariant." (Oracle's `no-docs-double-nest.mjs` is the live example — a directory nesting that "regressed REPEATEDLY," now a HARD gate.)

**DO:** convert the warning into a build/lint failure. **DON'T:** add a sterner sentence to CLAUDE.md and hope — a convention with no gate decays the first time a 3am agent ignores it (the corpus's documented failure).

---

### 8. Enforcement is warn-only theater / rot creeps back

**Trigger:** you have gates, but they're `|| true`, `GOVERNANCE_STRICT != 1`, or fictional scripts that don't exist — so nothing actually blocks. (This is GQ-001's own confessed B-grade weakness; oracle-streaming is the fix.)

**Action.** Install the **enforcement layer (P17–P22):**

- **P17 — ratchet, don't pass/fail.** You can't hard-fail "files <250 / no cycles / ≥91% coverage" on a messy legacy tree — every commit rejects, the fleet switches to `--no-verify`, and that bypasses *all* gates at once. Instead **freeze each metric at today's number** as a monotonic baseline. Legacy debt passes; any **new** regression rejects. **Gate the Δ, not the absolute.** The bar only tightens (`--write-baseline` ratchets down on recovery). This makes "keep it clean" enforceable on day one of a dirty repo.
- **P18 — score it.** Emit a deterministic, calibrated **0–100 legibility number** from measurable signals (files-over-cap, css-over-cap, god-files, import-cycles, context-coverage), **trended across commits.** `--calibrate` must reproduce a hand-graded anchor. (Oracle is live at **71/100**, baseline 38, target 90 — and *refutes* any claim the problem is "solved.")
- **P19 — flip warn→error only at ZERO violations.** Hard-erroring a rule while *any* real violation exists rejects every commit → forces `--no-verify` → bypasses everything. So warn+ratchet on dirty dimensions, hard-error **only** on clean ones, and document the single residual blocker inline next to the rule (e.g. "flip to error AFTER the one residual `types.ts` import is gone").
- **P22 — no-orphan liveness gate on the ops layer.** Every script must be reachable (a package.json entry or imported by live code) or it's flagged orphan; the known-orphan allowlist may **only shrink** and each entry needs a written reason. Dead ops code is the same legibility tax as a stale doc.
- **Instrument the bypass.** Since `git reflog` can't see `--no-verify`, write a positive trace of every vetted HEAD sha to `hook-trace.jsonl`, then diff reflog against the trace — any commit with no trace entry is a detected bypass. The enforcement layer **assumes it will be evaded and polices its own circumvention.**

**DO:** ship the ratchet + score + bypass-trace as one wired chain in `.githooks/pre-commit`. **DON'T:** ship an absolute hard gate on a dirty repo (you'll train the fleet to `--no-verify`), and DON'T ship a gate whose enforcer script doesn't exist (manufactures false trust — the corpus's "Registry-Reality-Parity scripts DO NOT EXIST" failure).

---

### 9. Renaming / moving code

**Trigger:** an address (folder, module, file, public symbol) needs to change.

**Action.** **Append-don't-reorg by default (P8):** addresses are stable; new work appends siblings rather than restructuring. When a rename is genuinely necessary, do it in a deliberate **`describe → bridge → move`** window:

1. **describe** — write down what's moving and why (so learned paths can be updated, not silently broken).
2. **bridge** — leave a forwarding shim / re-export / alias at the old address so nothing breaks mid-migration.
3. **move** — relocate, update references, then remove the bridge once green.

If a specific path **keeps regressing** back to the wrong place, stop fighting it move-by-move and **gate its existence (P20)** — a check that fails if the bad path exists at all. (The v4→v5 rename "broke 8 agents" is the burn scar behind this.)

**DO:** treat a rename as a migration with a bridge, not an in-place `mv`. **DON'T:** do a big-bang reorg of a working tree for aesthetics — that breaks every learned path and every hardcoded reference at once. Note: the OUTCOME (stable addresses) is *universal*; the specific `describe→bridge→move` ritual is a SISO house-preference — say so.

---

### 10. Writing docs

**Trigger:** you're creating or updating documentation.

**Action.** Pick the layer and the form:

- **Boot/doc layer = Markdown (KEY NUANCE).** `CLAUDE.md`, `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, planning spine, wiki — all Markdown. (Oracle keeps `.siso-wiki`, `.planning`, fitness, CLAUDE.md in MD.) **State/ledger/report layer = HTML** — dated ledgers, dashboards, persistent run logs, agent state/registry files. This is the **boot=MD / state=HTML split**, NOT blanket-HTML. (HTML-for-agents as a *legibility gain* was refuted; the load-bearing half is "one append-only ledger per concern.")
- **POINTS, not ASSERTS (P2).** Each question gets **one** destination. Put timeless invariants inline; push every dated/volatile fact into the append-only ledger the doc points to. A CLAUDE.md that inlines a volatile status will go stale and lie.
- **Shard by volatility (P3).** Immutable `REQUIREMENTS` separate from volatile `STATE` separate from `ROADMAP`. Never let three same-day design docs compete for canonicity (the Blackbox4 / oracle `sprints/` failure — it keeps trying to come back).
- **Maintain the first-read map (P7).** Keep a "what lives where" map current. Universal form = a hand-curated README tree; the generated lazy `.siso-wiki` shard menu is SISO house-innovation (valid for us, not a law).

**DO:** point to one place per question and keep volatile facts in dated ledgers. **DON'T:** write a mega-doc that mixes requirements + current status + roadmap — it churns and contradicts itself.

---

### 11. A doc / derived file went stale

**Trigger:** a generated index, map, or "proof" might no longer reflect the filesystem.

**Action.** **Detect rot ≠ repair rot (KEY NUANCE).** Run the **cheap deterministic detector every commit** (git-diff, mtime, regex) — never the expensive repair. When the cheap tier finds staleness, it **writes a red "I am stale, verify against the filesystem" banner INTO the derived file** plus the literal refresh command, and stops. The expensive repair (LLM re-index, re-prove a go-live) is **surfaced as stale, never auto-run.**

Make truth **git-falsifiable:** a "proof" is a commit SHA + the `depends-on` paths it was proven against. So "is this still true?" reduces to "have those paths changed since that commit?" — a deterministic check, not a judgment call. Trend the staleness via the structure score (P18).

**DO:** flag stale + emit the refresh command and let a human/agent decide to run it. **DON'T:** auto-run an expensive LLM repair on every commit (cost), and DON'T trust a derived file with no provenance — if it can't be falsified against git, it's a claim, not a proof.

---

### 12. Starting a task

**Trigger:** you're about to begin a unit of work.

**Action.** In order:

1. **One canonical task ID first (P5).** Every unit of work resolves to exactly **one** task ID before it counts. The hub/dashboard is a *projection*, not the source. **A plan is a HYPOTHESIS until it has a task ID** (KEY NUANCE) — a worker is forbidden to act on a `.orchestrate/` plan until it has a `.tasks/` TASK-ID. A thought cannot masquerade as committed work.
2. **Self-orienting header (P1 — SISO ergonomics).** Open the unit with the fixed header so cold pickup is O(1 read). *Universal form:* the terse machine `<context id/layer/status>{purpose, contract, agent-note}` block (oracle's `<oracle-context>`), compiled to a queryable `CODE-CONTEXT-GRAPH.json`, **coverage-gated** (oracle: ≥91%). NOT a narrative GOAL/TIMELINE prose header — 0 of 24 corpus repos do that; it's a house bet on top of the universal machine-manifest instinct.
3. **Worktree off fresh `origin/main` (P4 — SISO ergonomics).** Isolate **CODE** per task (reads shared, writes partition). Do **not** replicate the full state spine per worktree — that forks the single source of truth N ways (explicitly dropped).

**DO:** mint the task ID and the header before touching code. **DON'T:** start "exploratory" work with no task ID and no header — that's the corpus's #1 waste (re-deriving solved context every session).

---

### 13. Two agents on one repo

**Trigger:** more than one agent is working in the same repo concurrently.

**Action.** Compose them safely:

- **Worktree-per-task CODE isolation (P4).** Each agent works in its own worktree off fresh `origin/main`. Reads are shared; writes partition by worktree; **merge is the verification gate** (the analog of branch+PR+CI). Oracle runs 10+ live worktrees off main.
- **Single-writer spine (P6).** The coordination spine has one writer; per-project READ/route autonomy. **Files are canonical, the DB is a thin discovery/event MIRROR** — the newest era *inverted* DB-as-truth and files won. "Nothing is true unless in the DB" is dropped; single-WRITER correctness survives.
- **No side-lists (P5).** Both agents reconcile against the one proven ledger before flagging a gap — don't let each agent keep its own private task list. ("No side-lists is violated across this very workspace" is a known recurring failure — watch for it.)
- **Stable addresses (P8).** Neither agent reorgs the tree mid-flight; appends only, so the other's learned paths don't break.

**DO:** partition writes by worktree and merge to verify. **DON'T:** have two agents write the same files in the same checkout, and DON'T let either treat the DB as the source of truth over the files.

---

### 14. Is the architecture getting better or worse?

**Trigger:** you (or Shaan) want to know whether the layout is improving or degrading.

**Action.** Read the **measurement, not your impression (P18):** the deterministic, calibrated **0–100 structure score** and its **trend across commits**. Oracle's live number is 71/100 (baseline 38, target 90) computed from 5 weighted dims summing to 100 (files-over-cap, css-over-cap, god-files, import-cycles, context-coverage). Then:

- Confirm the **ratchet baselines tightened, not loosened (P17)** — if a baseline got *written upward*, something regressed and got blessed; investigate.
- Confirm the **system map is current (P16)** — its nodes ARE the folders; a drifted map means the macro shape is no longer legible.

**DO:** answer with the trended KPI + ratchet direction. **DON'T:** eyeball it and declare "looks clean" — "is the layout getting better or worse" is *the* measurement the B-grade flagged as the A-gate; if you don't have the score, the honest answer is "unmeasured," then go build P18.

---

### 15. Landing cold in an unfamiliar repo

**Trigger:** you're an agent dropped into a repo you've never seen, with a task to do.

**Action.** Compose the orientation reads top-down — target is **<5k tokens, O(1) at every scope:**

1. **First-read map (P7).** Read the mandated map first — the README "what lives where" tree (universal) or the lazy `.siso-wiki` shard menu (SISO). Tree-on-demand for the touched shard only; do **not** Glob/Grep the whole repo blind.
2. **CLAUDE.md route table (P2).** Find your question; follow the single destination. Timeless invariants are inline; volatile facts are one hop away in a dated ledger.
3. **`script/` ops layer (P13).** "How do I run/test this" is answered by convention at a known path — `script/setup`, `script/test`, `script/server`. Zero exploration.
4. **Unit headers as you descend (P1).** Each unit's `<context>` block / header gives GOAL / FUNDAMENTALS / LOCATIONS-OF-TRUTH (`file:line` where real state lives) so you orient at every scope without re-deriving.
5. **System map for the macro shape (P16).** Nodes ARE the folders; use it to see module clusters and the dependency arrows before you touch anything.

**DO:** read map → route table → run-script → headers, in that order, and stop when you have enough to act. **DON'T:** start with a repo-wide grep — context is partial by design, and the orientation layer exists precisely so you don't have to scan (the ~50K-token saving the lazy map claims, unmeasured but directionally the whole point).

---

## WHICH TEMPLATES / ADRS APPLY

Templates live in `../templates/` and architecture decision records in `../adrs/` (siblings of this `playbook/`). Map your scenario to the artifact you instantiate or cite:

| Scenario | `../templates/` to instantiate | `../adrs/` to cite |
|---|---|---|
| 1. New project | root skeleton (`apps/`+`packages/`+one task-graph), `script/` ops layer, CLAUDE.md route-table, volatility-split `.planning/` | ADR: two-bucket root (P14), ADR: domain-partition axis (P9) |
| 2–3. New domain / new file | domain-slice generator template, `<context>` header block | ADR: cross-module contract-only access (P11/P12) |
| 5–6. Cross-module / 3rd-party dep | `.dependency-cruiser.cjs` boundary template, `.gates/dep-ratchet.mjs` | ADR: named-deps-no-barrels (P12), ADR: dep-provenance gate (P21) |
| 7–8. Enforcement | `fitness/structure-ratchet.mjs` + baseline, `fitness/structure-score.mjs`, `fitness/no-orphan-scripts.mjs`, `.githooks/pre-commit` chain, `hook-trace.jsonl` bypass-instrument | ADR: ratchet-the-Δ-not-the-absolute (P17), ADR: warn→error-only-at-zero (P19), ADR: structurally-impossible-states (P20) |
| 9. Rename/move | `describe→bridge→move` migration template | ADR: append-don't-reorg (P8) |
| 10–11. Docs / staleness | CLAUDE.md route-table template, `<stale-banner>` snippet, ledger template (HTML) | ADR: boot=MD / state=HTML split, ADR: detect-rot≠repair-rot |
| 12–13. Tasks / multi-agent | `.tasks/TASK-ID` template, `<oracle-context>` header, worktree-bootstrap script | ADR: file-canonical-spine-DB-mirror (P6), ADR: worktree-per-task code isolation (P4) |
| 14. Trajectory | `structure-score` calibration anchor | ADR: score-the-structure (P18) |
| 15. Cold landing | first-read map template (README tree / `.siso-wiki` shard menu) | ADR: points-not-asserts (P2), ADR: first-read-map (P7) |

> If `../templates/` and `../adrs/` are still empty, that's the next build: each row above is a template/ADR to author. The principles are the spec; instantiate them per repo.

---

**Honesty footer.** The UNIVERSAL layer (P2/P3/P5/P6/P8/P9–P16) is externally corroborated — apply with confidence. The ENFORCEMENT layer (P17–P22) is wired and running in oracle-streaming at 71/100 (not 90 — the problem is *measurably-improving-but-incomplete*, not solved). The AGENT-ERGONOMICS layer (P1/P4/P7) is a SISO house bet valid for agent-operated repos — when you apply it, say "this is our ergonomics layer, not a universal law," and reach for the universal *form* (machine `<context>` block, README tree, branch+merge) when the repo isn't ours to run agents on.
