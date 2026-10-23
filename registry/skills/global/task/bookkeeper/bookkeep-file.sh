#!/usr/bin/env bash
# bookkeeper FILE — the periodic filer. Reads UNFILED rows from .tasks/BOOKKEEPING.jsonl
# and routes each to its real durable home (the /task CLI / a decisions file), then marks
# the row filed. Idempotent: only touches filed:false rows.
#
#   bash bookkeep-file.sh                 # auto-pick the active task (in_progress, else newest backlog)
#   bash bookkeep-file.sh --task TASK-0042
#   bash bookkeep-file.sh --dry-run       # show the routing plan, write nothing
#
# Routing (the per-project "bookkeeping template"):
#   progress -> task log  TASK-N "..." --action note|blocked
#   thought  -> task log  TASK-N "..." --action note
#   learning -> task learn TASK-N "..."
#   trap     -> task learn TASK-N "..."
#   decision -> .tasks/BOOKKEEPING-DECISIONS.md  (loose landing if no DECISION-LOG present)
# A row with verdict:update also gets its superseded predecessor RETRACTED in the ledger
# (filed:true, filed_to:"superseded") so the books don't carry both old and new value.
#
# Safe-by-default: a routing failure leaves the row UNFILED (retried next sweep), never lost.
set -uo pipefail

TASK_ARG=""; DRY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --task) TASK_ARG="${2:-}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    *) shift ;;
  esac
done

find_root() { local d="$PWD"; while [[ "$d" != "/" ]]; do [[ -d "$d/.tasks" || -d "$d/.git" ]] && { echo "$d"; return; }; d="$(dirname "$d")"; done; echo "$PWD"; }
ROOT="$(find_root)"
LEDGER="$ROOT/.tasks/BOOKKEEPING.jsonl"
[[ -f "$LEDGER" ]] || { echo "bookkeeper-file: no ledger at $LEDGER"; exit 0; }

# locate the task CLI (centralized, symlinked in)
TASK_CLI=""
for c in "$HOME/.claude/skills/task/scripts/task.py" "$ROOT/.claude/skills/task/scripts/task.py"; do
  [[ -f "$c" ]] && { TASK_CLI="$c"; break; }
done

# pick the active task if not given: newest in_progress, else newest backlog (by mtime)
if [[ -z "$TASK_ARG" ]]; then
  for state in in_progress backlog; do
    cand="$(ls -t "$ROOT/.tasks/$state" 2>/dev/null | grep -E '^TASK-' | head -1 || true)"
    [[ -n "$cand" ]] && { TASK_ARG="$cand"; break; }
  done
fi

DECISIONS_OUT="$ROOT/.tasks/BOOKKEEPING-DECISIONS.md"

python3 - "$LEDGER" "$DRY" "$TASK_ARG" "$DECISIONS_OUT" "$TASK_CLI" "$ROOT" <<'PY'
import json, sys, os, subprocess
ledger, dry, task, dec_out, cli, root = sys.argv[1], sys.argv[2]=="1", sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]

rows = []
for line in open(ledger, errors='ignore'):
    line=line.strip()
    if not line: continue
    try: rows.append(json.loads(line))
    except Exception: rows.append({"_raw": line})

def route(e):
    t = e.get("type")
    if t == "progress": return ("task-log", "blocked" if "blocked" in (e.get("text","").lower()) else "note")
    if t == "thought":  return ("task-log", "note")
    if t in ("learning","trap"): return ("task-learn", None)
    if t == "decision": return ("decision-file", None)
    return (None, None)

def norm(s): return "".join(ch for ch in (s or "").lower() if ch.isalnum())

# index existing FILED rows by normalized text, so an update can retract its predecessor
filed_by_text = {}
for e in rows:
    if isinstance(e, dict) and e.get("filed") and e.get("text"):
        filed_by_text.setdefault(norm(e["text"]), []).append(e)

planned, filed, retracted = [], 0, 0
def task_write(sink, action, text):
    if not (cli and task): return False
    try:
        if sink == "task-learn":
            r = subprocess.run(["python3",cli,"learn",task,text], capture_output=True, cwd=root)
        else:
            r = subprocess.run(["python3",cli,"log",task,text,"--action",action], capture_output=True, cwd=root)
        return r.returncode == 0
    except Exception:
        return False

for e in rows:
    if "_raw" in e or e.get("filed"): continue
    sink, action = route(e)
    planned.append((e.get("type"), sink, e.get("verdict","new"), (e.get("text","") or "")[:70]))
    if dry: continue
    ok = False
    if sink in ("task-log","task-learn"):
        ok = task_write(sink, action, e.get("text",""))
    elif sink == "decision-file":
        try:
            with open(dec_out,"a") as f:
                f.write(f"- [{e.get('ts','')}] {e.get('text','')}  ({e.get('evidence','')})\n")
            ok = True
        except Exception:
            ok = False
    if ok:
        e["filed"]=True; e["filed_to"]=sink; filed+=1
        # supersession: retract the older filed row this update replaces
        if e.get("verdict")=="update" and e.get("supersedes"):
            key = norm(e["supersedes"])
            # match against any filed row whose text contains the superseded gist (loose)
            for cand in rows:
                if cand is e or not isinstance(cand,dict): continue
                if cand.get("filed") and cand.get("filed_to")!="superseded" and cand.get("text"):
                    ct = norm(cand["text"])
                    if key and (key in ct or ct in key):
                        cand["filed_to"]="superseded"; retracted+=1; break

if dry:
    print(f"DRY-RUN — task={task or 'NONE'} cli={'yes' if cli else 'MISSING'} — {len(planned)} unfiled row(s):")
    for typ,sink,verdict,txt in planned:
        print(f"  {typ:9} {verdict:6} -> {sink or 'DROP':14} {txt}")
    sys.exit(0)

tmp = ledger + ".tmp"
open(tmp,"w").write("\n".join(json.dumps(e, ensure_ascii=False) for e in rows)+"\n")
os.replace(tmp, ledger)
print(f"bookkeeper-file: filed {filed} row(s){', retracted '+str(retracted)+' superseded' if retracted else ''} into task={task or 'NONE'}")
PY
