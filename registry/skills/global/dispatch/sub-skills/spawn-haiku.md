# spawn-haiku

Brief and dispatch Haiku workers for mechanical work.

## When to use

Phase worker type is `Haiku parallel-safe` or `Haiku sequential`.

## Parallel-safe pattern

Send a single message with multiple Agent tool calls. Each Agent call is one sub-task. All run concurrently.

```
Agent({
  description: "<short verb phrase>",
  subagent_type: "general-purpose",
  model: "haiku",
  prompt: <use templates/haiku-brief.md template>,
  run_in_background: true   // only if results aren't needed mid-phase
})
```

**Cap: 5 parallel Haiku workers max** (Anthropic rate limit). If phase has >5 sub-tasks, batch them.

## Sequential pattern

Same Agent call shape, but fire one at a time. Wait for completion before next dispatch. Use only when sub-task N depends on sub-task N-1's output.

## Worker brief structure

Read `~/.claude/skills/dispatch/templates/haiku-brief.md` for the template.

Each Haiku worker brief MUST contain:

1. **Context files** — list of absolute paths to read (full paths from repo root). Workers have NO context.
2. **The task** — paste the plan's sub-task block verbatim
3. **Files to write/modify** — explicit paths
4. **Success criteria** — what makes the work "done"
5. **Anti-slop instructions**:
   > "Produce actual files with concrete content. Do NOT return summaries of what you would do. Do NOT use placeholder language like 'I will' or 'TODO'. If you cannot complete the task, return the error and the specific blocker — do not pretend success."
6. **Verification** — paste the bash command(s) the worker should run before reporting done

## Routing check

Before dispatch, verify Haiku is correct model per `siso-routing` skill:
- Mechanical edits: ✅ Haiku
- File creation from spec: ✅ Haiku
- Schema additions: ✅ Haiku
- Test scaffolding: ✅ Haiku
- Doc updates: ✅ Haiku
- Prompt design or taste work: ❌ → use `spawn-sonnet.md`

## After dispatch

- Wait for all workers (foreground or via task notifications if background)
- Collect each worker's output
- Pass to `verify-phase.md` for evaluation

## Failure handling

If a Haiku returns:
- Vague language without files → reject, invoke `redispatch.md`
- Verification not run → reject, invoke `redispatch.md`
- Tool error / API timeout → re-dispatch ONCE before escalating
