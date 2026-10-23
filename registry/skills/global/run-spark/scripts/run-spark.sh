#!/usr/bin/env bash
# run-spark.sh — invoke gpt-5.3-codex-spark with the right config overrides.
#
# Spark rejects the `reasoning.summary` parameter that the default Codex
# config sends. This wrapper sets `model_reasoning_summary="none"` so the
# call doesn't 400 out.
#
# Usage:
#   run-spark.sh "<prompt>" [output-file]
#   run-spark.sh --prompt-file <path> [output-file]
#   run-spark.sh --prompt-file <path>            # writes to stdout
#
# Exit codes:
#   0  success
#   1  argument error
#   2  codex CLI error (missing or wrong version)
#   3  spark API call failed

set -euo pipefail

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex CLI not found in PATH. Install with: npm install -g @openai/codex" >&2
  exit 2
fi

# Parse args
PROMPT=""
PROMPT_FILE=""
OUTPUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt-file)
      PROMPT_FILE="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 \"<prompt>\" [output-file]"
      echo "       $0 --prompt-file <path> [output-file]"
      exit 0
      ;;
    *)
      if [[ -z "$PROMPT" && -z "$PROMPT_FILE" ]]; then
        PROMPT="$1"
      elif [[ -z "$OUTPUT_FILE" ]]; then
        OUTPUT_FILE="$1"
      fi
      shift
      ;;
  esac
done

# Validate input
if [[ -n "$PROMPT_FILE" ]]; then
  if [[ ! -f "$PROMPT_FILE" ]]; then
    echo "ERROR: prompt file not found: $PROMPT_FILE" >&2
    exit 1
  fi
  PROMPT="$(cat "$PROMPT_FILE")"
fi

if [[ -z "$PROMPT" ]]; then
  echo "ERROR: no prompt provided. Pass a string or --prompt-file <path>." >&2
  exit 1
fi

# Build codex command
# Note: codex respects profile-scoped keys over top-level. We override the
# active profile's reasoning_summary explicitly. Active profile in
# ~/.codex/config.toml is `monorepo` — but we cover the common ones to be safe.
CODEX_ARGS=(
  -c 'sandbox_policy.network_access=true'
  -c 'model_reasoning_summary="none"'
  -c 'profiles.monorepo.model_reasoning_summary="none"'
  -c 'profiles.SISO.model_reasoning_summary="none"'
  -c 'profiles.fast.model_reasoning_summary="none"'
  -c 'profiles.enhanced.model_reasoning_summary="none"'
  -c 'profiles.full.model_reasoning_summary="none"'
  --model gpt-5.3-codex-spark
  exec
  --sandbox workspace-write
)

# Run
if [[ -n "$OUTPUT_FILE" ]]; then
  if codex "${CODEX_ARGS[@]}" "$PROMPT" > "$OUTPUT_FILE" 2>&1; then
    echo "PASS: spark output written to $OUTPUT_FILE ($(wc -l < "$OUTPUT_FILE") lines)" >&2
    exit 0
  else
    echo "FAIL: spark call errored. See $OUTPUT_FILE for details." >&2
    exit 3
  fi
else
  codex "${CODEX_ARGS[@]}" "$PROMPT"
fi
