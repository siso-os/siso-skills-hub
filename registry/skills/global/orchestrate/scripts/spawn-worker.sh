#!/bin/bash
# Usage: spawn-worker.sh NAME ROLE TASK_ID MODEL LANE -- [ARGV...]
set -euo pipefail
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$SCRIPT_DIR/lib.sh"
[ "$#" -ge 6 ] || die "usage: spawn-worker.sh NAME ROLE TASK_ID MODEL LANE -- [ARGV...]"
NAME=$1 ROLE=$2 TASK_ID=$3 MODEL=$4 LANE=$5
shift 5
[ "${1:-}" = "--" ] || die "usage: spawn-worker.sh NAME ROLE TASK_ID MODEL LANE -- [ARGV...]"
shift
depth=${ORCH_DEPTH:-0}
case "$depth" in ''|*[!0-9]*) depth=0 ;; esac
[ "$depth" -lt 1 ] || { printf 'REFUSE %s: ORCH_DEPTH=%s exceeds max depth 1\n' "$NAME" "$depth" >&2; exit 3; }
MAX_LIVE=${MAX_LIVE:-6}
live_count=$("$HERDR" agent list | python3 -c 'import json,sys;print(sum(1 for a in json.load(sys.stdin).get("result",{}).get("agents",[]) if a.get("agent_status")!="done"))')
[ "$live_count" -lt "$MAX_LIVE" ] || { printf 'REFUSE %s: live agents %s >= MAX_LIVE %s\n' "$NAME" "$live_count" "$MAX_LIVE" >&2; exit 3; }
added=0 root_pane=""
trap 'if [ "$root_pane" != "" ]; then "$HERDR" pane close "$root_pane" >/dev/null 2>&1 || true; fi; [ "$added" -eq 1 ] && printf "spawn-worker failed; %s remains spawn_state=spawning\n" "$NAME" >&2' ERR
rd=$(run_dir)
"$SCRIPT_DIR/orchestrate-tree.sh" add "$NAME" "$ROLE" "$TASK_ID" "$MODEL" "$LANE"
added=1
mkdir -p "$rd/notes" "$rd/handoffs"
abs_run_dir=$(CDPATH= cd -- "$rd" && pwd -P)
run_id=${ORCH_RUN_ID:-$(basename "$abs_run_dir")}
workspace=${HERDR_WORKSPACE:-}
if [ "$workspace" = "" ]; then
  workspace=$("$HERDR" agent list | python3 -c 'import json,sys; a=json.load(sys.stdin).get("result",{}).get("agents",[]); x=next((v for v in a if v.get("focused")), a[0] if a else {}); print(x.get("workspace_id",""))')
fi
[ "$workspace" != "" ] || die "cannot resolve current herdr workspace"
cwd=$(pwd -P)
tab_info=$("$HERDR" tab create --workspace "$workspace" --cwd "$cwd" --label "$NAME" --no-focus | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result",{}); print(r.get("root_pane",{}).get("pane_id","")); print(r.get("tab",{}).get("tab_id",""))')
root_pane=${tab_info%%$'\n'*}
tab_id=${tab_info#*$'\n'}
[ "$root_pane" != "" ] && [ "$tab_id" != "" ] || die "tab create did not return root pane and tab id"
next_depth=$((depth + 1))
case "$(printf '%s' "$MODEL" | tr '[:upper:]' '[:lower:]')" in
  claude) cmd=(env "ORCH_DEPTH=$next_depth" "ORCH_RUN_ID=$run_id" "RUN_DIR=$abs_run_dir" claude --dangerously-skip-permissions) ;;
  codex) cmd=(env "ORCH_DEPTH=$next_depth" "ORCH_RUN_ID=$run_id" "RUN_DIR=$abs_run_dir" codex -m gpt-5.6-sol -c model_reasoning_effort=xhigh) ;;
  *) die "unknown MODEL: $MODEL (expected claude or codex)" ;;
esac
"$HERDR" agent start "$NAME" --tab "$tab_id" --cwd "$cwd" --no-focus -- "${cmd[@]}" "$@"
terminal_id=""
i=0
while [ "$i" -lt 20 ]; do
  terminal_id=$(resolve_terminal_by_name "$NAME" 2>/dev/null || true)
  [ "$terminal_id" != "" ] && break
  i=$((i + 1))
  sleep 0.25
done
[ "$terminal_id" != "" ] || die "could not capture terminal_id for $NAME"
"$HERDR" pane close "$root_pane" >/dev/null
root_pane=""
tab_agents=$("$HERDR" agent list | python3 -c 'import json,sys; tab=sys.argv[1]; print(sum(1 for a in json.load(sys.stdin).get("result",{}).get("agents",[]) if a.get("tab_id")==tab))' "$tab_id")
[ "$tab_agents" -eq 1 ] || die "expected exactly one live agent in tab $tab_id, found $tab_agents"
"$SCRIPT_DIR/orchestrate-tree.sh" set "$NAME" terminal_id "$terminal_id"
"$SCRIPT_DIR/orchestrate-tree.sh" set "$NAME" status working
python3 -c 'import json,sys,time; p=sys.argv[1]; row=dict(zip(("name","role","task_id","model","lane","terminal_id"),sys.argv[2:])); row.update(ts=int(time.time()),event="spawned"); open(p,"a",encoding="utf-8").write(json.dumps(row,sort_keys=True)+"\n")' "$rd/notes/$NAME.ndjson" "$NAME" "$ROLE" "$TASK_ID" "$MODEL" "$LANE" "$terminal_id"
nohup env ORCH_RUN_ID="$run_id" RUN_DIR="$abs_run_dir" "$SCRIPT_DIR/heartbeat.sh" "$NAME" >/dev/null 2>&1 &
"$SCRIPT_DIR/orchestrate-tree.sh" set "$NAME" spawn_state live
trap - ERR
printf 'spawned %s terminal_id=%s tab=%s\n' "$NAME" "$terminal_id" "$tab_id"
