#!/usr/bin/env bash
# forge.sh — resolve a skill/subsystem target for the forge-skill loop.
# Usage: forge.sh resolve <skill-name|path>   -> prints the absolute target dir
# The loop orchestration itself lives in SKILL.md (Opus drives rounds); this just
# resolves "task" -> the skill's source dir so the loop can read/edit the real files.
set -euo pipefail

SKILLS_SRC="$HOME/SISO_Workspace/SISO_Agent_Base/templates/profile/skills"
CMD="${1:-resolve}"
ARG="${2:-}"

resolve() {
  local t="$1"
  [ -z "$t" ] && { echo "ERROR: need a skill name or path" >&2; exit 1; }
  # absolute path that exists?
  if [ -e "$t" ]; then printf '%s\n' "$(cd "$t" 2>/dev/null && pwd || dirname "$t")"; return; fi
  # skill name -> source dir (canonical, follows symlink target so edits hit source)
  if [ -d "$SKILLS_SRC/$t" ]; then printf '%s\n' "$SKILLS_SRC/$t"; return; fi
  # skill name -> ~/.claude/skills/<t> (resolve symlink to its real source)
  if [ -L "$HOME/.claude/skills/$t" ]; then printf '%s\n' "$(readlink "$HOME/.claude/skills/$t")"; return; fi
  if [ -d "$HOME/.claude/skills/$t" ]; then printf '%s\n' "$HOME/.claude/skills/$t"; return; fi
  echo "ERROR: could not resolve target '$t' (not a path, not a skill under $SKILLS_SRC or ~/.claude/skills)" >&2
  exit 1
}

case "$CMD" in
  resolve) resolve "$ARG" ;;
  *) echo "usage: forge.sh resolve <skill-name|path>" >&2; exit 1 ;;
esac
