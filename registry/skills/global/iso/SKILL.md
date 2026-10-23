---
name: iso
description: "Iso \u2014 Isolated Task Pipeline"

disable-model-invocation: true
argument-hint: "<task description>"
---

# Iso — Isolated Task Pipeline

SISO multi-agent SOP for non-trivial code work, run end-to-end in an isolated git worktree. Parallel Haiku recon → main-session synthesis → Haiku workers → Haiku verifiers, returns a ready-to-merge branch.

## When to use

- 3+ phase build, refactor, or feature
- Multi-file changes that benefit from parallel execution
- Anything that needs research → think → build → verify before landing
- NOT for one-off fixes, single-file edits, or quick lookups (just do it inline)

## When NOT to use

- Single-file edits → just edit
- Pure research / reading → use Explore agent or `/multisearch`
- Tasks with unclear goals → `/superpowers:brainstorming` first, then iso

## The 5-Phase Loop

```
0. SETUP    → detect most-updated branch, create worktree, slug the task
1. RECON    → 3-5 parallel Haiku researchers (ground truth + 1 wildcard for adjacent context)
2. SYNTH    → main session (Opus-grade) reads recon, optionally fans out follow-up Haikus,
              decides approach, writes phase plan
3. BUILD    → parallel Haiku workers, zero-overlap file scopes, return [STATUS: AWAITING QA] only
4. VERIFY   → parallel Haiku verifiers (typecheck, build, smoke test, code review)
              PASS → land · FAIL → write fixes file → relaunch worker (max 2 retries)
5. LAND     → commit, push branch, return merge command to Shaan (do NOT auto-merge)
```

## Phase 0: Setup

```bash
PROJECT_ROOT=$(pwd)
TASK_SLUG="<short-kebab-from-task>"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BRANCH_NAME="iso/${TASK_SLUG}-${TIMESTAMP}"

# Detect most-updated branch (local dev usually wins)
git fetch origin dev --quiet
LOCAL_AHEAD=$(git rev-list --count origin/dev..dev 2>/dev/null || echo 0)
REMOTE_AHEAD=$(git rev-list --count dev..origin/dev 2>/dev/null || echo 0)
if [ "$LOCAL_AHEAD" -ge "$REMOTE_AHEAD" ]; then BASE=dev; else BASE=origin/dev; fi

# Create worktree manually (more reliable than isolation:worktree frontmatter — see lessons)
WORKTREE_PATH="${PROJECT_ROOT}/.claude/worktrees/${TASK_SLUG}-${TIMESTAMP}"
git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE"
```

State files live at `${PROJECT_ROOT}/.claude/iso-tasks/${TASK_SLUG}/`:
- `00-task.md` — original ask
- `01-recon-*.md` — one per researcher
- `02-plan.md` — main-session synthesis output
- `03-workers/` — worker assignments
- `04-feedback/` — verifier reports
- `05-final.md` — what shipped

## Phase 1: Recon (parallel Haiku)

Spawn 3-5 Haiku agents IN A SINGLE MESSAGE (parallel tool calls). Each gets a focused angle:

| Agent | Job |
|-------|-----|
| ground-truth | What does the relevant code currently do? Files, functions, data flow. |
| dependencies | What calls / is called by the target area? Blast radius. |
| patterns | How are similar features built in this repo? Conventions to match. |
| data-model | Schema, types, Convex queries/mutations involved. |
| wildcard | Adjacent context — anything Shaan might be implicitly assuming. |

Each agent returns a markdown brief (~200-400 words) saved to `01-recon-<angle>.md`. **Do not let them dump code into chat — they write to disk and return a one-paragraph summary.**

## Phase 2: Synthesis (main session)

Read all recon briefs. Decide:

1. **Are there gaps?** If yes, spawn 1-2 follow-up Haikus to fill them. Don't fly blind, don't over-research.
2. **Approach** — first-principles: goals → constraints → facts → tradeoffs → decision.
3. **Phase plan** — break the build into N independent slices with **zero file overlap**. Write to `02-plan.md`:

```markdown
# Phase Plan
## Slice 1: <name>
- Files: path/a.ts, path/b.ts
- Goal: <one sentence>
- Acceptance: <verifiable check>
## Slice 2: <name>
...
```

If the task is genuinely sequential (slice 2 needs slice 1's output), say so and run slices serially.

## Phase 3: Build (parallel Haiku workers)

Spawn one Haiku per slice IN A SINGLE MESSAGE. Each worker:
- Works in `$WORKTREE_PATH` (pass absolute path)
- Edits ONLY its assigned files
- Returns `[STATUS: AWAITING QA] <one-line summary>` — no code in chat
- Commits its slice with a clear message

**Race condition rule:** if two slices touch the same file, that's a planning bug — fix the plan, don't ship overlapping work.

## Phase 4: Verify (parallel Haiku verifiers)

Spawn verifiers IN A SINGLE MESSAGE. Standard set:

| Verifier | Job |
|----------|-----|
| typecheck | `pnpm typecheck` (or repo equivalent) — must pass |
| build | `pnpm build` — must pass |
| smoke | Run the actual feature — does it work end-to-end? |
| review | Read the diff. Spot dumb code, missing edge cases, broken patterns. |
| convex-sync | If `convex/*.ts` touched: `npx convex dev --once`, confirm `_generated/` updated |

Each returns `[STATUS: PASSED]` or `[STATUS: REJECTED]` + writes details to `04-feedback/<verifier>.md`.

If any reject: read feedback, relaunch the responsible worker with the feedback path. Max 2 retry loops, then escalate to Shaan with the blocker.

## Phase 5: Land

Once all verifiers pass:

```bash
cd "$WORKTREE_PATH"
git push -u origin "$BRANCH_NAME"
```

Write `05-final.md` summary (1 paragraph what shipped, list of files changed, verifier outcomes).

**Do NOT auto-merge.** Tell Shaan:

> Iso branch ready: `iso/<slug>-<ts>`. To land:
> - Fast merge: `cd <repo> && git merge iso/<slug>-<ts> && git push origin dev`
> - Or PR: `gh pr create --base dev --head iso/<slug>-<ts>`
>
> Worktree at: `<path>` (run `git worktree remove <path>` after merge)

## Hard rules

- **Branch detection:** local `dev` if ahead of `origin/dev`, else `origin/dev`. Override only if Shaan specifies.
- **Race condition prevention:** zero file overlap between worker slices.
- **Context protection:** workers + verifiers return one-line status only. Details to disk.
- **Recon is parallel:** 3-5 researchers in a single tool-call batch, not sequential.
- **No auto-merge:** Shaan owns the merge decision (`feedback_dev_only_not_main.md`).
- **Worktree creation is manual:** `git worktree add -b ... dev` — NOT `isolation:worktree` frontmatter (see `feedback_worktree_stale_base.md`).
- **No em-dashes in JS/TS string literals** (pre-commit hook blocks them).
- **Convex sync after schema/skill changes:** `npx convex dev --once`, stage `_generated/`.

## Model routing

- Haiku → researchers, workers, verifiers (auto-routes to MiniMax, via the Agent tool)
- Main session (Opus-grade) → synthesis, orchestration. Sonnet sub-agents are BANNED (Shaan 2026-06-11) — never spawn one.
- Opus → only if task genuinely needs 1M-token thinking (rare)
- Codex → optional adversarial review on completion via `/codex:rescue`

## Slash invocation

`/iso <task description>` — e.g. `/iso add a refill saved-to-pipeline button to motion control step 0`

## State directory layout

```
${PROJECT_ROOT}/.claude/iso-tasks/<slug>/
├── 00-task.md
├── 01-recon-ground-truth.md
├── 01-recon-dependencies.md
├── 01-recon-patterns.md
├── 01-recon-data-model.md
├── 01-recon-wildcard.md
├── 02-plan.md
├── 03-workers/
│   ├── slice-1.md
│   └── slice-2.md
├── 04-feedback/
│   ├── typecheck.md
│   ├── build.md
│   ├── smoke.md
│   └── review.md
└── 05-final.md
```

## Failure modes

- **Recon returns contradictions** → spawn one tiebreaker Haiku, decide, log decision in `02-plan.md`.
- **Verifier loop won't converge** → after 2 retries, stop. Write `05-final.md` with `[STATUS: BLOCKED]` and surface to Shaan with concrete next options.
- **Worktree base diverged mid-flight** → don't auto-rebase. Surface and ask.
- **Worker dumps code into chat** → that's a worker prompt failure. Fix the prompt template, don't accept the output.
