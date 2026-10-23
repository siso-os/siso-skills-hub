---
name: page-flow-analysis
description: First-principles UX flow analysis for a single page. Specializes the page-deep-dive skill for add/remove/alter recommendations grounded in user job-to-be-done. Use when dispatching agents to propose what a page should change — not animation polish, but structural UX flow improvements (new components, removed dead chrome, reordered steps). Output is a reasoned proposal, not implementation.
---

# Page Flow Analysis

A specialization of `page-deep-dive` for **structural UX critique**. Where page-deep-dive is the research SOP, this skill defines the deliverable shape for "what should this page actually be?"

Use this when Shaan asks: "look at this page and tell me what to add, remove, or alter — with reasoning."

## When to use

- "Audit X page and tell me what's wrong"
- "First-principles flow analysis on Y"
- "What should we add / remove / alter?"
- "Redesign proposal for Z"

Do NOT use for:
- Animation polish (use `page-deep-dive` with deliverable: animation-ideas)
- Bug fixes or single-line changes
- Implementation work (this skill outputs a proposal, not code)

## Prerequisite

This skill REQUIRES `page-deep-dive` phases 1-5 to be complete first. The agent must have produced:

- `01-scope.md`
- `02-read-log.md`
- `03-inventory.md`
- `04-cross-ref.md`
- `05-critique.md`

If those don't exist, the agent runs page-deep-dive first. No shortcuts.

## The deliverable: 06-flow-ideas.md

Write to `<repo>/.claude/page-deep-dive/<page-slug>/06-flow-ideas.md` (note: this REPLACES the generic 06-ideas.md when the deliverable is flow analysis).

### Structure

```markdown
# Flow Analysis — <Page Name>

## Job-to-be-done (one sentence)
[Pulled from 05-critique §1. If unclear, flag as a structural problem.]

## Current flow (numbered steps)
1. User lands on page
2. Sees X
3. Clicks Y
4. ...

Walk through what a real user does today, in order. Cite inventory items.

## Friction map
For each step above, mark:
- ✅ smooth
- 🟡 minor friction (extra click, ambiguous state)
- 🔴 broken (dead-end, wrong default, missing affordance)

## Proposed changes

### ADD (new components/affordances)
Minimum 5 ideas. For each:

> **A1. <name>**
> - **What:** 1-2 sentences describing the new element
> - **Why:** which §5 critique point or §3 inventory gap it addresses
> - **Where:** which existing component would host it (cite path)
> - **Effort:** S / M / L
> - **Risk:** what could go wrong (data, perf, UX regression)
> - **Reference:** which §4 cross-ref pattern it borrows from (Linear / Vercel / Notion / etc.)

### REMOVE (dead chrome / redundant elements)
Minimum 5 ideas. For each:

> **R1. <element>**
> - **What:** the inventory item being removed (cite §3 INV-N)
> - **Why:** why it doesn't serve the JTBD
> - **Migration:** what happens to the function it served (consolidated where? gone forever?)
> - **Effort:** S / M / L
> - **Risk:** who relies on this today (check git blame / call sites)

### ALTER (reshape existing elements)
Minimum 5 ideas. For each:

> **AL1. <element>**
> - **What:** before → after (one line each)
> - **Why:** which §5 critique point it addresses
> - **Where:** file path
> - **Effort:** S / M / L
> - **Risk:** what could regress
> - **Reference:** §4 cross-ref pattern it borrows

### REORDER (sequence/hierarchy changes)
Optional, minimum 0. For sequencing changes:

> **O1. <change>**
> - **Current order:** A → B → C
> - **Proposed:** A → C → B
> - **Why:** reason rooted in JTBD

## Top 3 to ship first

Rank-ordered by (impact / effort). For each:
1. The change
2. Why it's #1/#2/#3
3. The single file or two that would change

## What I almost recommended but didn't

2-3 ideas you considered and rejected, with reason. Forces honesty — proves you thought about the negative space.

## Open questions for Shaan

3-5 questions a real user-research session would need to answer before shipping these changes. Tag them with which proposal they unblock.
```

## Hard rules

1. **Minimum 15 total ideas** across ADD/REMOVE/ALTER (5 minimum each).
2. **Every idea must cite §3 inventory or §5 critique.** Ungrounded ideas are rejected.
3. **REMOVE is mandatory.** If the agent can't find 5 things to remove, it didn't read carefully — go back to phase 5.
4. **No vague verbs.** "Improve hierarchy" is rejected. "Demote 'WORKSPACE SIGNAL' label from row 2 to a tooltip on hover, addresses CR-3 (label is dead chrome consuming 18px per row)" is accepted.
5. **No invented features.** Don't propose data the schema can't supply. Check the Convex queries from §1 scope.
6. **Reference real apps in §4.** "Borrow from Linear's grouped activity rows" with a 1-line description of what Linear does. Don't say "make it like Apple."
7. **Costs are spelled out.** Every proposal lists effort AND risk. Free lunches are red flags.

## Pairing

- **Run after** `page-deep-dive` phases 1-5 (this skill is the deliverable layer).
- **Pair with** `superpowers:writing-plans` to convert the top 3 picks into an implementation plan.
- **Don't pair with** `iso` — this is pre-implementation research.

## Why "REMOVE is mandatory"

The hardest UX work is subtraction. Agents (and humans) default to add-add-add because adding is generative and feels productive. A flow audit that proposes 20 new things and removes nothing is a tell that the agent didn't engage with the page critically.

The skill enforces removal to keep the analysis honest.

## Orchestrator dispatch template

```
You are running page-flow-analysis on <page>.

Step 1: Read ~/.claude/skills/page-deep-dive/SKILL.md and run phases 1-5. Save artifacts to <repo>/.claude/page-deep-dive/<slug>/.

Step 2: Read ~/.claude/skills/page-flow-analysis/SKILL.md. Produce 06-flow-ideas.md following its structure exactly.

Step 3: Verify minimums — 5 ADD, 5 REMOVE, 5 ALTER, citations present, top-3 ranked, "almost recommended" section filled.

## Page assignment
- Slug: <page-slug>
- Suggested entry: <file or route>
- Output: <repo>/.claude/page-deep-dive/<slug>/

## Time expectation
Minimum 25 minutes. If you finish in under 20, you skipped a phase. Re-do.

## Done criteria
All 6 files exist. 06 is the flow-ideas variant. Citations present.

Return a 6-line summary: phase status, top 3 picks, biggest surprise from §4 cross-ref.
```

## Output index (orchestrator-written, after all agents finish)

After all dispatched agents complete, the orchestrator writes:

```
.claude/page-deep-dive/INDEX.md
```

containing:
- Top 3 picks per page (the agent's own ranking)
- Cross-page themes (e.g., "every page proposes removing 'Live Activity' chrome — global pattern")
- Conflicts between proposals (page A wants more density, page B wants more whitespace — flag the contradiction)
- 5-10 highest-leverage moves across the entire app, with effort + risk

This index is what Shaan reviews. The per-page docs are the receipts.
