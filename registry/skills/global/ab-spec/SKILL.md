---
name: ab-spec
description: Write an Agent Base build spec a builder can follow without asking: pack his words, surface history, ADRs and UI principles, code map, live data shapes, related work and ui-pick prior art, then write it from the template and fail it through speccheck before filing the ask. Use before handing any Agent Base build to an Astra or a worker.
---

# ab-spec

Shaan, 8 Oct, on thin specs: "you don't really give them anything to go off". A spec is not filed until it passes the check.
The tools live in the Agent Base repo at `ui-hub/_astra/spec/` (README there); run them from a worktree of that repo, never
build in the main checkout.

## Steps

1. **Words.** Put his request, verbatim with date and channel, in a file (`/tmp/<slug>-words.md`, quoted heredoc `<<'EOF'`).
2. **Pack.** `python3 ui-hub/_astra/spec/specpack.py ~/SISO_Workspace/_data/ab-zero/specs/<slug> --surface <ui-hub id> [--surface ...] --kw <words> --words /tmp/<slug>-words.md [--code <file>] [--api /api/...] [--task t-NNNN] [--need "<what ui-pick should look for>"]`.
   Surface ids are the `ui-hub/` folder names. Give 3-8 keywords; add `--code` for every file you expect to change.
3. **Read the pack, then look.** Read `PACK.md` end to end. Open the captures in `shots.txt` with Read (they are images).
   If an API matters, fetch one real response yourself to confirm the field you will rely on (the pack gives shapes only).
   Note the numbers that make the outcome concrete (counts, minutes, how many are missing).
4. **Write** `SPEC.md` in the same folder from `ui-hub/_astra/spec/SPEC-TEMPLATE.md`. Rules:
   - Outcome in his minutes, with the number that should move.
   - His words verbatim, newest first, each with a date or a file:line; say which wins on conflict.
   - Every on-screen number has a data-contract row, including what shows when it is missing (never invent data).
   - Reuse before new: exact imports with paths; check each with `git grep` so the path exists.
   - Decisions cite a principle (0001-0015 via `bin/uihub brief agent-base`), docs/SPEC.md §2, or a quote.
   - Conflicts: name the branches in flight on the same files (pack F) and what to wait for.
   - Slices that each land alone.
5. **Check.** `python3 ui-hub/_astra/spec/speccheck.py <SPEC.md>` until PASS. A PASS is the floor, not the goal: reread it as
   the builder and fix anything you would have to ask about.
6. **File.** New: `bin/ask new --project agent-base --owner AB-ASTRA --his "<words>" --touches <area> --spec <SPEC.md> "<title>"`.
   Existing ask: `bin/a0-task set t-NNNN links.spec=<SPEC.md> --by AB-ZERO`. Both from `SISO_Agents/agent-zero/siso-agent-zero`.

## Boundaries

Packs read live data shapes, never values, and skip streams; they quote his words, so they stay in `_data/`, not git.
Never print secrets into a pack. No Claude sub-agents for specs; you write it.
