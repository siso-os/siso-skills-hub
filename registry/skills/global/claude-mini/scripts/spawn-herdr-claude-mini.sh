#!/usr/bin/env bash
set -euo pipefail

cwd="$PWD"
label="Claude Mini"
mode="interactive"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cwd)
      cwd="${2:?missing value for --cwd}"
      shift 2
      ;;
    --label)
      label="${2:?missing value for --label}"
      shift 2
      ;;
    --agents)
      mode="agents"
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: spawn-herdr-claude-mini.sh [--cwd PATH] [--label LABEL] [--agents]

Creates a new tab in the focused Herdr workspace and launches MiniMax-backed
Claude Code via claude-mini.

Options:
  --cwd PATH      Project root for the worker. Default: current directory.
  --label LABEL   Herdr tab label. Default: Claude Mini.
  --agents        Launch `claude-mini agents` instead of `claude-mini`.
EOF
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ "${HERDR_ENV:-}" != "1" ]]; then
  echo "HERDR_ENV is not 1; run this from inside a Herdr-managed pane." >&2
  exit 1
fi

workspace_id="$(
  herdr workspace list |
    python3 -c 'import sys,json; ws=json.load(sys.stdin)["result"]["workspaces"]; print(next(w["workspace_id"] for w in ws if w.get("focused")))'
)"

tab_json="$(herdr tab create --workspace "$workspace_id" --label "$label" --no-focus)"
pane_id="$(printf '%s' "$tab_json" | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["root_pane"]["pane_id"])')"

if [[ "$mode" == "agents" ]]; then
  cmd="cd $(printf '%q' "$cwd") && claude-mini agents"
else
  cmd="cd $(printf '%q' "$cwd") && claude-mini"
fi

herdr pane run "$pane_id" "$cmd"
printf '%s\n' "$pane_id"
