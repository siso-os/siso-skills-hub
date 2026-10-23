#!/bin/bash
# Usage: source scripts/lib.sh
set -euo pipefail
HERDR=${HERDR:-$HOME/.local/bin/herdr}
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
die() { printf '%s\n' "$*" >&2; exit 1; }
agent_list_json() { "$HERDR" agent list; }
agent_field() {
  [ "$#" -eq 2 ] || die "usage: agent_field NAME FIELD"
  AGENTS_JSON=$(agent_list_json) python3 - "$1" "$2" <<'PY'
import json, os, sys
name, field = sys.argv[1], sys.argv[2]
agents = json.loads(os.environ["AGENTS_JSON"]).get("result", {}).get("agents", [])
for agent in agents:
    if agent.get("name") == name or agent.get("agent") == name:
        value = agent.get(field, "")
        if value in (None, ""):
            sys.exit(1)
        print(value)
        sys.exit(0)
sys.exit(1)
PY
}
resolve_pane_by_name() { [ "$#" -eq 1 ] || die "usage: resolve_pane_by_name NAME"; agent_field "$1" pane_id; }
resolve_terminal_by_name() { [ "$#" -eq 1 ] || die "usage: resolve_terminal_by_name NAME"; agent_field "$1" terminal_id; }
run_dir() {
  if [ "${RUN_DIR:-}" != "" ]; then
    printf '%s\n' "$RUN_DIR"
    return
  fi
  if [ "${ORCH_RUN_ID:-}" != "" ]; then
    printf '.orchestrate/runs/%s\n' "$ORCH_RUN_ID"
    return
  fi
  if [ -f .orchestrate/current ]; then
    read -r id < .orchestrate/current
    [ "$id" != "" ] || die ".orchestrate/current is empty"
    printf '.orchestrate/runs/%s\n' "$id"
    return
  fi
  die "set RUN_DIR or ORCH_RUN_ID, or run scripts/orchestrate-tree.sh init RUN_ID"
}
tree_file() { printf '%s/agent-tree.html\n' "$(run_dir)"; }
