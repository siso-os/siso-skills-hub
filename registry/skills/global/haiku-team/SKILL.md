---
name: haiku-team
description: Run Haiku teams through the Workflow tool. Each team is 3 to 12 Haiku scouts, one slice each, plus a Haiku owner who cross-checks and merges, so the calling Opus or Sonnet gets ONE return instead of a ping per Haiku. Use for any question, audit or map that needs more than five reads, and when Shaan says "throw some Haikus at it" or "Haiku team".
---

# Haiku team

Shaan, 20 Oct 2026: "a haiku owner who manages and owns the haikus that he spawns ... so Opus doesn't need to be pinged
50 times, because that would drastically cut down our costs". Then: "why do not all agents use this skill".

This skill is the Workflow form of `haiku-deep-dive`. The deep dive sends each scout with `Agent`, so every return
wakes the caller and lands in its context. A team runs inside one workflow: the scouts report to a Haiku owner, and only
the owner's table comes back.

## Steps

1. **Scope (you, at most two reads).** First `tail -20 ~/SISO_Workspace/.agents/teams/IMPROVE.jsonl`: the coaches' lessons from past teams; apply the ones that fit. Name the teams (for example SISO, HALO, Intent). For each team, write 3 to 12
   slices that don't overlap, each answerable within 80k context, with absolute paths, repos or tables to start from.
2. **Launch.** Invoking this skill is the opt-in to call Workflow:
   `Workflow({ name: 'haiku-team', args: { run: '<short-id>', context: '<shared facts and paths>', teams: [{ name, slices: ['<ask>' | { ask, type, effort }], owner: '<what the owner table must hold>' }] } })`.
   - `type` per slice: `scout` (laptop/GitHub reads, default), `researcher` (web), `runner` (runs a check), `librarian`, `checker`.
   - `effort` per slice: `low` for lookups, `medium` (default), `high` for tracing code. The owner always runs at `max`.
   - `mode`: `map` (default), `research` (web/GitHub; a checker refutes each worker's findings before the owner),
     `verify` (claims), `build` (each slice lists its `files` and `check`; overlapping files are refused). Set it:
     discovery and "find the best X" slices are `research`, not `map`.
   - Budgets: about 4/8/15 tool calls by effort. GitHub code search is 10 a minute for the whole team, so put code
     searches in one slice or few.
   - No worktrees: the whole team reads the caller's checkout.
   - Talking: scouts share a team board, `~/SISO_Workspace/.agents/teams/<run>-<team>.jsonl`, posting one-line notes to
     `all`, `owner` or a slice number (Shaan, 20 Oct: "they can message each other and talk if they really need to").
     The owner may send up to 4 follow-up slices back out once, then finishes.
   If the named workflow isn't installed, pass `haiku-team.js` (beside this file) as `scriptPath`.
   Teams run side by side; at most about 14 agents run at once and the rest queue.
3. **Tell Shaan in one line** what each team is looking at, then carry on with other work; the workflow wakes you.
4. **Synthesise** the owners' tables in his format: his next action first, 5 items or fewer, numbers not adjectives,
   decisions given as your pick.
5. **Act or build.** Teams are read-only. A fix goes to one Codex builder (`codex-run --sol`) with the owner's evidence.

## Cost

About 40 to 90k Haiku tokens per scout, at roughly 1/40 of the Opus price. Your own context grows by one return per
team, not one per scout. Never put Opus or Sonnet in a slice.

## Not for

- UI judgement or design picks: use `design-lab`.
- Writing code: teams only read.
- Codex seats: Codex has no Workflow tool, so use `haiku-deep-dive` with `codex exec` workers.
