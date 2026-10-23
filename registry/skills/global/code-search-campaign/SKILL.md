---
name: code-search-campaign
description: "Code-Search Campaign (the playbook)"

disable-model-invocation: true
version: "2.0"
tags: [research, code-search, sourcegraph, github, topics, oss, playbook, campaign]
user-invocable: true
allowed-tools: [Bash, Workflow, Agent]
---

# Code-Search Campaign (the playbook)

Searching GitHub + Sourcegraph for existing code is one of the **highest-ROI research
moves** — it stops you rebuilding what exists and surfaces patterns to steal. This skill
is the *methodology* (a campaign), not a single query. For one-off raw queries see
`reference/sourcegraph.md`.

**The reward function is COVERAGE of the intent space — not speed-to-a-clean-table.** A
campaign that returns 12 repos fast but missed the GitHub topic graph has failed, even if
the table looks tidy. Wide funnel first; narrow only at the very end.

## Raw Sourcegraph / NPM queries → `reference/sourcegraph.md`

Single raw Sourcegraph or NPM registry call (not a campaign)? Read
`reference/sourcegraph.md` (absorbed the `sourcegraph` skill 2026-07-03). It carries the
wrapper script, full query syntax, known limits/gotchas, the GraphQL fallback, NPM package
discovery, and the Pi ecosystem seed queries — the *mechanics* layer this campaign
sits on top of.

## The method (reason → sweep wide → loop → judge last)

1. **Reason about intent FIRST.** Before any query, decompose the end-user's *goal* into
   **artifact classes** — the genuinely different KINDS of thing they'd want: runnable
   tools, prompt libraries, frameworks/methodology, datasets/swipe-files, infra/SDK,
   discussion/awesome-lists. Derive queries *from the classes*, not from rewording the
   topic. (This is the fix for "didn't reason about what we were trying to do" — keyword
   rewordings all return the same repos; artifact classes span the field.)
2. **Three lanes, every class:**
   - **Lane A — Sourcegraph** (code evidence, no rate limit) via the `sg-search.sh` wrapper.
   - **Lane B — GitHub keyword** (`gh search repos --sort stars`) for star/real-repo signal.
   - **Lane C — GitHub TOPICS** — the curated graph. `gh search repos "topic:<slug>"` pulls a
     whole hand-curated repo list keyword search never surfaces. Discover more slugs with
     `gh api search/topics`. **This lane is where the broad view comes from — never skip it.**
3. **Loop-until-dry accumulator.** Run multiple rounds, accumulate every hit into ONE
   deduped list, tell each round which repos are already seen so it finds *different* ones,
   and stop when a round adds nothing new. (standard = 2 rounds; deep = up to 5, stop after
   2 dry rounds.) One pass = narrow; rounds = wide.
4. **Judge LAST.** Only after the pile is wide: rank → tier (deep-read/note/skip, spread
   across classes) → deep-read top repos' real source → adopt-library / steal-pattern /
   study-only verdict + where OSS beats what we have.

## Prereqs (already set up on this laptop)
- **Sourcegraph wrapper** (the real, tested mechanic — GraphQL, works authed or not):
  `~/SISO_Workspace/SISO_Agency/apps/isso-dashboard/docs/cam-stream/scripts/sg-search.sh`
  Usage: `bash sg-search.sh code "<query>" --limit 20` / `... repo "<query>"` / `... symbol "<name>"`.
  `SOURCEGRAPH_TOKEN` in env gives higher limits (optional). *(The old `src` CLI path was
  unreliable — use this wrapper.)*
- `gh` CLI authed. Verify: `gh auth status`. Topics need the mercy preview header:
  `gh api 'search/topics?q=<term>' -H 'Accept: application/vnd.github.mercy-preview+json'`.

## Run it (the workflow IS the default path)

The method above is encoded in the `code-search-campaign` **workflow** — when the user asks
to "search GitHub / Sourcegraph for what exists", run the workflow rather than hand-rolling
ad-hoc `Agent` calls. Hand-rolling is what makes it shallow.

```
Workflow({ name: "code-search-campaign", args: {
  topic:   "<what you're researching>",
  goal:    "<what the end-user actually wants to DO with this>",   // drives intent decomposition
  context: "<what we already have / constraints — keeps deep-read honest about novelty>",
  depth:   "standard"          // "standard" (default, ~2 rounds) | "deep" (loop-until-dry)
  // deep_read_max: 10         // optional
}})
```
Requires Workflow opt-in (the "workflow" keyword, ultracode, or an explicit ask). Returns
`{topic, goal, depth, classes, candidates_found, deep_read, verdict:{adopt_as_library,
steal_patterns, study_only, where_oss_beats_ours}, ideas, notable_repos}`.

**No workflow opt-in?** Still run the *method* manually: do the Reason step yourself, then
dispatch parallel `Agent` (Explore) scouts — one per artifact class — each running all three
lanes, accumulate across at least two rounds, then rank/deep-read. Don't stop at one sweep.

## Pipe results into the brain (so research compounds, isn't a one-off)
After the campaign returns, persist the verdict + interesting repos:
```
python3 ~/SISO_Workspace/SISO_Agent_Base/extensions/braind/siso-brain memory-write \
  --agent code-search --type reference --tier semantic --confidence 0.7 \
  --content "<topic>: adopt=<repos>; steal=<patterns>; study=<repos>; beats-ours=<...>"
```

## When NOT to use
- You know the exact repo/file already → just use `reference/sourcegraph.md`'s wrapper or `gh` directly.
- A single fact lookup → one `sg-search.sh code` query, no campaign.
