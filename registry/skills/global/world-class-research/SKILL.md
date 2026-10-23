---
name: world-class-research
description: Take any domain from zero to a world-class grasp, cheaply. That means every library, site, tool, person and paper in the domain, plus the neighbouring sub-domains that add complementary data: ~80% of everything alive, global and good, by numbers and by quality. Successor to hub-research (v1). One Opus plans and judges; about 15 Haiku sub-agents (researcher, checker) search and read; scripts sweep GitHub and merge. Ends with a map of the domain, what we are heavy and light on, the top picks with reasons, and UI references to steal. Use when a hub seat (AGENTS-HUB, SISO-BENCH, SISO-VOICE, UI-HUB, ...) is asked to research its domain, or any "find everything that exists about X" job bigger than a few searches.
---

# world-class-research (v3, 14 Oct 2026: v2 plus the lessons of its first eight runs)

**The point (Shaan, 14 Oct):** in any domain, go from zero to a world-class grasp of every library in that domain, and
of every nuance and sub-library in a neighbouring domain that adds complementary data. That is about 80% of everything
that's alive, global and good, measured by numbers and by quality. Coverage first, then judgement. We are the layer
above all of it.

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
- **WebSearch is about 200 calls per session, shared by every sub-agent** (BENCH burned it in minutes). Give each Haiku
  about 12 searches and tell it to fetch first when the sources are known URLs.
- macOS has no `timeout`: run long scripts with `run_in_background`, never wrapped in `timeout`.

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
~/.claude/skills/world-class-research/gh-sweep.py --slice github-<x> --out <run>/rows/github-<x>.jsonl \
   "agent skills" "claude skills" "topic:claude-skills" "topic:agent-skills" "topic:mcp-server" ...
```

Use many phrasings and topics. Add `--relevance 'regex'` (case-insensitive, on name+description) to keep only matching repos, and `--limit N` for a smaller test. Sweeps now resume: rows append as each query+band finishes, `<out>.done` lists the finished keys, and a rerun skips them and dedupes. `gh search code` (for example `filename:SKILL.md`) and
`gh api search/repositories?q=...` are fine for anything the script doesn't cover. Then give the top repos by stars to
Haiku researchers to read their READMEs and fill in `why_it_matters` and `ui_notes`.

- **Plain words pull noise** (LAWBOOK: "principles" gave 4,809 rows of clean-code repos; VIDEO: 1,849 of 3,980 off-topic).
  Use specific phrasings and topics, keep a row only if its description matches a query term, and keep GitHub rows
  out of the top 15 unless a reader marked them relevant. Readers mark unrelated giants NOISE; merge drops them.
- **One sweep at a time:** concurrent sweeps share GitHub's rate limit and time out. A sweep writes only at the end, so
  a rerun resumes it (see above), so run several small sweeps rather than one big one. `gh search code` needs qualifiers as
  separate args and about 65 s between calls.
- **Scripts beat Haikus for long tails:** any public API or dump (Hugging Face Spaces, OpenRouter, models.dev, a
  registry's JSON) is pulled by script for 0 tokens, and a curl pass checks liveness and star counts for hundreds of
  rows in a minute. Do these before any checker.

## 2b. Prior art under other names, and neighbouring domains
Before the blind map, have one Haiku list the other names this domain goes by (e.g. a "people graph" is also a
knowledge graph, prosopography or an authority file), and the 3-5 neighbouring domains whose data complements it. Give
the neighbours one slice each. Also search our own estate and earlier runs first: most domains already have something
of ours.

## 3. Blind map (3 Haikus, in the same wave as the first directed slices)
Give `researcher` Haikus the domain only, not our plan or our picks. Each maps every site, registry, list and
community it can find, **fetches the top 10 it finds** (snippets alone wasted a slice on AGENTS-HUB), and writes
`blind/<n>.md` plus `rows/blind-<n>.jsonl`. Run them alongside wave 1, not before it (blind-first cost a full wave
of wall-clock). Then revise PLAN.md. The blind probe's overlap with what we already had (new domains vs known) is the
best stop signal: AGENTS-HUB went 37%, then two long-tail Haikus, then about 14%, and stopped there.

## 4. Directed slices (about 10 Haikus, in waves of 4 at most; see rule 0)
Each `researcher` gets one slice from PLAN.md:
- its objective, sources, out of scope and budget
- the row schema
- its two output paths: `rows/<slice>.jsonl` and `notes/<slice>.md`

It returns only the paths and a summary of 5 lines or fewer. Every brief also says:
- **Write as you go:** append each row as found. A pause or stall killed 7 of 10 VIDEO Haikus and 8 of 12 SOFTWARE
  Haikus with nothing on disk.
- **Name every output path** (Haikus refuse to write anything outside the paths they were given).
- **The `kind` values are fixed** (the list below). Never invent one.
- **The fallback for blocked sites, named up front:** Reddit, and pages that return 403 to WebFetch, go to camofox or
  are skipped and listed in notes. Every number records where it came from: page, API or search snippet.

The row, shared by every hub:
`{id, slice, kind (site|repo|paper|product|person|list), name, url, what, why_it_matters, numbers, ui_notes,
source_urls[], found_by, verified (null), note}`

## 5. Merge and look at coverage
Run `~/.claude/skills/world-class-research/merge.py <run> --target 40`. To give one slice its own target, add a line `target: <slice> <n>` to PLAN.md (for example `target: github 2000`); that slice is judged against n, the rest against --target. The fixed 40 marks deliberately small
slices LIGHT (a 30-row hand-read design slice, 28 screenshots): judge each slice against its own target and falsifier in
PLAN.md, not the label. Count with Python, never awk (quoted commas broke counts). At most 2 gap rounds. Read `COVERAGE.md`: rows per slice (heavy, ok, LIGHT),
kinds, how much is verified, and the top 15. **If a slice is light, or anything feels thin for any reason, send more
Haikus at just that gap**, then merge again. Stop when new rounds find little that is new.

## 6. Verify (scripts, then 2 `checker` Haikus, then you on the top 10)
Scripts first (liveness, stars, prices from APIs). Then checkers re-open every row with a number or a claim of "best",
plus 20% of the rest at random, and set `verified` and `note`. A checker gets about 40 calls, so **you pre-select the
rows the write-up relies on** rather than every flagged row, and it fetches by a scripted curl-and-grep batch, not page
by page. Three verdicts: true, false, and **unreached** (blocked, 404, SPA or PDF). Unreached is not false (VOICE's 18
"false" were mostly blocked pages). Finally you probe the top 10 picks yourself, in one call: Haikus repeat stale facts.
Unverified rows never reach the write-up.

## 6b. Pick the bases (the T3 Code test; Shaan, 14 Oct)
We copied T3 Code because it was near the best now **and** will keep getting better without us: a funded team on
many Claude plans, building with agents, merging outside PRs within hours. Find that shape in every domain.
- Take the top ~30 repos from the merge (by stars and fit) and run `base-score.py owner/repo ...` (live GitHub,
  no tokens). It scores 0-100 on five things: good now (stars), velocity (commits, merged PRs, releases in 90 days),
  community (outside PR authors, median time to merge, not one person), momentum (stars per day), compounding
  (share of commits built with AI agents, run by an org) and a forkable licence. Reference: pingdotgg/t3code = 97.
- One Haiku checks the top 5 for what GitHub can't show: funding, team size, whether the founders publicly build
  with agents, and whether the product is the company's core (a side project slows down).
- Write `BASES.md`: the top 3 to base ours on, each with its score line, why, and what we would pull from upstream.
  Prefer a base we can keep pulling from (a fork, like siso-code on t3code) over a one-off copy.

## 6c. Screenshots of real products, never mocks
`ui-bases/` holds screenshots of real products only, taken one at a time by camofox (`shoot.py`/`shoot.sh` in
INDUSTRIES and LAWBOOK runs). Wait for charts to render, check the pixel size (VOICE's image URLs were icons), and
label stand-ins. **Never design our own UI in a research run:** hand-made HTML mocks (PEOPLE-GRAPH, LAWBOOK) were
judged "dog shit" by Shaan on 14 Oct. Our UI comes from UI-HUB (`Great_Library_of_SISO/banks/siso-ui-hub`); a run
records what to steal and from where, and stops there.

## 7. Write-up (you)
From `COVERAGE.md`, the slice summaries and the verified rows, write `INDEX.md`:
- the map of the domain
- what we are heavy and light on
- the top picks with reasons
- principles worth distilling (they go to the harvesting bank)
- UI references worth stealing (URLs and headless screenshots of real products, for UI-HUB)
- **where the data lives:** the 3-5 best sources to pull from, each with URL, size, API or dump, and licence (these
  feed the shared data layer, so be exact)
- the system: how this domain's data should be stored, refreshed and served, so it scales cheaply
- the gaps

Also write `themes.json`. Then:
- one line at the top of `.agents/LOG.md`
- move the task in `TASKS.json`
- tell Shaan what was found, what we're heavy and light on, and what you'd do next

## Rules
- **Opus cost (measured 14 Oct: research seats spent ~2x on Opus vs their 12 Haikus).** Every Opus call re-reads its
  whole context (~120k) at Opus price, so the cost is Opus *calls*, not Haiku count. Launch a wave as parallel
  foreground Agent calls in one message (one return for the wave, not one wake per Haiku), never post "waiting on
  N" turns, and hand any reading (screenshots, notes, merge output beyond COVERAGE.md) to a Haiku.
0. **Laptop first.** No more than 4 Haikus running at once, and one headless browser (camofox) at a time. Before each wave, check `uptime`: if load is over 16, or `sysctl vm.swapusage` shows more than 6 GB used, wait for the running ones to finish. (14 Oct: six runs at once pushed load to 58, filled swap, and froze SISO Code.)
1. Plan once, in a file. Every worker gets an objective, an output format, tool guidance and boundaries.
2. Scale the effort to the question: a fact gets 1 Haiku, a domain gets 10+.
3. Workers return paths and condensed findings, never raw pages.
4. One deduplicated queue of URLs and gaps. A slice that stops finding anything new stops.
5. A hard budget per run. Hitting it forces the write-up.
6. Verification is its own pass.
7. Every slice has a falsifier.
8. Reuse before search.
9. **If Shaan redirects mid-run** ("no more research"), stop the open slices and write from the rows you have
   (PEOPLE-GRAPH did this with PLATFORM.md).
10. **Budget:** a full run was about 30 Haiku runs at 60-100k each (about 2.4M Haiku tokens) with the Opus near 90k.
