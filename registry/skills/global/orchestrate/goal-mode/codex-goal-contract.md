# Codex Goal Contract

Use this after `/goal` for a long-running Codex worker.

```text
Objective:
<one concrete outcome>

Scope:
- <allowed files/areas>

Do not touch:
- <dirty, owned, risky, or human-review paths>

Success criteria:
- <machine-verifiable check>
- <artifact path>
- <handoff path with PASS/FAIL>

Checkpoint cadence:
- Append a compact line to notes/<name>.ndjson after each meaningful substep.
- If the task runs long, checkpoint at least every ~30 minutes.
- Keep status lines short enough for the orchestrator to read without transcript inspection.

Stop and report if:
- You need credentials, a human choice, a live window, or account-sensitive action.
- The same verifier fails twice.
- The task scope needs to expand.
- Another live worker owns the files you need.
- The instructions conflict with the active run board or source-of-truth docs.

Completion:
- Write handoffs/<name>.result.html with PASS or FAIL in the title/body.
- Include changed files, verification commands, and remaining risks.
- Do not claim done only because the Codex goal UI says complete.
```

