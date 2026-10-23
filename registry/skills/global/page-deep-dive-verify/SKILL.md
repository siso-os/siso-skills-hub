---
name: page-deep-dive-verify
description: Adversarial verification pass on a page-flow-analysis deliverable. Treats every claim in the 06-flow-ideas.md as suspect — checks file paths exist, citations match, "dead code" is actually dead, "data integrity bugs" actually reproduce, references aren't invented. Use when you need to trust a Haiku-generated proposal before acting on it. Output is a verdict file: PASS / PARTIAL / REJECT with line-by-line counter-citations.
---

# Page Deep-Dive Verifier

A skill for skeptical second-pass review of a `page-flow-analysis` (or `page-deep-dive`) deliverable. Designed for the failure mode where a Haiku ideator produces plausible-sounding ideas that reference invented file paths, mislabel components as "dead", or hallucinate JTBD claims that don't match the actual code.

## When to use

- Verifying any `06-flow-ideas.md` or `06-ideas.md` file produced by `page-flow-analysis` / `page-deep-dive`
- Fact-checking before promoting a Haiku-proposed change into an implementation plan
- Spot-checking a previously-trusted deliverable that's about to drive real edits

Do NOT use for:
- Original ideation (use `page-flow-analysis` instead)
- Code edits (this skill is read-only)
- Verifying simple bugfix proposals where the diff already exists

## Inputs

- A page slug (e.g. `recon-discovery`)
- Path to the existing deep-dive folder: `<repo>/.claude/page-deep-dive/<slug>/`

The folder must contain at minimum `06-flow-ideas.md`. The verifier will also read 03-inventory and 05-critique for citation cross-checks.

## The 5-phase verification loop

```
1. CLAIM EXTRACTION  → enumerate every concrete claim in 06 (paths, "dead code", JTBD, citations)
2. PATH AUDIT        → every file path mentioned must exist (Glob/Read)
3. DEAD CODE AUDIT   → every "dead/never rendered/zero imports" claim verified by Grep call-site count
4. CITATION AUDIT    → every "addresses CR-N / INV-N" tag must point to a real entry in 03/05
5. VERDICT           → write `07-verify.md` with PASS/PARTIAL/REJECT + line-by-line findings
```

Each phase produces an artifact appended to `<repo>/.claude/page-deep-dive/<slug>/07-verify.md`.

## Phase 1 — CLAIM EXTRACTION

Read `06-flow-ideas.md` end-to-end. Build a numbered claim list. Categories to extract:

- **PATH claims:** every "Files: src/.../X.tsx" line
- **DEAD claims:** every "dead code", "never rendered", "zero imports", "unused", "orphaned", "no UI path"
- **DATA claims:** every "data integrity bug", "silently fails", "doesn't persist", "hardcoded", "fake", "static"
- **PERF claims:** every "runs N queries on every X", "re-renders per second", "measurable performance cost"
- **REFERENCE claims:** every "Linear does X", "Vercel pattern", "Notion has Y" — these get a quick sanity check, not a deep audit
- **CITATION claims:** every "(CR-N)", "(INV-N)", "addresses §X" tag

Output (in 07-verify.md): table of claim# / category / verbatim text / required evidence.

## Phase 2 — PATH AUDIT

For each PATH claim:
- Run `Glob` or `Read` on the path
- Mark `EXISTS` / `MISSING` / `RENAMED` (close match found)
- For RENAMED, note the actual current path

Hard rule: any MISSING path = automatic PARTIAL verdict at minimum. The verifier flags exactly which line of 06 needs correcting.

## Phase 3 — DEAD CODE AUDIT

For each DEAD claim, the verifier MUST run a Grep:

- "X is never rendered" → `grep -rn "<X" src/` (open angle bracket — finds JSX usage)
- "X has zero imports" → `grep -rn "import.*X" src/` and `grep -rn "from.*X" src/`
- "X is orphaned" → both of the above
- "Component is dead" → check both import + JSX usage

Result format per claim:
- **CONFIRMED DEAD:** zero JSX usage AND zero imports outside the file's own export
- **STILL USED:** at least one import + JSX usage
- **PARTIAL:** imported but never rendered (dangling import — still worth removing but the claim's framing is wrong)

If even one DEAD claim turns out to be STILL USED, the verdict is at least PARTIAL.

## Phase 4 — CITATION AUDIT

For each CITATION claim like "(CR-3)" or "(INV-12)":
- Open the file referenced (03-inventory.md or 05-critique.md)
- Confirm a CR-3 / INV-12 entry actually exists
- Confirm the entry's content roughly matches the proposal's framing (one sentence sanity check)

Failed citation = PARTIAL verdict on that idea.

## Phase 5 — DATA / PERF SPOT-CHECK

For high-stakes DATA and PERF claims (anything labelled "data integrity bug" or "runs N queries on every X"):

- **DATA bug claims:** Read the alleged-broken function. Check whether the claim is actually true by reading the code path, not just trusting the agent's narrative. E.g. if the claim is "DetailPanel.handleApprove doesn't call approveTrackedAccount", actually `Read` DetailPanel.tsx and confirm the call is missing.
- **PERF claims:** Read the cited file. Look for actual `useEffect`/`useQuery`/handler patterns. The claim "runs 2 Convex queries on every page load" must trace to actual `useQuery` calls in the component, not a guess.

This is the most expensive phase. Spend time here. Surface-level claim-following is what we're trying to prevent.

## Phase 6 — VERDICT

Write `<slug>/07-verify.md`:

```markdown
# Verification — <slug>

**Verdict:** PASS / PARTIAL / REJECT
**Verified:** YYYY-MM-DD
**Verifier model:** haiku

## Summary
- N claims extracted
- N paths verified (M missing/renamed)
- N dead-code claims verified (M still-used)
- N citations verified (M broken)
- N data/perf claims spot-checked (M failed)

## Failures (line-by-line)
For each failure:
- Claim #
- Original 06 line: "verbatim"
- What's wrong: 1 sentence
- Evidence: grep output / file read
- Severity: BLOCKER / DOWNGRADE / NIT

## Confirmed wins
The 3-5 claims that survived verification cleanly. These are the ones safe to act on immediately.

## Recommended action
- PASS: implement top-3 from 06-flow-ideas.md as proposed
- PARTIAL: implement top-3 EXCEPT items #X, #Y (cited reasons); fix 06 before next pass
- REJECT: re-run page-flow-analysis with feedback file appended; do not act on 06 as-is
```

## Verdict thresholds

- **PASS:** all paths exist, all dead-code claims confirmed, all citations valid, no data/perf claim failed spot-check
- **PARTIAL:** ≤25% of claims have issues, no BLOCKER-severity findings (BLOCKER = a top-3 idea references invented paths or false data claims)
- **REJECT:** >25% claim failure rate, OR any BLOCKER on a top-3 idea

## Hard rules

1. **The verifier never trusts a claim without evidence.** Every PATH/DEAD/DATA/PERF claim gets independent verification.
2. **Citations are not optional.** A broken (CR-N) tag downgrades the verdict.
3. **The verifier does NOT propose new ideas.** Its job is critique, not generation. If gaps emerge, list them as open questions.
4. **No code edits.** Read-only. Output is a single 07-verify.md file.
5. **Severity matters.** A missing helper-component path is a NIT. A missing top-3 file path is a BLOCKER.
6. **Don't accept "broadly correct" claims.** "BriefBuilder is unused" must mean zero imports AND zero renders, not "it looks unused to me."

## Orchestrator dispatch template

```
You are running the page-deep-dive-verify skill on <slug>.

Read ~/.claude/skills/page-deep-dive-verify/SKILL.md and follow it phase by phase.

## Inputs
- Slug: <slug>
- Folder: <repo>/.claude/page-deep-dive/<slug>/
- Repo root: <repo>

## Required behavior
- Read 06-flow-ideas.md, 03-inventory.md, 05-critique.md from that folder
- Run all 5 phases. Do not skip Phase 5.
- Write 07-verify.md in that same folder
- NO code edits. NO new ideation.

## Time expectation
Minimum 10 minutes. If you finish in under 5, you skipped the spot-check phase. Re-do.

## Done criteria
07-verify.md exists with verdict + failures table + confirmed-wins list.

Return a 5-line summary: verdict, # of failures by category, top BLOCKER if any, top confirmed win.
```

## Pairing

- **After** `page-flow-analysis` (this is the verification gate before implementation)
- **Before** `superpowers:writing-plans` (only plan from VERIFIED proposals)
- **Don't pair with** `iso` — verification is upstream of implementation orchestration

## Why this skill exists

Failure mode: Haiku produces a confident-sounding 06-flow-ideas.md. Orchestrator reads the summary, picks top 3, dispatches implementation workers. Implementation worker discovers the file path was hallucinated, the "dead component" is actually used elsewhere, the "data integrity bug" was a misread of the code path. Hours wasted.

This skill catches those failures BEFORE implementation dispatch. Trades 10 minutes of verifier time for hours of saved rework.

## Output structure

After all verifiers complete, the orchestrator writes/updates:

```
.claude/page-deep-dive/
├── INDEX.md           ← original synthesis
├── INDEX-VERIFIED.md  ← post-verification synthesis (only PASSED + PARTIAL-with-known-caveats picks)
├── <slug>/
│   ├── 06-flow-ideas.md
│   └── 07-verify.md   ← NEW
```

INDEX-VERIFIED.md re-ranks the top-10 moves keeping ONLY ones that survived verification, with each entry tagged with its verifier verdict.
