---
name: run-spark
description: Run a Codex prompt against gpt-5.3-codex-spark with the right config overrides so reasoning.summary doesn't blow up. Use when you want a fast adversarial review or second-opinion from a non-Anthropic model and the default `gpt-5.5` is too heavy for the task.
---

# Run Spark

Fast Codex adversarial / second-opinion runs against `gpt-5.3-codex-spark`.

## Why this exists

Spark rejects the `reasoning.summary` parameter that the default Codex config sends. Without these overrides every spark call returns:

```
ERROR: Unsupported parameter: 'reasoning.summary' is not supported with the 'gpt-5.3-codex-spark' model.
```

This skill wraps the right `-c` overrides so spark just works.

## Trigger

When the user says "run spark", "spark review", or you want to run an adversarial pass with a cheaper-than-gpt-5.5 model.

## Usage

```bash
~/.claude/skills/run-spark/scripts/run-spark.sh "<prompt>" [output-file]
```

Or for a longer prompt staged in a file:

```bash
~/.claude/skills/run-spark/scripts/run-spark.sh --prompt-file /tmp/my-prompt.md /tmp/spark-out.md
```

## What the wrapper sets

- `--model gpt-5.3-codex-spark` (the spark alias)
- `-c 'model_reasoning_summary="none"'` — disables the unsupported summary param
- `-c 'sandbox_policy.network_access=true'` — matches the existing user shell wrapper
- Defaults to `--full-auto` (no approval prompts) so it runs unattended in background

## Example

```bash
# Quick spark review:
~/.claude/skills/run-spark/scripts/run-spark.sh "Review this plan critically: <plan content>" /tmp/review.md

# Long prompt from file:
echo "long prompt..." > /tmp/p.md
~/.claude/skills/run-spark/scripts/run-spark.sh --prompt-file /tmp/p.md /tmp/out.md
```

## When NOT to use

- For deep reviews requiring full reasoning trace — use `gpt-5.5` (default codex) instead
- For tasks needing 100K+ output tokens — spark is fast but smaller context budget
- For code synthesis where you want detailed reasoning — gpt-5.5 is sharper
