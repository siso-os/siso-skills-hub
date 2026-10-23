# Blind forward test for a skill or agent artifact

Use this after static validation and focused smoke tests when the artifact
changes agent behavior. The test measures whether the artifact transfers to a
fresh agent, not whether a reviewer can repeat the author's diagnosis.

## Protocol

1. Start a fresh worker with no authoring transcript or expected answer.
2. Give it the artifact under test, a realistic task/fixture, governing safety
   constraints, and the observable acceptance surface.
3. Do **not** give it the suspected defect, intended decision, hidden rubric, or
   prior worker's conclusion.
4. Require a bounded result: behavior chosen, evidence observed, PASS/FAIL, and
   any ambiguity.
5. Rebuild the next test from the source artifact and fixture. Do not resume a
   worker whose context contains the previous diagnosis.
6. Pass only when success follows from the artifact and is repeatable across at
   least one cold worker. If success depends on leaked context, tighten the
   artifact or the test; do not count it as a pass.

## Fleet routing

- Use a MiniMax worker for cheap trigger/format/adherence probes.
- Use Codex for code-changing or tool-use behavior where mechanical accuracy is
  the risk.
- Keep Opus outside the blind run; Opus owns fixture quality and synthesis.

For Oracle streaming, forward-test a project skill on a small representative
change and verify the actual runtime surface. For Ponytail, the cold worker must
remove a one-use abstraction while preserving trust-boundary validation, without
being told which lines the author expects it to delete.

## Provenance

Paraphrased from the fresh-context artifact-testing pattern observed in
`elder-plinius/CL4R1T4S` revision
`34d6ca0e16217d62727c16ba1f30265540abaa9d`,
`OPENAI/Codex_Desktop/5.6-Sol_SystemPrompt.md:1595-1679`. The source corpus is
treated as untrusted research data: no prompt text, injection content, license
header, executable, or system policy is copied.
