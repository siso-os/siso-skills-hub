#!/bin/bash
# trigger.sh — fire-and-forget async Codex review
# Usage: trigger.sh --changes <file_or_dir> --context "<context>"
set -euo pipefail

REVIEW_BASE="${CODEX_REVIEW_BASE:-$HOME/.claude/.codex-reviews}"
PENDING_DIR="$REVIEW_BASE/pending"

usage() {
    cat <<'EOF'
Usage: trigger.sh --changes <file_or_dir> --context "<context>"

Options:
  --changes   File or directory to review (required)
  --context   Description of what was just done (required)
  --help      Show this help

Example:
  trigger.sh --changes convex/ --context "added webcamSessions schema"
EOF
    exit 1
}

# Parse args
CHANGES=""
CONTEXT=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --changes) CHANGES="$2"; shift 2 ;;
        --context) CONTEXT="$2"; shift 2 ;;
        --help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$CHANGES" ]] && echo "ERROR: --changes is required" >&2 && usage
[[ -z "$CONTEXT" ]] && echo "ERROR: --context is required" >&2 && usage

# Ensure dirs exist
mkdir -p "$REVIEW_BASE/pending" "$REVIEW_BASE/done" "$REVIEW_BASE/read"

# Generate review ID (timestamp-based)
REVIEW_ID=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PENDING_FILE="$PENDING_DIR/${REVIEW_ID}.json"

# Resolve absolute paths for files
FILES_JSON="[]"
if [[ -e "$CHANGES" ]]; then
    if [[ -d "$CHANGES" ]]; then
        # Directory: list files
        mapfile -t FILE_LIST < <(find "$CHANGES" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" \) | head -20)
        FILES_JSON=$(printf '%s\n' "${FILE_LIST[@]}" | jq -R . | jq -s .)
    else
        # Single file
        FILES_JSON=$(echo "$CHANGES" | jq -R . | jq -s .)
    fi
fi

# Write job spec
jq -n \
    --arg id "$REVIEW_ID" \
    --arg ctx "$CONTEXT" \
    --argjson files "$FILES_JSON" \
    '{
        review_id: $id,
        files: $files,
        context: $ctx,
        created_at: $id,
        status: "pending"
    }' > "$PENDING_FILE"

echo "Review job queued: $REVIEW_ID"
echo "  files: $CHANGES"
echo "  context: $CONTEXT"
echo "  pending: $PENDING_FILE"

# Spawn background worker via claude CLI if available
if command -v claude &>/dev/null; then
    claude --print <<'WORKER_SCRIPT' &
# Background worker: reads pending job, calls codex:rescue, writes done file

BASEDIR="$(dirname "$0")"
REVIEW_BASE="${CODEX_REVIEW_BASE:-$HOME/.claude/.codex-reviews}"
PENDING_DIR="$REVIEW_BASE/pending"
DONE_DIR="$REVIEW_BASE/done"

# Pick oldest pending job
JOB=$(ls -t "$PENDING_DIR/"*.json 2>/dev/null | tail -1)
[[ -z "$JOB" ]] && exit 0

# Read job
REVIEW_ID=$(jq -r '.review_id' "$JOB")
FILES=$(jq -r '.files[]' "$JOB" 2>/dev/null | tr '\n' ' ')
CONTEXT=$(jq -r '.context' "$JOB")

# Call codex:rescue via /codex:rescue skill invocation pattern
# This requires a Claude Code session with Codex configured
# The worker would invoke: /codex:rescue with the changes + context

# For now, mark as needs_processing (actual Codex call happens in a full Haiku session)
DONE_FILE="$DONE_DIR/${REVIEW_ID}.json"
jq -n \
    --arg id "$REVIEW_ID" \
    --arg ctx "$CONTEXT" \
    --argjson f "$FILES" \
    '{
        review_id: $id,
        files_reviewed: $f,
        context: $ctx,
        codex_verdict: "pending",
        issues: [],
        suggestions: [],
        reviewed_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
        status: "needs_codex_call"
    }' > "$DONE_FILE"

rm -f "$JOB"
echo "Worker: processed $REVIEW_ID"
WORKER_SCRIPT
    echo "Background worker spawned (PID: $!)"
else
    echo "Note: claude CLI not available for background worker. Job queued at:"
    echo "  $PENDING_FILE"
    echo "Run manually or configure a separate worker process."
fi

echo ""
echo "Use 'cat $PENDING_FILE' to see job details."
echo "Results will appear in $REVIEW_BASE/done/ when complete."
