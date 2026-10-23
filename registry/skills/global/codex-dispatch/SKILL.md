---
name: codex-dispatch
description: "codex-dispatch"

allowed-tools: [Bash]
status: retired
---

# codex-dispatch

**Routing first: herdr panes are the doctrine for Codex work** (oracle CLAUDE.md: "never fire-and-forget dispatch" for supervised work) — load `herdr`/`codex-companion`/`orchestrate` for anything you'd want to watch, steer, or that runs multi-step. This skill is the bounded exception: headless Codex workers for **batch code** tasks (fix, codegen, refactor, review) that are small, independent, and gated by their handoff files. Runs `codex exec` on Codex's ChatGPT-Pro auth — **$0 to the Claude plan** — with NO MCP/hooks (fast cold start). Unlike orchestrate's `spawn-worker.sh`, this consumes **no herdr pane** and is not bound by `MAX_LIVE` — it's true fire-and-forget. Unlike `async-dispatch` (Minimax research/writing), this is for code that must compile and pass tests.

## When to use which lane
- **codex-dispatch (this)** — headless, no pane, background. Best for a batch of small/medium verifiable fixes you don't need to watch live. Gate on the handoff file.
- **orchestrate `spawn-worker.sh`** — a Codex worker living in a watchable herdr pane, heartbeat + watchdog + rehydrate. Use for long multi-step goal-mode work you want to supervise.
- **async-dispatch** — Minimax, for research/writing/audits, not code.

## One command

```bash
# from the repo root you want Codex to work in
codex-dispatch <slug> <prompt-file-or-inline> [--deep]
```

- `<slug>` — short id; handoff lands at `.orchestrate/handoffs/<slug>.result.html`, log at `/tmp/codex-<slug>.log`.
- prompt — a file path OR an inline string. The skill APPENDS the handoff contract automatically, so your prompt is just the task + verification steps.
- `--deep` — use `gpt-5.5` xhigh reasoning (correctness-critical bugs/architecture). Default is `gpt-5.5` medium (mechanical/quick).

Parallel batch:
```bash
codex-dispatch sw009 /tmp/p1.txt --deep &
codex-dispatch sw010 /tmp/p2.txt &
wait   # or just poll handoffs; they're independent
```

## The handoff contract (auto-appended — your prompt need not repeat it)
Every dispatched agent is told, as its LAST step, to write `.orchestrate/handoffs/<slug>.result.html` containing:
- a line that is exactly `PASS` or `FAIL`
- one-sentence outcome
- verification evidence (tsc/test results)
- diff summary (files + line ranges)

**Gate on the handoff, never on process exit.** `codex exec` exiting 0 ≠ task done correctly (orchestrate Law 3 applies here too).

**READ-ONLY sweeps (adversary/recon/cartography) need a CONTENT gate, not the code gate.** The auto-appended contract asks for tsc/vitest evidence — but a sweep that writes only a report and changes ZERO src will "FAIL" that gate whenever the suite is already RED on main (a pre-existing-red suite, e.g. a known broken test). That FAIL is SPURIOUS — the sweep didn't break anything. So for a read-only dispatch: tell the worker its PASS condition is **`git diff --stat` shows 0 src changes AND the deliverable was written** — and to treat a red tsc/vitest as PASS-on-content in that case (state "suite was already red on main, sweep changed no code"). When you read the handoff, a FAIL whose only evidence is a red suite + 0 src changes = PASS. Don't propagate it as a real failure (it gets mis-read as "the sweep failed" — it didn't).

```bash
codex-dispatch-status            # lists every handoff + its PASS/FAIL line
codex-dispatch-status <slug>     # prints one handoff
```

## Writing the task prompt (what YOU supply)
A good code-task prompt has exactly four parts:
1. **Context** — repo + the file:line of the bug/target.
2. **Required change** — precise, surgical; say what NOT to touch.
3. **Verify** — the exact commands (`npx tsc --noEmit`, `npx vitest run <file>`) + at least one adversarial case.
4. **Constraints** — don't touch the running app / OBS / src/main beyond necessity; surgical only.

Do NOT write the handoff instructions — the wrapper appends them.

## Rules
- **Cost:** this is the cheap lane — code cognition belongs here, not on Opus/Claude sub-agents. (See memory: cost-lens-on-own-orchestration.)
- **Fast adversarial second-opinion (ex-`run-spark`):** for a quick refuter pass against `gpt-5.3-codex-spark`, run `_archive/run-spark/scripts/run-spark.sh "<prompt>" [out-file]` — it sets the `-c model_reasoning_summary="none"` override spark needs. (The old `run-spark` skill was folded here 2026-07-02; the script still works.)
- **No pane, but still gated:** poll handoffs; a missing/FAIL handoff means it died or failed — read `/tmp/codex-<slug>.log` (bounded) to triage.
- **One task per dispatch.** Decompose multi-bug work into N dispatches so each has its own handoff + verdict.
- **Don't dispatch live-stream-touching work here unsupervised** — anything that restarts OBS/managed-browser must be coordinated, not fire-and-forget.

## Files
| Path | Role |
|---|---|
| `SKILL.md` | this |
| `bin/codex-dispatch` | the dispatch wrapper (appends handoff contract, launches headless, logs) |
| `bin/codex-dispatch-status` | poll handoffs for PASS/FAIL |
