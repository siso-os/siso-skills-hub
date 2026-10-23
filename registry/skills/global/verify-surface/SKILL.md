---
status: retired
name: verify-surface
description: Drive a RUNNING app's window.__verify contract and read the PASS/FAIL/BLOCKED/SKIP verdict matrix — the agent-side consumer of an app instrumented with the verifiable-frontend skill. Connects over CDP, evals window.__verify.runAll() (or reads #verify-result-json), prints verdicts with structured exit codes. Load when verifying a change at the surface (observe the artifact, don't read the code) on an app that emits the data-verify contract.
disable-model-invocation: true
---

# verify-surface — observe the running artifact

The agent-side half of the verify loop. `verifiable-frontend` makes an app *emit* the contract; this skill *reads* it from the running app and turns it into a verdict you can act on.

**Use this when** you've made a change and need to confirm it actually works — drive the running app, read the structured result, and trust the verdict over your own code-reading. This is "done means observed, not inspected" in practice.

## Prerequisite

The target app must be instrumented (`window.__verify` present, or a `#verify-result-json` DOM host). If it isn't, this skill exits 3 and you instrument it first with the `verifiable-frontend` skill.

## The driver

`scripts/run-verify.mjs` — zero npm deps (raw CDP over Node 22's global WebSocket). It:
1. Connects to the app's Chrome DevTools endpoint.
2. Evals `window.__verify.runAll()` (DOM-only fallback: parses `#verify-result-json`).
3. Renders the unit×fixture matrix with icons (✅ PASS, ❌ FAIL, ⛔ BLOCKED, ⏭️ SKIP, 🔍 probe).
4. Exits with a structured code.

```bash
node scripts/run-verify.mjs --cdp http://127.0.0.1:9222           # human table
node scripts/run-verify.mjs --cdp http://127.0.0.1:9222 --json    # machine-readable
node scripts/run-verify.mjs --cdp http://127.0.0.1:9222 --unit Cart   # one unit
```

## Exit codes (the contract for CI / agents)

| Code | Meaning | What to do |
|---|---|---|
| `0` | All PASS | Done — observed, not just inspected. |
| `1` | ≥1 FAIL (observed and wrong) | Read the `↳` diagnosis lines; fix; re-run. |
| `2` | ≥1 BLOCKED (couldn't observe) | **Not a pass.** The mount/harness failed — fix that, don't downgrade. `--allow-blocked` only if you've consciously accepted it. |
| `3` | Harness not found / can't connect | App isn't instrumented or isn't running with a debug port. |

**BLOCKED ≠ FAIL ≠ PASS.** Treating BLOCKED as success is the cardinal sin — it means you *think* it's fine but never actually saw it.

## Getting a CDP endpoint

- **Electron app**: launch the app (or its smoke harness) with `--remote-debugging-port=9222`, then `--cdp http://127.0.0.1:9222`. Many SISO apps already expose this in their smoke scripts.
- **Vite/web app**: open it in a Chromium started with `--remote-debugging-port=9222` (or via the `playwright-cli` skill), then point `--cdp` at it.
- The script auto-picks the first `page` target from `/json/list`.

## The verify loop (how to actually use it)

1. Make your change.
2. Run the app with a debug port.
3. `run-verify.mjs --cdp …` → read the table.
4. **Plant-a-bug check** (when establishing trust in a new instrumentation): break one thing (remove a `data-verify-*` attr, violate an invariant) and confirm the right unit flips to ❌ FAIL with a precise reason. A harness that can't catch a planted lie proves nothing — same principle as the `EXPECTED_FAIL` probes in the matrix test.
5. Fix until ✅ across the board (no ⛔).

## Relationship to the matrix test

`matrix.test.ts` (shipped by `verifiable-frontend`) runs the *same* `runAll()` path headlessly in CI under jsdom. This skill runs it against the *real, visibly-running* app. Same contract, two consumers — CI proves it in the abstract, this proves it in the artifact a human would actually touch.
