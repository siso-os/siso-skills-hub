# consult-opus

When dispatch hits architectural ambiguity the plan didn't specify, consult Opus before escalating to Shaan.

## Trigger conditions

- Plan references a decision but doesn't specify which option
- Two or more sub-tasks have a circular dependency the plan glossed over
- A worker proposes a refactor that affects future phases
- Schema design choice has long-term implications not addressed
- Performance vs simplicity tradeoff that needs taste-level judgment

## NOT for

- Specific facts (use `spawn-research-fleet.md`)
- Worker output quality (use `verify-phase.md` + `redispatch.md`)
- Plan modifications (escalate to Shaan via `escalate.md`)

## Pattern

Single Opus call. Use `templates/opus-consult.md` for prompt structure.

```
Agent({
  description: "Consult Opus on <architectural question>",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: <opus consult template filled in>
})
```

## Brief structure

Opus consults are SHORT but DENSE. Opus has good judgment but expensive context. Don't waste tokens.

1. **The decision** — one paragraph framing the problem
2. **Constraints** — what can't change (plan, existing code, budget)
3. **Options A/B/C** — what dispatch is choosing between, with concrete tradeoffs
4. **What dispatch leans toward** — your tentative pick + reasoning
5. **Ask** — "Validate or override. Return: <decision>, <one-paragraph rationale>, <any flagged risks>."

## After Opus returns

- Apply Opus's verdict to dispatch flow
- Note in status file: `[2026-05-01 15:42] Opus consult: <question> → <verdict> (rationale: <one-line>)`
- Resume worker dispatch
- If Opus flags risks dispatch can't mitigate → invoke `escalate.md`

## When NOT to defer to Opus

Opus is advisory. If Opus's verdict contradicts the plan or Shaan's stated preference, escalate via `escalate.md`. Don't auto-apply Opus over the human.

## Cost

Opus consults are expensive (~$0.50-2 per call). Use sparingly. Cap: 2 Opus consults per plan execution. After that, escalate.
