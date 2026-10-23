#!/bin/bash
# Usage: watchdog.sh
set -euo pipefail
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$SCRIPT_DIR/lib.sh"
rd=$(run_dir)
stale=${ORCH_STALE_SEC:-600}
set +e
out=$(python3 - "$rd" "$stale" <<'PY'
import json, os, re, sys, time
rd, stale, now = sys.argv[1], int(sys.argv[2]), int(time.time())
text = open(os.path.join(rd, "agent-tree.html"), encoding="utf-8").read()
m = re.search(r'<script[^>]*id=.tree.[^>]*>(.*?)</script>', text, re.S)
workers = json.loads(m.group(1).replace("<\\/", "</")).get("workers", [])
def heartbeat_ts(name):
    path, last = os.path.join(rd, "notes", "%s.heartbeat.ndjson" % name), 0
    try:
        for line in open(path, encoding="utf-8"):
            try:
                last = max(last, int(json.loads(line).get("ts", 0)))
            except Exception:
                pass
    except FileNotFoundError:
        pass
    return last
for w in workers:
    if w.get("spawn_state") != "live":
        continue
    name = w.get("name", "")
    note = os.path.join(rd, "notes", "%s.ndjson" % name)
    note_ts = int(os.path.getmtime(note)) if os.path.exists(note) else 0
    age = now - max(note_ts, heartbeat_ts(name))
    if age <= stale and w.get("status") == "SUSPECT":
        print("CLEAR\t%s\t%s" % (name, age))
    if age > stale and w.get("status") in ("working", "SUSPECT"):
        print("SUSPECT\t%s\t%s" % (name, age))
done = {x.get(k) for x in workers for k in ("name", "task_id") if x.get("status") == "complete"}
in_progress = [w for w in workers if w.get("task_state") == "in_progress"]
ready = 0
for w in in_progress:
    blockers = w.get("blocked_by") or w.get("depends_on") or []
    if isinstance(blockers, str):
        blockers = [b.strip() for b in blockers.split(",") if b.strip()]
    unresolved = [b for b in blockers if b not in done]
    if not unresolved:
        ready += 1
if in_progress and ready == 0:
    print("DEADLOCK\t%s\t0" % len(in_progress))
    sys.exit(2)
PY
)
rc=$?
set -e
printf '%s\n' "$out" | while IFS="$(printf '\t')" read -r kind name age; do
  [ "$kind" != "" ] || continue
  case "$kind" in
    SUSPECT)
      "$SCRIPT_DIR/orchestrate-tree.sh" set "$name" status SUSPECT
      "$SCRIPT_DIR/orchestrate-tree.sh" set "$name" suspect_reason "stale:${age}s"
      printf 'NEEDS-YOU %s stale=%ss\n' "$name" "$age"
      ;;
    CLEAR)
      "$SCRIPT_DIR/orchestrate-tree.sh" set "$name" status working
      "$SCRIPT_DIR/orchestrate-tree.sh" set "$name" suspect_reason ""
      ;;
    DEADLOCK)
      printf 'DEADLOCK in_progress=%s ready=%s\n' "$name" "$age"
      ;;
  esac
done
"$SCRIPT_DIR/render-board.sh" >/dev/null || printf 'WARN render-board failed\n' >&2
[ "$rc" -eq 2 ] && exit 2
[ "$rc" -eq 0 ] || exit "$rc"
