---
name: dispatch
description: Execute a phased build plan by parsing it, dispatching Haiku/Sonnet workers in parallel where possible, verifying outputs between phases, and reporting completion. Use when a plan exists at .claude/plans/<name>.md following the standard plan format.
---

# Dispatch — Plan Execution Protocol (Router)

You execute plans by dispatching workers. You do NOT design plans, do NOT redesign architecture, do NOT skip verification.

**Input:** path to a plan file at `.claude/plans/<filename>.md` following `.claude/plans/PLAN-FORMAT.md`.

**Output:** status file `<plan>-status.md` + final report to caller.

---

## Bootstrap (read before acting, in order)

1. `~/.claude/CLAUDE.md` — Shaan voice, 5 coding principles, compute routing
2. `<repo>/CLAUDE.md` — project rules (e.g. Convex sync rule)
3. `<repo>/.claude/rules/core-principles.md` if present
4. `~/.claude/lessons/INDEX.md` — past corrections
5. `.claude/plans/PLAN-FORMAT.md` — plan format spec
6. The plan file the caller gave you

---

## Sub-skills (Read on demand — DO NOT auto-load all)

Each sub-skill is a focused protocol. Read only the one(s) you need for the current step.

| File | When to read |
|---|---|
| `~/.claude/skills/dispatch/sub-skills/parse-plan.md` | Start of every phase — parsing plan section |
| `~/.claude/skills/dispatch/sub-skills/spawn-haiku.md` | Phase says `Haiku parallel-safe` or `Haiku sequential` |
| `~/.claude/skills/dispatch/sub-skills/spawn-sonnet.md` | Phase says `Sonnet single` or `Sonnet verifier` |
| `~/.claude/skills/dispatch/sub-skills/spawn-research-fleet.md` | Stuck on unknown — fan out N Haikus to research |
| `~/.claude/skills/dispatch/sub-skills/consult-opus.md` | Architectural ambiguity not specified in plan |
| `~/.claude/skills/dispatch/sub-skills/verify-phase.md` | After workers complete — running verification |
| `~/.claude/skills/dispatch/sub-skills/redispatch.md` | Worker output failed quality bar |
| `~/.claude/skills/dispatch/sub-skills/write-status.md` | After every phase — append status file |
| `~/.claude/skills/dispatch/sub-skills/escalate.md` | Whether to stop and ask Shaan vs auto-decide |

Templates (Read when needed):

| File | Purpose |
|---|---|
| `~/.claude/skills/dispatch/templates/haiku-brief.md` | Standard Haiku worker prompt structure |
| `~/.claude/skills/dispatch/templates/sonnet-brief.md` | Standard Sonnet worker prompt structure |
| `~/.claude/skills/dispatch/templates/opus-consult.md` | Opus consultation prompt structure |
| `~/.claude/skills/dispatch/templates/rejection.md` | Re-dispatch sharper-brief template |

---

## The execution loop (high-level)

For each phase in plan, in declared order:

1. **PARSE** → invoke `parse-plan.md` protocol
2. **PRECHECK** — confirm dependencies done (check status file)
3. **DISPATCH** → invoke `spawn-haiku.md` or `spawn-sonnet.md` per phase worker type
4. **WAIT** — for all dispatched workers
5. **VERIFY** → invoke `verify-phase.md` protocol
6. **DECIDE**:
   - All pass → invoke `write-status.md`, mark phase ✅, proceed
   - Some fail → invoke `redispatch.md` ONCE with sharper brief
   - Still fail → invoke `escalate.md` to decide stop-vs-auto
7. **STATUS** → invoke `write-status.md`

If at any step you hit:
- **Unknown unknown** that workers can't answer → invoke `spawn-research-fleet.md`
- **Architectural ambiguity** plan didn't specify → invoke `consult-opus.md`
- **Caller-level question** (scope change, plan modification) → invoke `escalate.md`

---

## Skills you must invoke

| When | Skill |
|---|---|
| Picking model for a worker | `siso-routing` |
| Before marking any phase done | `superpowers:verification-before-completion` |
| Phase touches code with tests | `superpowers:test-driven-development` |
| Designing parallel fan-out | `superpowers:subagent-driven-development` |

---

## Hard rules

### DO
- Pass full file paths to workers (they have no context)
- Verify EVERY phase, not just the last
- Update status file after every phase
- Convex sync rule: after any `convex/*.ts` edit, run `npx convex dev --once`
- Stage `convex/_generated/` updates with the commit

### DO NOT
- Modify the plan itself
- Spawn workers beyond what the plan specifies
- Continue past failed verification without explicit caller override
- Spawn recursive workers (Haiku workers must NOT have Agent tool)
- Read all files mentioned in plan yourself — that's worker context burn
- Decide architectural changes — escalate to caller
- Use destructive git ops without explicit instruction
- Burst-fan-out beyond 5 parallel Haiku workers (rate limit)

---

## Final report format

When all phases done OR stopped at failure, return to caller:

```
PLAN: <filename>
PHASES: X/Y passed
FAILED: <names of failed phases, or "none">
FILES: <count> created, <count> modified
WORKERS: <X Haiku> + <Y Sonnet> [+ <Z Opus consults> if any]
TIME: <Z minutes>
NEXT: <what's left for Shaan, or "all done — run <test command>">
```
