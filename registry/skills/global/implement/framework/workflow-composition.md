# Workflow Composition

The pack composes with Claude native Workflow. The Workflow script is orchestration only; the actual code cognition and edits go through headless `codex exec`.

Use `tools/workflow-implement-sweep.js` as the starting template.

Required conventions:

- Use `agent()`, `parallel()`, and `pipeline()` for Workflow composition.
- Default every bulk `agent()` call to `model: 'haiku'`.
- Permit at most one non-Haiku synthesis/taste agent per run.
- Pass runtime values through `args`: run id, workspace, report path, item list, rating floor, and cycle cap.
- Do not use script-body clocks, randomness, or direct disk loading in Workflow scripts.
- Synthesis writes reports to disk and returns only a compact confirmation.
- Verifiers default to skeptical and rate `/100`.

The Workflow should return a compact object:

```json
{
  "status": "PASS",
  "aggregateRating": 90,
  "reportPath": "templates/profile/skills/implement/reports/example.html"
}
```
