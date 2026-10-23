---
name: verifiable-frontend
description: "verifiable-frontend \u2014 observe the running artifact, don't inspect the code"

disable-model-invocation: true
---

# verifiable-frontend — observe the running artifact, don't inspect the code

The doctrine (CLAUDE.md § Verify at the Surface) says: **done means observed, not inspected.** This skill is the executable version. It makes a React app emit a machine-readable contract about its own state so an agent can drive the *running* artifact and read a structured verdict — instead of reading source and guessing.

**One pipeline, three consumers:** the same `runAll()` code path feeds CI (`matrix.test.ts`), a human dashboard, and an agent (`window.__verify`). They cannot disagree, because there is only one truth.

## The five load-bearing ideas

1. **DOM is the surface.** Components emit `data-verify-*` attributes (`data-verify-unit="Cart" data-verify-total="3"`). Verifiers read *that contract*, never React internals — so it survives refactors.
2. **Verifiable units.** Each component/feature registers: a Zod `propsSchema`, reproducible **fixtures** (named states), and **invariants** (predicates over the mounted DOM). A fixture with `probe: true` is an adversarial edge (empty / overflow / inconsistent).
3. **`window.__verify`.** A versioned agent API: `manifest()` (discover every unit×fixture), `current()` (result for what's mounted), `runAll()` (run the whole matrix). It also writes JSON into `#verify-result-json` so a DOM-only agent reads the same truth.
4. **One verdict taxonomy: `PASS | FAIL | BLOCKED | SKIP`.** **BLOCKED (couldn't observe) ≠ FAIL (observed and wrong).** "When in doubt, FAIL." A verifier that throws becomes a `fail` check — never swallowed.
5. **Probe the edges, or you proved nothing.** The matrix test refuses a unit with zero probe fixtures ("all ✅ no 🔍 is a happy-path replay"), and lets you mark planted-lie probes as `EXPECTED_FAIL` to prove the framework catches wrongness.

## The architecture (what the template ships)

```
verify/
  core/
    types.ts       VerifiableUnit, Fixture, Invariant, Verifier, Verdict, VerifyHandle
    contract.ts    verifyAttrs() / readContract() — the data-verify-* helpers
    registry.ts    registerUnit / registerVerifier / buildManifest
    runner.ts      mount off-screen → act → run verifiers → verdict ("when in doubt, FAIL")
  verifiers/       pluggable, component-independent: schema, invariants, dom-contract (+ a11y optional)
  specs/           one <Unit>.verify.ts per unit — the central verify dir
  harness/
    handle.ts      window.__verify + #verify-result-json host
    install.ts     import ONCE from your renderer entry — wires everything up
  matrix.test.ts   the CI path — runs every unit×fixture, asserts verdicts
```

Only runtime deps: **`react-dom`** (you have it) and **`zod`**. The runner mounts each unit into an off-screen `<div>` (`left:-10000px`, kept in the DOM so layout/a11y queries work), renders with `flushSync`, optionally runs `fixture.act`, reads the contract, runs verifiers, unmounts in `finally`.

## How to instrument an app (the workflow)

1. **Copy the template** into your renderer source: `cp -r <skill>/template <app>/src/verify`. Rename `*.template` files (drop the suffix). Ensure `zod` is installed.
2. **Emit the contract** in each component you want verifiable. Spread `verifyAttrs({...})` onto the root element:
   ```tsx
   import { verifyAttrs } from "../verify/core/contract";
   <div {...verifyAttrs({ unit: "Cart", total, consistent: total === a + b })}>
   ```
   Put the *truths you care about* in the contract — counts, flags, states — so an invariant can read them back.
3. **Write a spec** per unit (copy `specs/Example.verify.ts.template`): `propsSchema`, ≥3 normal fixtures, **≥1 `probe` fixture**, and invariants that read `ctx.contract` / query `ctx.root`. Register each in `specs/index.ts`.
4. **Encode a real lie as a probe.** Pick one business rule (e.g. `total === done + active`), put it in a `.refine()` on the schema, and add a fixture that violates it. List that fixture in `EXPECTED_FAIL` in the matrix test. This is your proof the harness catches wrongness.
5. **Install the handle.** `import "./verify/harness/install";` once from your renderer entry (e.g. `main.tsx`).
6. **Wire CI.** Copy `matrix.test.ts`, ensure vitest uses `environment: "jsdom"`. `npm test` now runs the whole matrix.
7. **Verify at the surface** (the payoff). Run the app, then drive it with the `/verify` driver skill (or Playwright): `await window.__verify.runAll()` → read the verdict table. Plant a bug (remove a `data-verify-*` attr) and confirm the relevant unit goes FAIL with a precise diagnosis. See `verifiable-frontend` companion skill `verify` for the agent-side driver.

## Adapting beyond the todo example

- **No router?** (Electron renderers, single-page shells.) You don't need `/verify/:unit/:fixture` routes — `window.__verify.runAll()` mounts each unit off-screen itself. Routes are only for *visually* inspecting one fixture; skip them if you just want headless verdicts.
- **Feature-kind units** (stateful slices) emit multiple `data-verify-unit` nodes — use `readAllContracts(root)` in invariants.
- **New verifier kind** (perf, visual, your-domain): add a file in `verifiers/`, `registerVerifier({...})`, add one import line to `verifiers/index.ts`. No component changes.

## Anti-patterns

- **Happy-path-only specs.** No probe fixture = you proved nothing. The matrix test will fail you for it — that's intentional.
- **Reading React internals / test IDs instead of the contract.** The whole point is a refactor-stable surface. Read `data-verify-*`.
- **Treating BLOCKED as PASS.** BLOCKED means you couldn't observe — that's not success, it's an unknown. Fix the mount, don't downgrade the verdict.
- **Letting a verifier swallow exceptions.** A throw is a `fail`. Surface it with evidence.

## Provenance
Core framework ported verbatim from Anthropic's `cwc-workshops/how-we-claude-code/phase-3-verify` (Apache-2.0; copyright headers retained). The `a11y` verifier is omitted from the default port — add it from the workshop if you need it.

---

## Running the verification (absorbed verify-surface 2026-07-04)

The agent-side half of the verify loop. The section above makes an app *emit* the contract; this section *reads* it from the running app and turns it into a verdict you can act on.

**Use this when** you've made a change and need to confirm it actually works — drive the running app, read the structured result, and trust the verdict over your own code-reading. This is "done means observed, not inspected" in practice.

### Prerequisite

The target app must be instrumented (`window.__verify` present, or a `#verify-result-json` DOM host). If it isn't, this runner exits `3` and you instrument it first via the section above.

### The driver

`runner/run-verify.mjs` — zero npm deps (raw CDP over Node 22's global WebSocket). It:
1. Connects to the app's Chrome DevTools endpoint.
2. Evals `window.__verify.runAll()` (DOM-only fallback: parses `#verify-result-json`).
3. Renders the unit×fixture matrix with icons (✅ PASS, ❌ FAIL, ⛔ BLOCKED, ⏭️ SKIP, 🔍 probe).
4. Exits with a structured code.

```bash
node runner/run-verify.mjs --cdp http://127.0.0.1:9222           # human table
node runner/run-verify.mjs --cdp http://127.0.0.1:9222 --json    # machine-readable
node runner/run-verify.mjs --cdp http://127.0.0.1:9222 --unit Cart   # one unit
```

### Exit codes (the contract for CI / agents)

| Code | Meaning | What to do |
|---|---|---|
| `0` | All PASS | Done — observed, not just inspected. |
| `1` | ≥1 FAIL (observed and wrong) | Read the `↳` diagnosis lines; fix; re-run. |
| `2` | ≥1 BLOCKED (couldn't observe) | **Not a pass.** The mount/harness failed — fix that, don't downgrade. `--allow-blocked` only if you've consciously accepted it. |
| `3` | Harness not found / can't connect | App isn't instrumented or isn't running with a debug port. |

**BLOCKED ≠ FAIL ≠ PASS.** Treating BLOCKED as success is the cardinal sin — it means you *think* it's fine but never actually saw it.

### Getting a CDP endpoint

- **Electron app**: launch the app (or its smoke harness) with `--remote-debugging-port=9222`, then `--cdp http://127.0.0.1:9222`. Many SISO apps already expose this in their smoke scripts.
- **Vite/web app**: open it in a Chromium started with `--remote-debugging-port=9222` (or via the `playwright-cli` skill), then point `--cdp` at it.
- The script auto-picks the first `page` target from `/json/list`.

### The verify loop (how to actually use it)

1. Make your change.
2. Run the app with a debug port.
3. `runner/run-verify.mjs --cdp …` → read the table.
4. **Plant-a-bug check** (when establishing trust in a new instrumentation): break one thing (remove a `data-verify-*` attr, violate an invariant) and confirm the right unit flips to ❌ FAIL with a precise reason. A harness that can't catch a planted lie proves nothing — same principle as the `EXPECTED_FAIL` probes in the matrix test.
5. Fix until ✅ across the board (no ⛔).

### Relationship to the matrix test

`matrix.test.ts` (shipped by the section above) runs the *same* `runAll()` path headlessly in CI under jsdom. This section runs it against the *real, visibly-running* app. Same contract, two consumers — CI proves it in the abstract, this proves it in the artifact a human would actually touch.
