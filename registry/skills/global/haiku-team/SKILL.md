---
name: haiku-team
description: Use when research, audits, maps or independent build jobs need a Haiku team or parallel builders; split bounded slices and integrate one checked return.
---

# Haiku team

Shaan, 20 Oct 2026: "a haiku owner who manages and owns the haikus that he spawns ... so Opus doesn't need to be pinged
50 times, because that would drastically cut down our costs". Then: "why do not all agents use this skill".

This skill is the Workflow form of `haiku-deep-dive`. The deep dive sends each scout with `Agent`, so every return
wakes the caller and lands in its context. A team runs inside one workflow: the scouts report to a Haiku owner, and only
the owner's table comes back.

## Steps

1. **Scope (you, at most two reads).** First `tail -20 ~/SISO_Workspace/.agents/teams/IMPROVE.jsonl 2>/dev/null` (skip if the file is absent): the coaches' lessons from past teams; apply the ones that fit. **Corpus first:** run `recall <topic> -n 3` or query the Great Library, then inspect relevant `library/research`, `agents/harness/reports` and `eco-fp/` reviews. Put reused sources and the precise missing questions in the shared context; research only those gaps. Unavailable corpus coverage stays explicit. Name the teams (for example SISO, HALO, Intent). For each team, write 3 to 12
   slices that don't overlap, each answerable within 80k context, with absolute paths, repos or tables to start from.
2. **Launch.** Invoking this skill is the opt-in to call Workflow:
   `Workflow({ name: 'haiku-team', args: { run: '<short-id>', context: '<shared facts and paths>', teams: [{ name, slices: ['<ask>' | { ask, type, effort }], owner: '<what the owner table must hold>' }] } })`.
   - `type` per slice: `scout` (laptop/GitHub reads, default), `researcher` (web), `runner` (runs a check), `librarian`, `checker`.
   - `effort` per slice: `low` for lookups, `medium` (default), `high` for tracing code. The owner runs at `medium`
     (`ownerEffort` to change it): at `max` it took 7 to 19 minutes of every 20-minute run (21 Oct timings).
   - Speed (Shaan, 21 Oct: "most of the agents are done ... not waiting on those last two agents the whole time"): every
     slice is its own chain (worker, retry, refute), and the owner starts when 75% are in (`quorum`) plus 45 s (`grace`).
     A slice still running reaches the table as `pending`, then comes back as `late` within 60 s (`lateWait`) or is named
     in `dropped`. Follow-ups run once and come back raw as `followup_results`; there is no second owner pass.
   - Ledger: every worker appends its own result to the team board before it returns, so you can read any slice's answer
     from the board while the team is still running, and a dropped slice's notes survive. For teams you want as each
     finishes, launch one Workflow per team: each one wakes you on its own.
   - `mode`: `map` (default), `research` (web/GitHub; a checker refutes each worker's findings before the owner),
     `verify` (claims), `build` (each slice lists its `files` and `check`; overlapping files are refused). Set it:
     discovery and "find the best X" slices are `research`, not `map`.
   - Budgets: about 4/8/15 tool calls by effort. GitHub code search is 10 a minute for the whole team, so put code
     searches in one slice or few.
   - No worktrees: the whole team reads the caller's checkout.
   - Talking: scouts share a team board, `~/SISO_Workspace/.agents/teams/<run>-<team>.jsonl`, posting one-line notes to
     `all`, `owner` or a slice number (Shaan, 20 Oct: "they can message each other and talk if they really need to").
     The owner may send up to 4 follow-up slices back out once; their results come back beside its table.
   If the named workflow isn't installed, pass `haiku-team.js` (beside this file) as `scriptPath`.
   Teams run side by side; at most about 14 agents run at once and the rest queue.
   Each team emits `team-start` and `team-end` to `~/SISO_Workspace/.agents/events.jsonl` and its board through
   two tiny event runners. Pass `task: 't-NNNN'` at run or team level to also append the task-side events.
   Run with the installed `a0` command. A missing event is a workflow failure, never a silent success.
   If the entire Workflow is forcibly cancelled, its `finally` cannot run: the caller records `team-end`
   with status `blocked` using `a0 team-event '<JSON with kind, status, at, who, task, board>'`.
3. **Tell Shaan in one line** what each team is looking at, then carry on with other work; the workflow wakes you.
4. **Synthesise** the owners' tables in his format: his next action first, 5 items or fewer, numbers not adjectives,
   decisions given as your pick.
5. **Act or build.** Teams are read-only. A fix goes to one Codex builder (`codex-run --sol`) with the owner's evidence.

## Cost

About 40 to 90k Haiku tokens per scout, at roughly 1/40 of the Opus price. Your own context grows by one return per
team, not one per scout. Never put Opus or Sonnet in a slice.

## Not for

- UI judgement or design picks: use `siso-ui` and show rendered directions with `show-page`.
- Default implementation lane: `codex-run`. Workflow build mode requires explicit disjoint file ownership and checks.
- Codex seats: use `codex-run` for bounded workers and `research-fleet` for research breadth when Workflow is unavailable.
