# spawn-research-fleet

When dispatch hits an unknown unknown that workers can't answer, fan out 3-5 parallel Haikus to research it.

## Trigger conditions

Invoke this sub-skill when:
- A worker reports "I don't know how to do X — the plan doesn't specify"
- Verification fails because of an external unknown (e.g. "what's the right threshold for tool Y?")
- The plan references a tool or API whose interface isn't documented in context
- A re-dispatch loop is failing because the original brief had a knowledge gap

## NOT for

- Things specified in the plan (re-read the plan)
- Things in repo context (search files first)
- Architectural decisions (use `consult-opus.md`)

## Pattern

Decompose the unknown into 3-5 specific research questions, dispatch in parallel.

```
Agent({
  description: "Research question 1: <short>",
  subagent_type: "general-purpose",
  model: "haiku",
  prompt: <research brief>,
  run_in_background: true
})
Agent({
  description: "Research question 2: <short>",
  subagent_type: "general-purpose",
  model: "haiku",
  prompt: <research brief>,
  run_in_background: true
})
... up to 5 parallel ...
```

## Research brief structure

Each Haiku gets a sharp, specific question. Bad: "research video tools." Good: "find the exact pip install command for PySceneDetect AdaptiveDetector and the production threshold value used in repos with >1k stars."

Each brief includes:
1. **The question** — one sentence
2. **Why it matters** — what plan decision it unblocks
3. **Search vectors** — specific repos / GitHub topics / search terms (3+)
4. **Required output** — code snippets, threshold values, benchmark numbers (NOT summaries)
5. **Save to** — `.claude/research/dispatch-fleet/<timestamp>-<slug>.md` for traceability
6. **Word cap** — "Return findings in <300 words. Cite sources with markdown links."

## Synthesis

After all Haikus return, dispatch (you) synthesizes findings to answer the original unknown. Do NOT spawn another Sonnet for synthesis unless findings genuinely contradict.

## After resolution

- Update plan? NO. Plan is immutable. Note the new info in status file instead.
- Resume worker dispatch with the unknown now resolved.
- If finding reveals a plan-level gap → invoke `escalate.md`.

## Cost guard

Don't fan out more than 5 Haikus at once. Don't loop fleet dispatches. If first fleet doesn't resolve the unknown, invoke `escalate.md`.
