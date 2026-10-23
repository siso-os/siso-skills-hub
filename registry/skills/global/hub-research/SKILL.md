---
name: hub-research
description: V1 research skill for an Opus seat that needs to map its whole domain (~80% of what exists) cheaply. One Opus plans and judges; about 15 Haiku sub-agents (researcher, checker) search and read; scripts sweep GitHub and merge. Ends with a map of the domain, what we are heavy and light on, the top picks with reasons, and UI references to steal. Use when a hub seat (AGENTS-HUB, SISO-BENCH, SISO-VOICE, UI-HUB, ...) is asked to research its domain, or any "find everything that exists about X" job bigger than a few searches.
---

# hub-research v1 (14 Oct 2026)

> Renamed: new runs use **world-class-research** (`~/.claude/skills/world-class-research`). Runs already going may finish on this one.

The design and its sources: `~/SISO_Workspace/_data/app-factory/research/RESEARCH-SKILL-DRAFT.md`. Shaan's words (they
win): `~/SISO_Workspace/_data/app-factory/WORDS-2026-10-14.md`. We are the layer above everything that exists, so the
aim is coverage first, then judgement.

You, the Opus, never read raw pages. You plan, read summaries and the coverage table, judge, and write. Haikus do all
the reading. Scripts do the counting.

## 0. Set up (once per run)
- The run folder is `<your home>/research/<YYYY-MM-DD>-<topic>/`, holding `PLAN.md`, `rows/`, `notes/`, `blind/`, and
  later `merged.jsonl`, `COVERAGE.md` and `INDEX.md`.
- Reuse before search. Check `estate where <topic>`, earlier `research/` folders, the repo bank
  (`Great_Library_of_SISO/banks/siso-repo-bank`) and foundry. Put what you already have in PLAN.md, so no Haiku re-finds it.
- Compaction: Haikus should compact at about 100k. Sub-agents have no per-agent setting, but
  `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` does reach them. Until that is proven live, cap each Haiku's work instead: about 40
  tool calls, and it writes up at about 80k.

## 1. Plan (about 5% of the run)
Write `PLAN.md` with:
- the goal, in Shaan's words
- the coverage target
- 8-12 slices, each with an objective, sources to try, out of scope, a budget (tool calls), and what would prove the
  slice wrong

Seed the slices from evidence, not guesses: who the incumbents are first, then the blind map.

## 2. The GitHub sweep (scripts, not tokens)
GitHub is where most of everything is: don't sleep on it. Run the sweep yourself or from one Haiku. It splits every
query into star bands to get past GitHub's 1,000-result cap, and drops duplicates:

```
~/.claude/skills/hub-research/gh-sweep.py --slice github-<x> --out <run>/rows/github-<x>.jsonl \
   "agent skills" "claude skills" "topic:claude-skills" "topic:agent-skills" "topic:mcp-server" ...
```

Use many phrasings and topics. `gh search code` (for example `filename:SKILL.md`) and
`gh api search/repositories?q=...` are fine for anything the script doesn't cover. Then give the top repos by stars to
Haiku researchers to read their READMEs and fill in `why_it_matters` and `ui_notes`.

## 3. Blind map (3 Haikus)
Give `researcher` Haikus the domain only, not our plan or our picks. Each maps every site, registry, list and
community it can find, and writes `blind/<n>.md` plus `rows/blind-<n>.jsonl`. Then revise PLAN.md.

## 4. Directed slices (about 10 Haikus, in waves of 4 at most; see rule 0)
Each `researcher` gets one slice from PLAN.md:
- its objective, sources, out of scope and budget
- the row schema
- its two output paths: `rows/<slice>.jsonl` and `notes/<slice>.md`

It returns only the paths and a summary of 5 lines or fewer.

The row, shared by every hub:
`{id, slice, kind (site|repo|paper|product|person|list), name, url, what, why_it_matters, numbers, ui_notes,
source_urls[], found_by, verified (null), note}`

## 5. Merge and look at coverage
Run `~/.claude/skills/hub-research/merge.py <run> --target 40`. Read `COVERAGE.md`: rows per slice (heavy, ok, LIGHT),
kinds, how much is verified, and the top 15. **If a slice is light, or anything feels thin for any reason, send more
Haikus at just that gap**, then merge again. Stop when new rounds find little that is new.

## 6. Verify (2 `checker` Haikus)
Checkers re-open every row with a number or a claim of "best", plus 20% of the rest at random, and set `verified` and
`note`. Unverified rows never reach the write-up.

## 7. Write-up (you)
From `COVERAGE.md`, the slice summaries and the verified rows, write `INDEX.md`:
- the map of the domain
- what we are heavy and light on
- the top picks with reasons
- principles worth distilling (they go to the harvesting bank)
- UI references worth stealing
- the gaps

Also write `themes.json`. Then:
- one line at the top of `.agents/LOG.md`
- move the task in `TASKS.json`
- tell Shaan what was found, what we're heavy and light on, and what you'd do next

## Rules
0. **Laptop first.** No more than 4 Haikus running at once, and one headless browser (camofox) at a time. Before each wave, check `uptime`: if load is over 16, or `sysctl vm.swapusage` shows more than 6 GB used, wait for the running ones to finish. (14 Oct: six runs at once pushed load to 58, filled swap, and froze SISO Code.)
1. Plan once, in a file. Every worker gets an objective, an output format, tool guidance and boundaries.
2. Scale the effort to the question: a fact gets 1 Haiku, a domain gets 10+.
3. Workers return paths and condensed findings, never raw pages.
4. One deduplicated queue of URLs and gaps. A slice that stops finding anything new stops.
5. A hard budget per run. Hitting it forces the write-up.
6. Verification is its own pass.
7. Every slice has a falsifier.
8. Reuse before search.
