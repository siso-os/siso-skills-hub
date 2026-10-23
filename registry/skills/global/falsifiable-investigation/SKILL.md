---
name: falsifiable-investigation
description: "Falsifiable investigation"
---

# Falsifiable investigation

Use this before implementation when more than one root cause is plausible.

## Dispatch

Give each read-only worker exactly one hypothesis:

```text
HYPOTHESIS: <one causal claim>
CONFIRM IF: <observable evidence>
FALSIFY IF: <observable contradiction>
WRITE SCOPE: none
RETURN: verdict, primary evidence, contradicting evidence, negative results
STOP: after the smallest decisive check
```

- MiniMax: bounded file, log, or fixture checks.
- Codex: code-path tracing, reproduction, and adversarial review.
- Orchestrator: reconcile packets and authorize only the smallest supported fix.

## Acceptance gate

Reject a packet when it lacks primary evidence, omits contradicting evidence,
or describes a possibility without a falsifying check. A falsified hypothesis is
useful evidence. If several hypotheses remain viable, dispatch only the next
smallest discriminating check; do not open parallel implementation lanes.

## Provenance

Paraphrased and narrowed from the hypothesis/falsification, negative-evidence,
and single-review-dimension patterns in `wshobson/agents`. No upstream agent,
installer, model choice, permission policy, or marketplace configuration is
imported.
