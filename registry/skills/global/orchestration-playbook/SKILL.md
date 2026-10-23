---
status: retired
name: orchestration-playbook
description: "Scenario router: given a KIND of work, the exact recipe — lane, model, agent count, verification. AUTO-TRIGGER at the start of any multi-step task when the user describes work without naming a lane: go through/extract/mine/collate, research/look into, refactor/fix/build a feature, review/check/verify, audit/sweep the codebase, explain a subsystem, how should I run this. Composes subagents + siso-routing + orchestrate (whole projects go there) — does not replace them."
---

# orchestration-playbook — "for THIS kind of work, run it THIS way"

The problem this solves: Shaan spends 2-3 min voicing a task — but most of it is *how to run the agents*, not the task itself. The how is stable and reusable. This skill holds it, so he describes the **what** and the recipe is already here.

**This skill is a router, not a runbook.** It points you at the right recipe + the right companion skill. It is agentic, not a script (Shaan's rule: agents over scripts — agents may *run* scripts, the orchestration layer never *is* one). Read the recipe, then reason.

## The doctrine in 5 lines (the invariants every recipe obeys)
1. **Thin coordinator, fat workers.** You (Opus) hold judgment/routing/synthesis. Domain-context lives in fresh workers, never in you. About to read bulk data into your own head → stop, hand it to a worker.
2. **Haiku→MiniMax is the DEFAULT worker — ~80% of the work.** Not Sonnet. Shaan's law: *"Don't use sonnet agent, use haiku — it links to MiniMax which is probably smarter than sonnet. Opus is just for heavy reasoning."* **Saturate, don't burst:** MiniMax throttles at ~5-6 concurrent (upstream cap) — keep 5-6 slots *continuously* busy across the session rather than firing 20-at-once waves that stall; in Workflow scripts prefer `pipeline()` over `parallel()`. Reflexive Haiku roles (defaults, not options): SCOUT before a build, VERIFIER after a done-claim, BOOKKEEPER at milestones, N-VERSION voting for mechanical builds, daily micro-retro — detail + the economies-of-scale test in `subagents`. Opus reasons + double-checks. **Codex is rationed** (use sparsely); when Codex is dry, port via Haiku-with-verification-gates. **No Codex "workflows" primitive** — high-Q sub-agents only.
3. **PUSH beats PULL.** Every dispatched worker ends by pushing `PASS|FAIL: <one line> + <output path>` back to the coordinator's pane — not just printing to its own. Line 1 is the verdict; you never parse prose. A brain *closes the loop*: dispatch → watch → react → synthesize.
4. **Verify by reading the running artifact, not the docs.** "Done" = observed. Shaan's most-repeated correction: *"look at the code, not the docs."* Verify by reloading the app, not code-reading. Last step before "done" is an independent check.
5. **Never ask for a thumbs-up on subtasks.** *"You don't ever ask me for my thumbs up again for anything."* Decide + announce. Escalate only taste / money / accounts / irreversible.

## Pick the recipe (scenario → how to run it)

| # | Scenario (what Shaan voices) | Recipe | Lane / model | Verify | Compose |
|---|---|---|---|---|---|
| 1 | **Mine / extract / collate** ("go through these transcripts/files and pull X") | Fan out N Haiku miners, one clean source-slice each → Opus synthesizes. Each miner gets CONSTRAINTS/RETURN/STOP. | Haiku→MiniMax ×3-5, Opus synth | Spot-check 1-2 extracted claims vs source | `subagents` |
| 2 | **Research / look into / find out** ("research vendor X / how does Y work") | 1-3 parallel researchers by angle (web / code / docs). Each returns cited findings. Opus adversarially reconciles contradictions. | Haiku→MiniMax researchers | Cross-check contradictions; cite sources | `subagents`, `multisearch`/`deep-research` |
| 3 | **Small refactor / fix a bug / few-file edit** | Do it inline if &lt;~50 lines & 1-2 files. Bug → reproduce with a check FIRST, then fix, then re-run the check. | Inline (you) or 1 Haiku→MiniMax / Codex worker | Reproduce → fix → check passes | `superpowers:systematic-debugging`, `superpowers:test-driven-development` |
| 4 | **Build a feature end-to-end** (multi-file, architectural) | Plan first (Opus/`planner`). Then mechanical build → Codex; taste/judgment calls → you. >3 files or ships to users → Codex review before "done". | Plan: Opus · build: Codex · review: Codex (`/codex:rescue` or a Codex pane — codex-fast is RETIRED) | Run the artifact; Codex adversarial review | `superpowers:writing-plans`, `codex-dispatch`, `subagents` |
| 5 | **Review / check / "is this right"** | Adversarial review of the diff. For anything load-bearing, fire a Codex refuter (`/codex:rescue` or `async-codex-review` — codex-fast is RETIRED) that tries to *break* the claim. | Codex review / Haiku verifiers | Refutation pass, majority-must-survive | `async-codex-review`, `code-review` |
| 6 | **Audit / sweep / map a codebase** ("what the fuck's going on in X") | Fan out read-only Haiku scouts by directory/concern → Opus assembles one map. Strictly read-only; report counts/paths, no edits. | Haiku scouts ×N read-only | Echo the read-only constraint; verify a sample | `subagents`, `siso-codex`, `Explore` agent |
| 7 | **Explain a subsystem** ("what is the office / how does X work") | Dispatch ONE agent to READ the actual code and return a plain-language model (anti-fabrication — read, don't theorize). | 1 Haiku→MiniMax reader | Reader cites file:line, not guesses | `classify-by-reading`, `Explore` |
| 8 | **Run a whole project / standing fleet** (>3 parallel streams, long-lived workers) | Promote to the full orchestrator pattern: persistent herdr panes, agent tree, task list, Codex grinds + Claude judges. | Opus orchestrator + herdr fleet | Status contract per worker (§status of `orchestrate`) | `orchestrate` (policy) + `herdr` (mechanics) |
| 9 | **Pair on one hard thing** (split-brain on the same task) | Split your own pane, launch a Codex sibling, you = left brain (judgment), Codex = right brain (grind), same task. | You + Codex companion | Sibling refutes/confirms before ship | `codex-companion` |

If the work doesn't fit a row: default to recipe #1's shape (fan out cheap, synthesize thin) and pick the model with the **`subagents`** skill (which owns the routing table now) or `~/.claude/reference.html`.

## The dispatch contract (every worker prompt ends with these 3 lines)
```
CONSTRAINTS: <read-only? which files may change? cap N reads?>
RETURN: <literal output shape — line 1 = PASS|FAIL, then evidence, then output path>
STOP: <hard terminator — "STOP after N files/greps; if not found, reply NOT FOUND">
```
And for herdr-pane workers, the completion push (PUSH LAW):
```
On completion, report to me: ~/.local/bin/herdr pane run <COORDINATOR_PANE> "PASS|FAIL: <one line> + <output path>"
```
(Re-resolve pane ids every turn — they rotate. `pane run` = atomic type+Enter; multi-line = `pane send-text` then `pane send-keys Enter`, then `pane read` to confirm the box cleared.)

## When NOT to spin up agents
Single-file edit · reading 1-2 small files · sub-10s bash · anywhere spawn cost > the work. Delegation preserves context; it isn't free.

## Companion skills (this routes INTO them — read for detail)
- **`subagents`** — the lanes (Claude Agent / Haiku→MiniMax / Codex) + compact-return prompting. The *how to dispatch*.
- **`subagents` + `~/.claude/reference.html` routing table** — which model for which task shape + budget reality. The *how cheap*. (Supersedes the retired `siso-routing` skill.)
- **`orchestrate`** — whole-project herdr fleets (recipe #8). The *how to run many*.
- **`herdr`** — pane/workspace CLI mechanics.
- **`codex-companion`** — split-brain pairing (recipe #9).
- **`codex-dispatch`** — fire headless Codex workers with a gated PASS/FAIL handoff (recipe #4 mechanical build). (Superseded the old `dispatch` plan-runner skill, archived 2026-07-02 — its Haiku/Sonnet worker split predated the Sonnet ban.)

## Why this exists (provenance)
Built 2026-06-09 from Shaan's voice thesis (`/.agents/jarvis/docs/THESIS_how-shaan-runs-agents_2026-06-09.html`). His words: *"I shouldn't be talking about how the agents are run — it should be a skill linked into main Claude, so all the context is there on how to use the system in different scenarios. Like a playbook."* This is that playbook.
