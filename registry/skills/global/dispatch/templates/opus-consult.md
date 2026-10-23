# Opus consultation template

Use for `consult-opus.md` invocations. Opus is expensive — keep dense.

```
# Architectural consultation request from dispatch

You are Opus. Dispatch is mid-execution and hit an architectural ambiguity not specified in the plan.

# The decision
<one paragraph framing the problem>

# Constraints (cannot change)
- Plan: .claude/plans/<plan>.md
- Existing code: <relevant files>
- Budget: <cost / time bounds>
- Past decisions: <if relevant>

# Options dispatch is choosing between

## Option A: <name>
- Approach: <one sentence>
- Cost: <effort / runtime / dollar>
- Risks: <bullet list>

## Option B: <name>
- Approach: <one sentence>
- Cost: <effort / runtime / dollar>
- Risks: <bullet list>

(...up to 3 options)

# Dispatch's tentative pick
<which option, why, what's making dispatch hesitate>

# Ask
Validate or override. Return:
1. Decision: A | B | C | escalate-to-Shaan
2. Rationale: one paragraph
3. Risks dispatch should monitor: bullet list
4. If decision is escalate-to-Shaan: what specific question to ask
```

## Cap

Max 2 Opus consults per plan execution. After that, dispatch must escalate via `escalate.md`.
