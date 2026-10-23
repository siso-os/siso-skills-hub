---
name: forge-skill
description: "forge-skill \u2014 the skill-improvement loop"

disable-model-invocation: true
---

# forge-skill — the skill-improvement loop

An AI asked "improve this" tweaks once and stops. This is the machinery for **iterating to great**: a closed loop that keeps finding gaps (against both the OSS field and a perfect-version ceiling) and closing them, round after round, until there's genuinely nothing confirmed left to fix. It is **generic** — point it at any skill or subsystem. It is a *composition*, not new capability: every stage is an existing skill, wired into a cycle and tracked as a task.

The reason it works where one-shot review fails: the **adversary/gaslight** stage flips reviewers out of confirm-mode (default-refuted, "prove the gap below perfect"), so the loop cannot rubber-stamp; and the **/task** stage gives each round lineage, so round 3 inherits round 1+2's learnings instead of re-deriving.

## The loop (one round)

```
ROUND N (target = a skill dir or subsystem path):
  0. ORIENT  — read the target's SKILL.md + its definition-of-done. Resume the forge /task if one exists.
  1. MINE    — code-search-campaign method (Haiku/MiniMax fan-out): what's the SOTA for THIS skill's JOB?
               reason → artifact-classes → 3-lane sweep (Sourcegraph + GH keyword + GH topics) → loop-until-dry
               → adopt/steal/study verdict. New external ideas enter the loop here (no navel-gazing).
  2. ATTACK  — adversary GENERATIVE sweep (Codex gpt-5.5), multi-lens (architecture + not-magical + ai-legibility,
               + bugs/efficiency if the skill has code): "perfect version exists, measure the gap."
               FIND aggressive → escalate wording up the ladder on empty → N default-refuted CONFIRMers (majority).
               → a CONFIRMED, ranked improvement pool.
  3. SELECT  — Opus only. Merge MINE steals + ATTACK gaps. Pick the highest-leverage subset that fits the skill's
               SCOPE (improve-agent-system: smallest high-leverage change, no broad-rewrite, no scope creep).
               Drop anything gameable, already-present, or wrong-layer (the forge self-verify gate, below).
  4. APPLY   — make the scoped edits. improve-agent-system guardrails: keep edits surgical; preserve existing
               behavior unless replacing with verified-equivalent; add/extend a smoke for what changed.
  5. REVIEW  — adversary CRITIQUE on the actual diff + async-codex-review (Codex gpt-5.5). Must come back
               empty-with-evidence OR all-findings-fixed. A diff that fails review does NOT count as a round.
  6. VERIFY  — run the skill's OWN definition-of-done / smoke (observe, don't trust). For a skill with a blind
               QA harness, re-run it. For a behavior-changing skill, use the cold-worker protocol in
               `references/blind-forward-test.md`. BLOCKED ≠ PASS.
  7. RECORD  — `task log` what changed + `task learn` the distilled round findings (lineage → next round warm).
               Bump the skill's changelog/version if it has one (improve-agent-system step 5).

LOOP until:  the ATTACK stage returns empty-with-evidence at the GOD rung (the adversary's own stopping rule)
             OR a round yields < MIN_GAIN confirmed-and-applied improvements (diminishing returns; default 2)
             OR ROUND == MAX_ROUNDS (default 4 — a backstop, not a target).
```

## The forge self-verify gate (SELECT stage — non-negotiable)
Before APPLY, every selected improvement must pass, or it's dropped (borrowed from the Forge remediation engine's `self_verify`):
- **Grounded?** Points at a real line/behavior in the target, not a vibe.
- **Not already present?** Re-read the target; cold reviewers "discover" things that exist.
- **Right layer?** Belongs in THIS skill, not its caller / a different skill / the harness.
- **Not gameable?** Improves the skill's real job, not a metric. ("adds a section" is not improvement.)

## Engines / routing (compute discipline)
- **MINE fan-out, recon, the FIND breadth** → **Haiku → MiniMax** (bulk, stateless, cheap). Never long-loop MiniMax.
- **Gaslight engine (FIND + CONFIRM) and diff REVIEW** → **Codex gpt-5.5 xhigh** (`adversary`, `async-codex-review`).
- **SELECT + arbitration + the loop control** → **Opus** (taste/judgment only; keep it thin).
- The per-round mining+attack is the `workflow/forge-round.js` Workflow (one level: it fans Haiku miners and Codex
  finders/confirmers itself — it does NOT nest `adversary-sweep`, which would break the 1-level nesting rule).
  The main session (Opus) drives ORIENT/SELECT/APPLY/VERIFY/RECORD and loops the rounds.

## How to invoke
```
# Full-auto, default target resolution (skill name → ~/.claude/skills/<name> → source dir):
forge-skill <skill-name>            # e.g. forge-skill task
# Or point at any subsystem path. Options: --rounds N --min-gain K --lenses "architecture,not-magical,bugs"

# Under the hood, per round, the orchestrator runs:
Workflow: workflow/forge-round.js
  args: { target: "<skill-dir>", round: N, seenIdeas: [...], lenses: [...], minGain: 2 }
  → returns { mined:[steals], pool:[confirmed gaps], reportPath, exhausted: bool, gain: N }
# NOTE: the Workflow JS sandbox has NO filesystem access. forge-round reads the target SKILL.md +
# the adversary premises bank via an `agent()` (which has Read), OR you can pass them inline as
# args.targetBody / args.bankJson. The report + .forge/round-N.html are written by an agent (has Write).
# then SELECTs (Opus), APPLYs (edits), REVIEWs (adversary CRITIQUE + codex), VERIFYs (skill DoD), RECORDs (task).
```

## Definition of done (the loop is working only when this holds)
On a skill with a known weakness, round 1 surfaces it (mined OR gaslit), SELECT keeps only grounded non-gameable fixes, APPLY+REVIEW lands a clean diff, VERIFY re-passes the skill's own DoD, and the loop TERMINATES on its own — either god-rung-empty-with-evidence or diminishing returns — without broad-rewriting the skill or inventing busywork. Each round's learnings are queryable on the forge task.

## Files
| Path | Role |
|---|---|
| `SKILL.md` | this — the loop protocol |
| `workflow/forge-round.js` | one round's MINE + gaslight ATTACK (Haiku miners + Codex find/confirm), self-contained one level |
| `scripts/forge.sh` | thin driver: resolves target, drives rounds, prints the round summary |

---

## Changing SISO_Agent_Base (absorbed improve-agent-system 2026-07-03)

Use this workflow for SISO/Pi agent-system improvements (router/status/context/lifecycle, native renderer patches, profile skills, release/version/changelog files).

### Workflow

1. **Establish the active surface:** `type -a siso`; `siso version`; `siso --version`; `siso doctor`. Read `VERSION`, `CHANGELOG.md`, `releases/latest.json`, and the files likely to own the behavior.
2. **Identify the smallest high-leverage issue:** prefer root-cause fixes over UI-only symptoms; check whether the active install under `~/.siso-agent-base` differs from the source repo; do not touch friend/customer runtimes unless explicitly asked.
3. **Make the change in the source package first:** keep edits scoped; add/update a smoke/test that fails before the fix when practical; update active installed files only after source verification passes.
4. **Verify:** run the focused smoke/test; run package smoke scripts relevant to the touched area; run `siso doctor` after installing locally; for renderer changes, verify patch idempence (re-run the patch and expect `changed=0`).
5. **Version and record:** bump `VERSION`, `package.json`, `package-lock.json`, and `releases/latest.json`; add a dated `CHANGELOG.md` entry with user-visible behavior, guardrails/tests, and migration notes if any; keep the changelog factual, mention paths only when useful.
6. **Close with:** current active `siso version`; verification commands that passed; files changed; any next high-leverage issue discovered but not fixed.

### Guardrails (anti-broad-rewrite)

- Do not broad-rewrite the agent system.
- Do not remove existing SISO polish, router, context, lifecycle, status, or Bifrost behavior unless replacing it with verified equivalent behavior.
- Do not claim the runtime changed until the active local install has been updated and `siso doctor` passes.
- Avoid leaking secrets, raw provider payloads, or large child logs into prompts, changelogs, or final responses.

## ~/.claude ops ledger (absorbed claude-ops 2026-07-03)

Process discipline for working on `~/.claude/`. Activate when doing AI Factory maintenance (editing CLAUDE.md, building skills, cleaning configs, updating the roadmap).

### After Every Meaningful Step

1. **Update `~/.claude/ops/changelog.json`** — new entry at TOP: `{date, title, what, why, files_touched[], result, tags[]}`.
2. **Update `~/.claude/ops/roadmap.json`** — move items: `next` → `now` → `done`.
3. **Open viewer:** `open ~/.claude/ops/index.html`.

### Before Structural Change

1. Read `roadmap.json` § `design_principles`.
2. If changing CLAUDE.md design, read `~/.claude/research/claude-md/00_SYNTHESIS.md`.

### Apply the Rules

- **Cherny's law:** target ~100 lines for CLAUDE.md (hard ceiling 300).
- **Lazy by default:** skill > CLAUDE.md when possible.
- **Hooks for enforcement, CLAUDE.md for advisory.**
- **Machine-personal in memory**, repo-shared in `<repo>/docs/`.
- **Each layer earns its load cost.**
- **No premature abstraction:** don't build a skill until hand-rolled 3x.

### Hard Rules

- **Never edit CLAUDE.md without measuring before/after** (line count).
- **Skill descriptions must be ≤30 words** (triggers, not summaries).
- **Archival pattern:** if changelog >50 entries, archive oldest to separate file.
- **Always update roadmap** on status changes.

### Verification

After any change, note what to verify. User will restart to run: `/memory` (memory system), `/context` (context chains), `/skills` (skill catalog).
