---
name: codex-subagent-orchestration
description: Coordinate parallel or staged Codex subagent work using the built-in MiniMax M3 and GPT-5.6 Luna roles. Use for fan-outs, audits, sweeps, multi-file investigations, parallel implementation, mixed-model teams, independent verification, convergence, or any request with two or more separable work units.
---

# Codex Subagent Orchestration

Use parallelism only for independent work, then converge all child results through one parent-owned synthesis.

## Plan the lanes

1. Split the request into independent, non-overlapping units.
2. Assign explicit ownership: files, modules, questions, or verification responsibility.
3. Choose roles using `$codex-subagent-routing`.
4. Reserve one convergence step for the parent; do not leave a pile of disconnected reports.

Choose each lane autonomously using the actual cost/quality tradeoff:

- MiniMax is free and can be attractive for high-volume work whose output is cheap to check or retry.
- Luna costs a little but is generally smarter and more reliable, so it can have the lower total cost when retries, cleanup, ambiguity, or mistakes would be expensive.
- Do not force a broad-discovery/mechanical-work split by model. Any lane may use MiniMax or Luna, and a fan-out may be all MiniMax, all Luna, or mixed.
- Treat Luna as the preferred quality/cost balance and MiniMax as the zero-cost option. Let the task, expected rework, available capacity, and explicit user preference decide.

## Dispatch well

For every child brief include:

- Objective: one concrete outcome.
- Ownership: exact files, module, or question.
- Constraints: read-only versus edits, compatibility, and shared-worktree warning.
- Evidence: commands, files, symbols, logs, or tests to inspect.
- Return contract: findings or changed files, checks run, pass/fail, and remaining uncertainty.

Use `fork_turns: "none"` and the exact custom `agent_type`. Do not add a direct `model` override. Full-history forks inherit the parent model and context, defeating deliberate MiniMax/Luna routing.

## Run and converge

- Start independent children without waiting between launches, up to available capacity.
- Continue useful parent work while children run.
- Use `wait_agent` only when progress depends on child results.
- Use `followup_task` for a precise correction or missing check; do not redispatch the whole task.
- Reject generic “standing by,” uncited, or unverified reports and send one corrective follow-up with the exact missing deliverable.
- Read shared edits before integrating. Never revert unrelated user or agent changes.
- Synthesize agreements, conflicts, evidence quality, and the final decision in the parent response.

## Common patterns

### Audit

Partition by file group or subsystem. Choose MiniMax, Luna, or a mix for each lane based on zero-cost coverage versus first-pass quality and expected retry cost, then have the parent deduplicate and rank findings.

### Parallel implementation

Give each worker exclusive file or module ownership. Run the closest focused tests per lane, then run one integration check after all edits land.

### Explore then implement

Use read-only explorers first. Convert their evidence into a bounded implementation brief; do not let an exploratory prompt silently expand into edits.

### Adversarial verification

Give the verifier the artifact and acceptance criteria, not the author's conclusion. Require concrete pass/fail evidence and inspect the child rollout model when model choice is part of the test.

## Stop conditions

Stop spawning and converge when:

- all independent units are covered;
- new agents would duplicate existing ownership;
- evidence is sufficient to decide or implement;
- the remaining blocker requires user authority, credentials, or external state.

More agents are not a substitute for a synthesis step.
