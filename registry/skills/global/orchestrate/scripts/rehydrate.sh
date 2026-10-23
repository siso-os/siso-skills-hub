#!/bin/bash
# Usage: rehydrate.sh RUN_ID
set -euo pipefail
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$SCRIPT_DIR/lib.sh"
[ "$#" -eq 1 ] || die "usage: rehydrate.sh RUN_ID"
RUN_ID=$1
export ORCH_RUN_ID="$RUN_ID"
if [ "${RUN_DIR:-}" = "" ]; then
  export RUN_DIR=".orchestrate/runs/$RUN_ID"
fi
"$HERDR" session attach "$RUN_ID" >/dev/null 2>&1 || printf 'WARN session attach failed for %s\n' "$RUN_ID" >&2
"$SCRIPT_DIR/orchestrate-tree.sh" reconcile
rd=$(run_dir)
abs_run_dir=$(CDPATH= cd -- "$rd" && pwd -P)
python3 - "$rd/agent-tree.html" <<'PY' | while IFS= read -r name; do
import json, re, sys
text = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r'<script[^>]*id=["\']tree["\'][^>]*>(.*?)</script>', text, re.S)
data = json.loads(m.group(1).replace("<\\/", "</"))
for w in data.get("workers", []):
    if w.get("spawn_state") == "live" and w.get("status") != "complete":
        print(w.get("name", ""))
PY
  [ "$name" != "" ] || continue
  nohup env ORCH_RUN_ID="$RUN_ID" RUN_DIR="$abs_run_dir" "$SCRIPT_DIR/heartbeat.sh" "$name" >/dev/null 2>&1 &
done
python3 - "$rd/agent-tree.html" <<'PY'
import json, re, sys
text = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r'<script[^>]*id=["\']tree["\'][^>]*>(.*?)</script>', text, re.S)
workers = json.loads(m.group(1).replace("<\\/", "</")).get("workers", [])
live = sum(1 for w in workers if w.get("spawn_state") == "live")
complete = sum(1 for w in workers if w.get("status") == "complete")
lost = sum(1 for w in workers if w.get("status") == "LOST")
suspect = sum(1 for w in workers if w.get("status") == "SUSPECT")
print("rehydrated live=%s complete=%s lost=%s suspect=%s" % (live, complete, lost, suspect))
PY
