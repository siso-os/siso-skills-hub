---
name: page-deep-dive
description: "Page Deep-Dive"

disable-model-invocation: true
---

# Page Deep-Dive

A research-heavy SOP for sub-agents tasked with analyzing a single page or component family. Designed to fight the failure mode where Haiku finishes in 60s with surface-level ideas because the prompt didn't force depth.

Each phase has a **minimum artifact** the agent must produce. The agent cannot skip to ideation until earlier phases are filed.

## When to use

Invoke this skill when dispatching agents to:
- Generate animation ideas for a page
- Propose UX/flow improvements for a page (add / remove / alter)
- Audit a component family across the codebase
- Write a redesign proposal for an existing UI
- Any "look at this page and tell me what to improve" task

Do NOT use for: bug fixes, single-line changes, code edits, lookups.

## The 6-phase loop

```
1. SCOPE      → confirm route, entry component, file tree
2. READ       → read every file in the page's component folder, plus 1 hop of imports
3. INVENTORY  → list every visible UI element + its data source + its current state model
4. CROSS-REF  → find sibling pages, shared components, design references, prior decisions
5. CRITIQUE   → first-principles analysis of what works / what doesn't / why
6. IDEATE     → generate the requested output, grounded in phases 1-5
```

Each phase writes its artifact to `<repo>/.claude/page-deep-dive/<page-slug>/`:
- `01-scope.md`
- `02-read-log.md`
- `03-inventory.md`
- `04-cross-ref.md`
- `05-critique.md`
- `06-ideas.md` (the deliverable)

The orchestrator should verify file 01-05 exist before accepting 06.

## Phase 1 — SCOPE (target: 2-3 min)

Agent must produce `01-scope.md` containing:

- **Route(s):** every URL that mounts this page (use `src/app/**/page.tsx`)
- **Entry component:** the top-level feature component file
- **Component tree:** `tree`-style listing of the page's component folder, max depth 3
- **Convex queries used:** every `useQuery(api.X.Y)` call on the page (grep for it)
- **Convex mutations used:** every mutation handler the page calls
- **Open questions:** anything ambiguous about scope — list before reading

If the agent cannot identify all 5 of these, it must Glob/Grep until it can.

## Phase 2 — READ (target: 5-10 min)

Agent must produce `02-read-log.md` containing one entry per file read, format:

```
### <file path>
- Purpose: 1 sentence
- Key types/exports: 2-3 bullets
- Notable patterns: how it animates, how it loads, what state it owns
- Dependencies that matter: which sibling files it relies on
```

**Required files:**
- Every `.tsx` in the page's component folder
- The schema files for any Convex tables it reads (`convex/schema/*.ts`)
- The Convex query/mutation files it calls
- One hop of imports: if a component imports `<StatusBadge>`, read `StatusBadge.tsx`

The agent must not skip files just because they "look unimportant." If they're imported by the page, they're in scope.

## Phase 3 — INVENTORY (target: 3-5 min)

Agent must produce `03-inventory.md` listing every UI element a user sees, with:

| Element | Location | Data source | Current state model | Animation today |
|---|---|---|---|---|
| KPI tile "Events 2 in feed" | top-left of activity widget | hardcoded(?) | none | none |
| ... | ... | ... | ... | ... |

This forces the agent to actually look at the rendered UI, not just skim props.

## Phase 4 — CROSS-REF (target: 5-8 min)

Agent must produce `04-cross-ref.md` containing:

1. **Sibling pages** — list 2-3 other pages in the same product area. For each: what's similar, what differs, what could be borrowed.
2. **Shared components used** — every component imported from `src/shared/ui/` or `src/components/`. Note which are over- vs under-used.
3. **Prior decisions** — search `docs/`, `<repo>/CLAUDE.md`, recent git log for any decisions that constrain this page (e.g. "we removed Composites tab on 2026-04-27"). Use `git log --oneline -20 -- <page-folder>`.
4. **External design references** — name 3-5 production apps/sites that solve a similar surface well (Linear's activity feed, Vercel's deploy log, Notion's database table, etc.). One sentence each on what makes their solution good.
5. **Existing animation/interaction patterns in the repo** — grep for `motion.`, `framer-motion`, `transition-`, `animate-` across the page's folder. Note conventions already in use.

This phase is the one Haiku skips by default. The output is meant to be 1-2 pages of markdown.

## Phase 5 — CRITIQUE (target: 5-7 min)

Agent must produce `05-critique.md` with FIRST-PRINCIPLES analysis. Required sections:

1. **What is this page FOR?** — one sentence on the user job-to-be-done. If the agent cannot answer this in one sentence, the page has a structural problem worth flagging.
2. **What works** — 3-5 bullets on what's already good (don't skip this — corrections without acknowledgement of strengths produce regressions)
3. **What doesn't work** — 5-10 bullets, each with a "why" rooted in the JTBD from §1
4. **Constraints** — what can't change (data model, business rules, brand)
5. **Dead chrome** — any UI element that consumes pixels without serving the JTBD (label this category explicitly — it tends to be where the biggest wins hide)
6. **Hidden cost** — anything that LOOKS fine in screenshots but creates friction in real use (3-click flows, ambiguous states, double-confirm)

## Phase 6 — IDEATE (the deliverable)

Now the agent generates the actual output the orchestrator asked for:

- Animation ideas: minimum 50, mixed S/M/L effort, every idea cites which inventory item it touches
- Flow improvement ideas: minimum 15, each labeled add/remove/alter, each citing which §5 critique point it addresses
- Redesign proposal: 3 variants minimum, each with ASCII mockup + rationale + trade-offs

Format-specific rules per output type: animation-ideas/redesign rules are inline above; for **structural flow analysis** (add/remove/alter with mandatory REMOVE section, friction map, top-3 ranking) read `deliverables/flow-analysis.md` in this skill's dir — it replaces the generic 06-ideas.md with 06-flow-ideas.md. Other variants live in the dispatch prompt.

**Mandatory citation rule:** every idea in `06-ideas.md` must reference at least one of:
- An item from §3 inventory (e.g. "addresses INV-12: redundant 'WORKSPACE SIGNAL' label")
- A point from §5 critique (e.g. "fixes CR-3: empty-state has no recovery path")
- A pattern from §4 cross-ref (e.g. "borrows Linear's command-palette debounce")

Ungrounded ideas get rejected. The orchestrator should grep `06-ideas.md` to confirm citations exist.

## Hard rules for the agent

1. **No skipping phases.** If 04-cross-ref.md is empty, 06-ideas.md is rejected.
2. **No invented file paths.** Every path mentioned must come from a real Glob/Read.
3. **No generic ideas.** "Add hover state" is rejected. "Card hover lifts 2px + shadow scales 1.02 — addresses INV-7 (cards feel inert)" is accepted.
4. **No code edits.** This skill is research+ideation only. Implementation is a separate dispatch.
5. **Cite external references concretely.** "Linear's activity feed has X" not "make it more modern."
6. **Time budget is a floor, not a ceiling.** If the agent finishes phase 2 in 90 seconds, it's reading too fast.
7. **One page per agent.** Do not bundle multiple pages — depth dies.

## Orchestrator dispatch template

When dispatching an agent under this skill:

```
You are running the page-deep-dive skill on <page>.

Read the skill at ~/.claude/skills/page-deep-dive/SKILL.md and follow it phase by phase.

## Page assignment
- Page name: <slug>
- Suggested entry: <file path or route>
- Output directory: <repo>/.claude/page-deep-dive/<slug>/
- Deliverable type: <animation-ideas | flow-improvements | redesign-proposal>
- Deliverable specifics: <count, format, special instructions>

## Time expectation
Minimum 20 minutes. If you finish in under 15, you skipped phases. Re-do the missing phase.

## Done criteria
All six files (01-scope.md ... 06-ideas.md) exist and 06 has citations.

Return a 6-line summary: one line per phase, the path to 06, and any phase you struggled with.
```

## Pairing with other skills

- Pair with `superpowers:brainstorming` for the deliverable phase if Shaan wants conversational ideation.
- Pair with `superpowers:writing-plans` to convert 06-ideas.md into an executable implementation plan.
- DO NOT pair with `iso` — this skill is pre-implementation; iso runs after a plan is written.

## Output structure for orchestrator review

After all dispatched agents complete:

```
.claude/page-deep-dive/
├── recon-discovery/
│   ├── 01-scope.md
│   ├── 02-read-log.md
│   ├── 03-inventory.md
│   ├── 04-cross-ref.md
│   ├── 05-critique.md
│   └── 06-ideas.md
├── recon-creators/
│   ├── ...
└── INDEX.md  ← orchestrator-written: top picks across all pages
```

The orchestrator writes `INDEX.md` after reading all `06-ideas.md` files — synthesizing top 3-5 ideas per page into a single reviewable document for Shaan.

## Verify pass (absorbed page-deep-dive-verify 2026-07-03)

After ideation produces `06-*-ideas.md` (or `06-flow-ideas.md`), run an **adversarial verification pass** before promoting any idea into a plan or implementation. The Haiku ideator is prone to: invented file paths, mislabeled "dead code" that's actually rendered, hallucinated JTBD claims, broken `(CR-N)` / `(INV-N)` citations.

The full SOP (5-phase loop: CLAIM EXTRACTION → PATH AUDIT → DEAD-CODE AUDIT → CITATION AUDIT → DATA/PERF SPOT-CHECK → VERDICT) lives at `deliverables/verify.md` in this skill's directory. Read it and follow it phase by phase. Output is `07-verify.md` in the same page folder, with verdict `PASS` / `PARTIAL` / `REJECT` and line-by-line counter-citations.

Triggers: Shaan says "verify the flow ideas", "audit the proposal", "is this 06 trustworthy?", or before any implementation dispatch against a `06-*-ideas.md` that hasn't been verified. Verifier is read-only — no edits, no new ideation.

## Why this skill exists

Failure mode this prevents: agent reads 2 files, generates 50 surface-level ideas based on screenshot vibes, returns in 60 seconds. Output looks plausible but is ungrounded — ideas reference UI elements that don't exist, miss obvious wins that a real tour of the codebase would surface, and duplicate ideas across pages.

This skill trades cost (10x runtime) for grounding (citations to real code). Use it when the deliverable will drive real implementation work — not for back-of-napkin brainstorms.
