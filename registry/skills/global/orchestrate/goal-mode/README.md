# Orchestrate Goal Mode

Goal mode is the orchestrator pattern for long-running Codex workers.

Use it when a worker needs to keep making progress across multiple verifiable substeps without repeated human or orchestrator nudges: broad code-context cartography, multi-file cleanup, UI polish loops, adversarial review, or implementation waves.

## Operating Rule

Start the Codex worker with `/goal` when the Codex client supports it, then provide a structured goal contract from `codex-goal-contract.md`.

If the client asks whether to replace an existing goal, only replace when the orchestrator is intentionally changing that worker's objective. Do not casually overwrite a live goal.

Observed Codex replacement flow:

```text
Replace goal?
New objective: <new objective>

> 1. Replace current goal  Set the new objective and start it now
  2. Cancel                Keep the current goal

Press enter to confirm or esc to go back
```

When option 1 is selected, pressing Enter replaces the current goal. Esc or Cancel preserves the current goal.

## Non-Negotiables

- Goal mode does not replace `handoffs/<name>.result.html` with PASS/FAIL.
- Goal mode does not replace notes or heartbeat/liveness.
- Goal mode counts against `MAX_LIVE`.
- Goal mode must include stop rules.
- Workers still write compact status to disk and avoid long transcript reports.

## Files

- `codex-goal-contract.md` - reusable brief template.
- `context-cartographer.example.md` - example for source-context mapping.
