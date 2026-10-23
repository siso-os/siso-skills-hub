#!/usr/bin/env bash
# extract.sh — fire-on-mistake lesson extractor
# Usage: extract.sh <transcript_path> [hint]
#
# Reads the session transcript (Claude JSONL or Codex JSONL), extracts the
# mistake lesson, and writes one feedback_*.md file to the ingest drop dir.
#
# Safe contract:
#   - Missing transcript or claude-mini failure → exit 0 silently, write nothing.
#   - Duplicate (same slug already in drop dir) → skip, exit 0.
#   - Never breaks the caller.
#
# Drop dirs (matches ingest_reflect_lessons.py GLOBS):
#   ~/.claude/lessons/feedback_<slug>.md
#
# Invoked fire-and-forget (nohup ... &) — never block the calling agent.

set -euo pipefail

TRANSCRIPT="${1:-}"
HINT="${2:-}"
DROP_DIR="$HOME/.claude/lessons"
CLAUDE_MINI="$HOME/bin/claude-mini"
TMP_TRANSCRIPT="/tmp/lesson-extract-transcript-$$.txt"

# --- guards ---

# If no transcript path given, try to auto-find the newest one for the caller's cwd
if [[ -z "$TRANSCRIPT" ]]; then
  # Try Claude project sessions (cwd-based slug)
  CWD_SLUG="$(python3 -c "import re,os; print(re.sub(r'[/_.]','-',os.getcwd()))" 2>/dev/null | sed 's/^-//' || true)"
  if [[ -n "$CWD_SLUG" ]]; then
    TRANSCRIPT="$(ls -t "$HOME/.claude/projects/-${CWD_SLUG}"/*.jsonl 2>/dev/null | head -1 || true)"
  fi
fi

# Still missing? Try Codex today's sessions
if [[ -z "$TRANSCRIPT" || ! -f "$TRANSCRIPT" ]]; then
  TRANSCRIPT="$(ls -t "$HOME/.codex/sessions/$(date +%Y)/$(date +%m)/$(date +%d)"/rollout-*.jsonl 2>/dev/null | head -1 || true)"
fi

# If still missing, silently exit
if [[ -z "$TRANSCRIPT" || ! -f "$TRANSCRIPT" ]]; then
  exit 0
fi

if [[ ! -x "$CLAUDE_MINI" ]]; then
  exit 0
fi

mkdir -p "$DROP_DIR"

# --- extract last ~200 turns from the transcript (keep it small for claude-mini) ---

# For Claude JSONL: pull human/assistant messages; for Codex JSONL: pull message events
python3 - "$TRANSCRIPT" "$TMP_TRANSCRIPT" <<'PY'
import json, sys, os

src = sys.argv[1]
dst = sys.argv[2]
lines = []

try:
    with open(src, "r", encoding="utf-8", errors="replace") as f:
        raw_lines = f.readlines()
except OSError:
    sys.exit(0)

# Parse each JSONL line and extract readable text
messages = []
for line in raw_lines:
    line = line.strip()
    if not line:
        continue
    try:
        obj = json.loads(line)
    except Exception:
        continue

    # Claude Code JSONL format
    msg_type = obj.get("type", "")
    if msg_type == "say":
        role = obj.get("say", "")
        text = obj.get("text", "") or obj.get("content", "")
        if text and role in ("human", "assistant", "user", "error"):
            messages.append(f"[{role}] {text[:800]}")

    # Alternate Claude format
    elif "message" in obj and isinstance(obj["message"], dict):
        m = obj["message"]
        role = m.get("role", "")
        content = m.get("content", "")
        if isinstance(content, list):
            text = " ".join(c.get("text", "") for c in content if isinstance(c, dict))
        else:
            text = str(content)
        if role and text:
            messages.append(f"[{role}] {text[:800]}")

    # Codex JSONL format
    elif msg_type == "response_item":
        payload = obj.get("payload", {})
        role = payload.get("role", "")
        content = payload.get("content", "")
        if isinstance(content, list):
            text = " ".join(
                c.get("text", "") for c in content
                if isinstance(c, dict) and c.get("type") == "output_text"
            )
        else:
            text = str(content)
        if role and text.strip():
            messages.append(f"[{role}] {text[:800]}")

# Take last 200 messages
tail = messages[-200:] if len(messages) > 200 else messages
with open(dst, "w", encoding="utf-8") as f:
    f.write("\n\n".join(tail))
PY

# If extraction produced nothing, clean up and exit silently
if [[ ! -s "$TMP_TRANSCRIPT" ]]; then
  rm -f "$TMP_TRANSCRIPT"
  exit 0
fi

HINT_LINE=""
if [[ -n "$HINT" ]]; then
  HINT_LINE="The caller flagged this hint about what went wrong: ${HINT}"
fi

# --- build extraction prompt ---

PROMPT="You are a mistake-lesson extractor. Read the conversation tail below and extract ONE lesson.

${HINT_LINE}

Instructions:
1. Find the mistake: a wrong assumption, broken build, user correction, or wasted work.
   Look for patterns like: the agent claimed X but it was Y; a verification that caught
   an unchecked claim; Shaan saying 'actually' or 'no' or 'you missed'; a build/test failure.
2. If no clear mistake is present, output exactly: NO_LESSON_FOUND
3. If a mistake IS found, output ONLY a valid markdown file in this exact format (no extra text):

---
name: <slug-with-hyphens-lowercase-max-60-chars>
description: One-line summary of the lesson (what rule prevents this mistake)
tags: [global]
---

# <Slug Title>

**When:** <specific incident — what happened, when in the conversation>
**Why:** <root cause — what assumption/gap caused it>
**Apply:** <concrete rule for future agents — how to prevent this exactly>

Rules:
- The slug must be unique and descriptive (e.g. verify-before-claiming-done)
- description must be a single line (NO newlines inside the value) — this is a hard YAML law
- Be precise, not generic. 'verify output' is bad; 'run the binary and read stdout before claiming it passes' is good.
- Lesson body must be ≥40 characters total

--- CONVERSATION TAIL ---
$(cat "$TMP_TRANSCRIPT")
--- END ---"

# --- call claude-mini, capture output ---

TMP_OUTPUT="/tmp/lesson-extract-output-$$.md"

set +e
"$CLAUDE_MINI" -p "$PROMPT" > "$TMP_OUTPUT" 2>/dev/null
EXIT_CODE=$?
set -e

rm -f "$TMP_TRANSCRIPT"

if [[ $EXIT_CODE -ne 0 || ! -s "$TMP_OUTPUT" ]]; then
  rm -f "$TMP_OUTPUT"
  exit 0
fi

# Check if model said no lesson found
if grep -qi "^NO_LESSON_FOUND" "$TMP_OUTPUT" 2>/dev/null; then
  rm -f "$TMP_OUTPUT"
  exit 0
fi

# --- validate it looks like a lesson file (has frontmatter + body) ---
if ! grep -q "^---" "$TMP_OUTPUT" 2>/dev/null; then
  rm -f "$TMP_OUTPUT"
  exit 0
fi

# Extract the slug from the name: field
SLUG="$(grep -m1 "^name:" "$TMP_OUTPUT" 2>/dev/null | sed 's/^name:[[:space:]]*//' | tr -cd 'a-z0-9-' | cut -c1-60 || true)"

if [[ -z "$SLUG" ]]; then
  # Fallback slug from hint or timestamp
  if [[ -n "$HINT" ]]; then
    SLUG="$(echo "$HINT" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/-\+/-/g' | sed 's/^-//' | cut -c1-60)"
  else
    SLUG="auto-$(date +%Y%m%d%H%M%S)"
  fi
fi

TARGET="$DROP_DIR/feedback_${SLUG}.md"

# Dedupe: if a file with this slug already exists, skip
if [[ -f "$TARGET" ]]; then
  rm -f "$TMP_OUTPUT"
  exit 0
fi

# --- write the lesson file ---
cp "$TMP_OUTPUT" "$TARGET"
rm -f "$TMP_OUTPUT"

exit 0
