# agent-architecture — Copyable Enforcement Templates

Drop-in config files that **wire** the GQ-001 agent-legible-architecture
principles into a new repo. These are the P10/P17–P22 enforcement layer made
droppable: not docs *about* the rules, but the real, copy-pasteable files that
make the rules **executable, measured, and monotonic** — the fix for the
"enforcement is warn-only theater" weakness the research flagged.

Source of truth for the principles + evidence:
`../../../Foundry/research/answers/GQ-001-agent-legible-architecture/answer/ANSWER.html`
Reference implementation these are distilled from (in production):
`SISO_Agency/apps/oracle-streaming/`.

All scripts are syntax-checked and the score scorer self-calibrates
(`node structure-score.mjs --calibrate` prints `38`).

---

## The templates (10 files)

| File | Principle(s) | What it wires |
|---|---|---|
| `.dependency-cruiser.cjs` | **P11 / P9 / P10 / P19** | Import-boundary-as-lint. Folder-is-a-boundary rules: `renderer ↮ main`, core-depends-on-nothing, no cross-domain imports (only via a `contract/` surface). Clean arrows at `error`, the one with residual debt at `warn` + an inline "flip to error at zero" note. |
| `structure-ratchet.mjs` | **P17** | The anti-degradation **ratchet**. Freezes each metric at today's number; new regressions reject, legacy debt passes; the bar only tightens. Gates the Δ, not the absolute. |
| `structure-ratchet.baseline.json` | **P17** | Worked-example frozen baseline (ceilings/floors). Copy to `fitness/baseline/structure-ratchet.json`, then overwrite via `--write-baseline` on first run. |
| `structure-score.mjs` | **P18** | The 0–100 legibility **KPI**. 5 weighted dimensions summing to exactly 100, deterministic core (no clock/random/network), and a calibration contract (`--calibrate` must reproduce the hand-graded anchor, 38). |
| `pre-commit.sh` | **P10 / P19 / P20** | The gate **chain**. Chains spine-freshness, depcruise, ratchet, orphan-gate, existence-gates, dep-ratchet — with the warn-vs-hard-fail split and the `--no-verify` trace-instrumentation (the hook records every vetted commit so a later audit detects bypasses). |
| `dep-ratchet.mjs` | **P21** | New-dependency **provenance** gate. A new top-level dep name needs a one-line `dep-rationale:` in the same commit. Version bumps/removals pass free. |
| `no-orphan-scripts.mjs` | **P22** | No-orphan **liveness** gate on the ops layer. Every script is reachable (npm entry or imported) or flagged; the known-orphan set may only shrink. |
| `FILE-TREE.md` | **P7 / P9 / P11 / P13 / P14 / P15 / P16** | The canonical "what lives where" map. Domain-partitioned, two-bucket root (`apps/` vs `packages/`), self-similar domains with a public `contract/` surface, derived code quarantined, name-normalized `script/` ops layer, the boot=MD/state=HTML split, and the `manifest.yaml` indirection layer. |
| `CONTEXT-BLOCK.template.ts` | **P1** | The terse machine `<context id/layer/status>{purpose, contract, agent-note, links}` block (the *universal* corroborated form — NOT a prose GOAL/TIMELINE header). Compiled to `CODE-CONTEXT-GRAPH.json`, coverage-gated by the score. |
| `CLAUDE.md` | **P2** | The points-not-asserts **router**. One destination per question; timeless invariants inline, volatile facts in dated ledgers. Boot layer ⇒ Markdown. |

---

## Drop-in order (each step leaves the repo green)

1. **Map + router first (the boot layer, Markdown).** Copy `FILE-TREE.md`,
   `CLAUDE.md`, and `CONTEXT-BLOCK.template.ts`; rename the example domains to
   yours. These cost nothing and orient every later step.
2. **Score, then freeze.** Copy `structure-score.mjs`; run
   `node structure-score.mjs --calibrate` and re-anchor `RUBRIC_ANCHOR` to a
   hand-graded snapshot of YOUR repo so it prints your baseline. Then copy
   `structure-ratchet.mjs` + the baseline, and run
   `node structure-ratchet.mjs --write-baseline` to freeze today's reality.
   *Now the ratchet blocks regressions without blocking your existing debt.*
3. **Boundaries.** Copy `.dependency-cruiser.cjs`; run
   `npx depcruise src --config .dependency-cruiser.cjs` to get current counts.
   Rules at **0 violations → `error`**; rules **>0 → `warn`** + an inline note
   naming the single blocker and the flip condition (**P19** — never hard-error a
   dirty rule, or the fleet learns `--no-verify`).
4. **Liveness + provenance.** Copy `no-orphan-scripts.mjs` (run
   `--write-baseline` to seed the known set) and `dep-ratchet.mjs` (safe to
   hard-fail from day one — its starting violation count is 0).
5. **Wire the chain.** Copy `pre-commit.sh` to `.githooks/pre-commit`,
   `chmod +x`, then `git config core.hooksPath .githooks`. The chain guards each
   gate's existence, so a partially-adopted repo won't crash.

---

## The three laws that make this not-theater (read before changing a severity)

- **Gate the Δ, not the absolute (P17).** A hard "files < 250 lines" rule on a
  messy tree rejects every commit. Freeze the number instead; only *new*
  regressions reject. This is what makes "keep it clean" enforceable on day one.
- **Flip warn→error only at zero (P19).** A rule that hard-errors while one real
  violation remains rejects every commit → forces `--no-verify` → bypasses ALL
  gates. Hard-error clean dimensions only; warn+ratchet the dirty ones; flip in
  the same commit that drives the count to 0.
- **A move is a state; a gate is an invariant (P20).** For any cleanup that keeps
  regressing, add an existence-check gate that fails if the forbidden path exists
  at all — don't just "move it again".

## Nuances baked into these files

- **Boot=MD, state=HTML** (NOT blanket-HTML): `CLAUDE.md`/`README`/`FILE-TREE`/
  `ARCHITECTURE`/`REQUIREMENTS` stay Markdown; the volatile state/ledger/report
  layer (`STATE.html`, `DECISION-LOG.html`, reports) goes HTML.
- **Detect-rot ≠ repair-rot.** The pre-commit chain runs only cheap deterministic
  checks; expensive repairs are never auto-run — they're surfaced as a "I am
  stale, verify against the FS" banner. A "proof" is a commit + depends-on paths,
  so truth is git-falsifiable.
- **The hook instruments its own evasion.** `pre-commit.sh` writes a positive
  trace of every vetted commit to `.gates/hook-trace.jsonl`; a CI/audit job diffs
  `git reflog` against the trace to catch any `--no-verify` bypass.
- **A plan is a HYPOTHESIS until it has a task id** — `.tasks/` is the registry; a
  thought in `.planning/` may not be acted on until it's laddered to a TASK-ID.
