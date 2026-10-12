---
name: haiku-leverage
description: How an Opus seat uses Haiku 5.5 sub-agents as its arms and legs, so it gets many times more reading, searching and checking per token and keeps its own context for thinking and building. Use whenever a task needs 3+ reads or searches, a big corpus (transcripts, logs, many files), several independent questions, or a claim checked before reporting.
---

# Haiku leverage

Shaan, 13 Oct: "opus should be the one doing the building ... and all the heavy reasoning work but ... haiku sub-agents go
gather context for that main opus like arms and legs". Why: every Opus call re-reads its whole conversation; Opus fetching
for itself was 67-75% of cost (HARNESS, 12-13 Oct). Haiku 5.5 costs ~1/40 per token, and what it reads never enters your
context: you get its 300-word answer, not the 50k it read. So Haiku multiplies what you can see; you keep the judgement.

## The team (Agent tool, `subagent_type`)
`siso:scout` code and files (file:line) · `siso:librarian` estate, HANDOFFs, memory, transcripts · `siso:researcher` web
(URL per claim) · `siso:runner` builds and tests (pass/fail + the failures) · `siso:checker` one claim against evidence ·
`siso:editor` a decided, mechanical edit (returns the diff). Anything else: `model: haiku`.

## Patterns
1. **Ask, don't read.** Before your 3rd read or search in a row, stop and send the question to a scout instead.
2. **Fan out in one message.** Independent questions = several Agent calls in ONE message (they run in parallel, you
   wake once). Run them in the background when you have other work.
3. **Map-reduce a big corpus.** Script the extraction first (python/jq to plain text, drop tool output, split into
   ~120k-char chunks in /tmp), one Haiku per chunk with the same question, then you merge. (13 Oct: a whole agent's
   conversation, 86 side sessions and its research folder read by 3 Haiku agents for ~$0.15 of tokens.)
4. **Hypotheses in parallel.** Debugging with N suspects: N scouts, each answers "is it X? yes/no + file:line".
5. **Inventory, then judge.** Haiku lists, classifies, tabulates or drafts options; you decide from the table.
6. **Check before you claim.** `runner` reruns the check, `checker` tests a claim against the diff or output; you report.

## Brief it well (most bad returns are bad briefs)
- One question, where to look (exact paths), what NOT to do, the return shape and a word cap ("under 300 words, a table,
  file:line, no raw output").
- Say the context it lacks in one line (who Shaan is, what the numbers mean, the time zone).
- Long or many files: "stop and report before ~150k context".

## Keep for yourself
Design, architecture, building the code, hard judgement, anything written to Shaan, and the final edit. Don't re-read
what Haiku already read: work from its return, and spot-check one claim if it matters (cite its file:line).
Haiku gets things wrong on judgement (counts as facts, inferences as findings): ask it to mark "not verified".

## When Claude is low
DeepSeek V4.1 builds to a clear spec for near nothing: `timeout 580 omp-worker -C <dir> "<task + the check>"` (or the
`deepseek-worker` agent). You spec it, read its diff and rerun the check yourself.

## Proof it works
`python3 ~/SISO_Workspace/SISO_Agents/siso-harness-lab/scripts/token-where.py --hours 24`: "Opus fetch loops" share
falls (75% on 12 Oct, 53% on 13 Oct 04:06) and $ per Shaan request falls ($3.90 baseline).
