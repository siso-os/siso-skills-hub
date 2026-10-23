---
status: retired
name: implement
description: Tiered implementation playbook for turning specs, review gaps, and bug lists into verified code changes. Uses Haiku for glue, headless codex exec for cognition, /100 ratings, checkpoint-first reporting, and Claude Workflow composition when parallelism helps.
disable-model-invocation: true
argument-hint: "<spec, gap list, issue, or report path>"
user-invocable: true
---

# implement

Use this pack when the job is "make the change", especially when there is a spec, adversarial-review report, smoke failure, bug list, or multi-file implementation request. The pack is source-controlled in `SISO_Agent_Base/templates/profile/skills/implement/` and projected into agent roots by `scripts/sync-skill-symlinks.mjs --apply`.

## Contract

- Build first, verify second, checkpoint third. Do not auto-commit unless the user explicitly asks.
- Rate every plan, implementation, verifier result, and checkpoint `/100`.
- Pass floor is `85/100` unless the caller sets a stricter floor.
- Loop cap is `3` cycles per item. Stop earlier when the independent verifier rates the item at or above the floor.
- Default bulk/glue agents to `haiku`.
- Put real cognition and code edits on headless `codex exec`, normally through `tools/codex-exec-adapter.mjs`.
- Use Opus only once for final taste or synthesis when justified; never for bulk worker glue. (Sonnet is banned outright for sub-agents — Shaan 2026-06-11.)
- Compose with Claude native Workflow when parallelism helps. Use `tools/workflow-implement-sweep.js` as the template and pass runtime facts through `args`.

## Tier Router

Pick the smallest tier that can honestly finish the job:

| Tier | Shape | Use when |
| --- | --- | --- |
| `XS` | 1 agent, 1 pass | Single obvious edit or smoke-only fix. |
| `S` | 2-3 agents | Small change with one independent verifier. |
| `M` | 5-8 agents, one reasoning loop | Multi-file change or review report with related gaps. |
| `L` | 12-16 agents, adversarial gate | Cross-module behavior or high blast radius. |
| `XL` | Fan-out, multi-phase synthesis | Product/system change with multiple surfaces. |
| `Super` | Loop until dry | Open-ended hardening where new findings may keep appearing. |

## Execution Flow

1. Read the local source of truth: spec, report, failing smoke, issue, or user request. Do not invent scope beyond it.
2. Triage items into two lanes:
   - `just-do-it`: low-risk, locally obvious edits. Dispatch headless Codex immediately.
   - `needs-reasoning`: ambiguous or cross-cutting work. Use a bounded plan -> implement loop, with Haiku glue and headless Codex for the actual analysis/edit.
3. Run both lanes in parallel when there is more than one independent item.
4. Verify each item independently. Verifiers default to skeptical and must cite commands, files, or observed behavior.
5. Rate each item `/100`. Re-run repair cycles for anything below the floor until it passes or hits the cycle cap.
6. Write a checkpoint HTML report under `reports/` with item ratings, verifier evidence, benchmark/smoke output, and an aggregate `/100`.
7. Append lessons to `BEST-PRINCIPLES.html` when a run exposes a reusable principle.
8. Append a compact JSON line to `ledger/runs.jsonl` for every run.

## Tools

- `tools/codex-exec-adapter.mjs` runs `codex exec --dangerously-bypass-approvals-and-sandbox` with a controlled prompt, optional output file, and ledger entry.
- `tools/workflow-implement-sweep.js` is the Claude Workflow composition template. It uses `agent()`, `parallel()`, and `pipeline()` without script-body filesystem reads, clocks, or randomness.
- `tools/validate-playbook-pack.mjs` checks pack anatomy, routing, Workflow safety rules, and sync projection.
- `routing.json` is the machine-readable routing and rating policy.
- `framework/` holds the reusable tier, execution, rating, and Workflow composition rules.

## Output

Every run should leave a concise checkpoint:

- `status`: `PASS`, `FAIL`, or `BLOCKED`
- `aggregateRating`: number out of `100`
- `items`: each item with `before`, `change`, `verification`, `rating`, and `nextAction`
- `evidence`: commands, smoke output summaries, report paths, or verifier notes
- `lessons`: reusable principles appended to `BEST-PRINCIPLES.html`

If the closest verification cannot run, mark the checkpoint `BLOCKED` and rate it honestly. Do not turn a blocked observation into a pass.
