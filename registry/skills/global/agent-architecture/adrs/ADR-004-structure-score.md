# ADR-004 — Score the structure: a deterministic 0–100 legibility KPI

- **Principle:** P18 ★
- **Status:** ACCEPTED · **Classification: SISO HOUSE-BET, wired & proven in production** (enforcement-layer)
- **Layer:** Enforcement

## Context

The B-grade verdict named measurement as an explicit A-gate: "the heaviest claims … are asserted, not measured", and "is the layout getting better or worse?" had no numeric answer. Without a number you cannot tell whether a refactor helped, whether the repo is drifting, or whether a target is met — you have only vibes and a green/red build. A binary gate (ADR-002) answers "did this commit violate a rule?" but not "how legible is the whole repo, and is the trend up or down?"

## Decision

Emit a deterministic, **calibrated 0–100 legibility score** from measurable signals, and **trend it across commits.** Oracle's five weighted dimensions sum to 100: files-over-cap, css-over-cap, god-files, import-cycles, and context-coverage. The score is calibrated — a `--calibrate` mode must reproduce a hand-graded anchor, so the number means the same thing across runs and isn't gameable drift. Determinism is required: the same tree must always produce the same score, so it can run in CI and the trend is real signal, not noise.

Live reference values (oracle-streaming): **71/100** today, **baseline 38**, **target 90**. The score is honest about being incomplete — 71, not 90, explicitly refutes any claim that legible architecture is "solved."

## Consequences

- "Is the layout improving?" becomes a KPI you can trend, alert on, and put a target on — the measurement the B-answer flagged as missing.
- Feeds the ratchet (ADR-003): the score's component metrics are exactly what gets frozen at a baseline, so measuring and gating share one signal source.
- Requires calibration discipline — an uncalibrated score drifts and becomes a vanity number. The `--calibrate`-against-a-hand-graded-anchor step is load-bearing, not optional.
- The weights encode a value judgment (which dimensions matter most); they must be reviewed when the repo's character changes.

## When this applies

Any repo where you want to *manage* legibility as a metric rather than just gate individual commits — i.e. any long-lived agent-operated codebase. Overkill for a small short-lived project.

## Evidence

SISO HOUSE-BET, wired and live. Oracle's `fitness/structure-score.mjs` (5 weighted dims, `--calibrate` reproduces the hand-graded anchor; live 71/100, baseline 38, target 90). Source: GQ-001 ANSWER.html, Oracle deep-wiring pass (run wfccg04py), net-new principle P18. Directly answers the B-answer's stated A-gate (measure the unproven claims).
