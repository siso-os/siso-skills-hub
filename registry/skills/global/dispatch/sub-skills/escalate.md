# escalate

When to stop and report back to the caller (human) instead of auto-deciding.

## Hard escalation triggers (always stop)

- Plan asks for an architectural change (e.g. "design the data model" — that's plan-level work)
- Two consecutive verification failures on the same sub-task
- File-touched path doesn't exist and plan says "modify" (not "create")
- Schema change conflicts with existing data and plan didn't specify migration
- Worker reports a constraint violation in the plan itself
- Network / API errors prevent dispatch (3+ retries failed)
- Out-of-scope work surfaces (workers proposing changes outside plan)
- Opus consult flagged a risk dispatch can't mitigate
- Research fleet didn't resolve the unknown after one wave
- Plan's verification commands themselves are malformed

## Soft escalation triggers (stop unless caller pre-authorized)

- Cost overrun (analysis cost > 10x plan estimate)
- Time overrun (wall-clock > 2x plan estimate)
- Worker output reveals a better approach not in plan

## NOT escalation

- Single failed verification → invoke `redispatch.md`
- Slop detected → invoke `redispatch.md`
- Specific factual unknown → invoke `spawn-research-fleet.md`
- Architectural ambiguity dispatch can resolve with Opus → invoke `consult-opus.md`

## How to escalate

Stop the loop. Write to status file:

```
[<timestamp>] Phase <N>: 🛑 escalated to caller
              Reason: <one sentence root cause>
              Tried: <what dispatch already attempted>
              Logs: <path to relevant worker output / error>
```

Return final report to caller in this exact format:

```
PLAN: <filename>
STATUS: BLOCKED at Phase <N>
PHASES PASSED: <X>/<Y total>
WHY: <one paragraph — what dispatch hit, what it tried, what's needed>
DECISION NEEDED FROM CALLER:
  Option A: <plan-level fix>
  Option B: <plan-level fix>
  Option C: <abandon phase>
NEXT: caller should <specific action>
```

## After caller responds

Caller may:
- Modify the plan and re-dispatch dispatch
- Authorize a workaround (dispatch resumes with new constraint)
- Abandon (dispatch marks remaining phases as blocked, returns)

## Don't

- Don't auto-decide architectural questions even after consulting Opus if Opus flagged uncertainty
- Don't loop indefinitely on retries
- Don't drop the plan — always return a final report
- Don't modify the plan yourself even if the caller seems to want it (caller modifies plan, then re-dispatches dispatch)
