#!/bin/bash
# Usage: heartbeat.sh NAME
set -euo pipefail
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$SCRIPT_DIR/lib.sh"
[ "$#" -eq 1 ] || die "usage: heartbeat.sh NAME"
NAME=$1
interval=${ORCH_HEARTBEAT_SEC:-60}
rd=$(run_dir)
mkdir -p "$rd/notes"
file="$rd/notes/$NAME.heartbeat.ndjson"
while resolve_pane_by_name "$NAME" >/dev/null 2>&1; do
  python3 - "$file" <<'PY'
import json, sys, time
with open(sys.argv[1], "a", encoding="utf-8") as f:
    f.write(json.dumps({"ts": int(time.time()), "beat": True}, sort_keys=True) + "\n")
PY
  sleep "$interval"
done
