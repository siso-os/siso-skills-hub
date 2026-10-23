# ADR-012 — Worktree-per-task CODE isolation; merge is the verification gate

- **Principle:** P4
- **Status:** ACCEPTED · **Classification: SISO HOUSE-PREFERENCE** (valid agent-workflow ergonomics; NOT a universal code-layout law)
- **Layer:** SISO agent-ergonomics

## Context

Multiple agents working the same repo concurrently will collide — overwriting each other's edits, building on each other's half-finished state, racing on the same files. The corpus's universal answer to write-isolation is *structural* (separate modules, separate repos), not a per-task mechanism. SISO's bet is a workflow-level isolation that fits an agent fleet.

## Decision

**One git worktree per task, branched off fresh `origin/main`.** Reads are shared (all worktrees see the same standing tree); **writes partition** (each task's changes live only in its worktree). **Merge is the verification gate** — work only enters main by surviving the merge, which runs the executable layout gates (ADR-002/003/005). 10+ live worktrees off main is normal in the reference implementation.

**Critical scope correction:** isolate **CODE, not the state spine.** Per-worktree REPLICATION of the full `.planning/`/`.orchestrate/` spine forks the single source of truth N ways and re-introduces the competing-monolith rot this whole architecture fights. The spine stays single and shared (ADR-008/009); only the code being changed is isolated.

## Consequences

- Concurrent agents stop colliding on code; each has a clean base and a clean diff.
- Merge becomes the natural place to run all gates — a task that can't pass the gates can't merge, so main stays green.
- The honest cost: worktree management overhead, and the trap of replicating the state spine (the "overhead half"). Discipline required: isolate the diff, not the brain.
- This is the agent-fleet analog of branch + PR + CI — which is exactly the "just X by another name" disconfirmer the B-grade flagged. It is valid ergonomics, not a novel layout law.

## When this applies

Agent-operated repos with concurrent workers. Single-author or single-agent work doesn't need it. NOT a principle to impose on a code tree's *layout* — it's a workflow choice for how changes are staged.

## Evidence

SISO HOUSE-PREFERENCE — explicitly REFUTED as universal by the corpus pass: "not a layout principle anywhere; external write-isolation is structural (separate modules/repos). Valid agent-workflow ergonomics, not a universal code-layout law." Reference wiring: oracle's 10+ live worktrees off main. Source: GQ-001 ANSWER.html, surviving principle #4 (with the "isolate CODE not the state spine" discount), External Corpus Pass REFUTED (P4), KILLED list (per-worktree spine replication).
