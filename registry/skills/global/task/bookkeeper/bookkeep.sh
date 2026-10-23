#!/usr/bin/env bash
# bookkeeper CAPTURE (non-Claude / Codex path) — fire-and-forget reconciling filer.
#
#   bash bookkeep.sh "decided X over Y because Z; hit trap W"   # note = primary signal (preferred)
#   bash bookkeep.sh                                            # no note -> transcript-scan fallback
#
# It is a RECONCILER, not a blind appender: before writing it loads the EXISTING books
# (active task goal/learnings + recent ledger entries) so the model dedupes (skips dups,
# supersedes stale ones) instead of piling up near-duplicates.
#
# If you ARE Claude: prefer a native Agent({model:'haiku',run_in_background:true}) given the
# same note + books — same Bifrost route, steerable. This script is for Codex / no-Agent-tool callers.
#
# Bifrost (ANTHROPIC_BASE_URL=localhost:8080/anthropic) serves the Haiku id via MiniMax-M3.
# Safe-by-default: any failure => exit 0, write nothing.
set -uo pipefail

HINT="${1:-}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_TMPL="$HERE/extract-prompt.txt"
BIFROST="${ANTHROPIC_BASE_URL:-http://localhost:8080/anthropic}"
HAIKU_MODEL="${BOOKKEEP_MODEL:-claude-haiku-4-5-20251001}"
TURNS="${BOOKKEEP_TURNS:-40}"

find_root() { local d="$PWD"; while [[ "$d" != "/" ]]; do [[ -d "$d/.tasks" || -d "$d/.git" ]] && { echo "$d"; return; }; d="$(dirname "$d")"; done; echo "$PWD"; }
ROOT="$(find_root)"; mkdir -p "$ROOT/.tasks" 2>/dev/null
LEDGER="$ROOT/.tasks/BOOKKEEPING.jsonl"
[[ -f "$PROMPT_TMPL" ]] || exit 0

# --- gather EXISTING BOOKS: recent ledger entries + active task goal/learnings ---
BOOKS="$(python3 - "$LEDGER" "$ROOT" <<'PY' 2>/dev/null || true
import json, sys, os, glob
ledger, root = sys.argv[1], sys.argv[2]
lines=[]
# recent ledger entries (the running books)
if os.path.exists(ledger):
    rows=[json.loads(l) for l in open(ledger, errors='ignore') if l.strip()][-40:]
    for r in rows:
        lines.append(f"- ({r.get('type')}) {r.get('text','')}")
# active task: goal + learnings from newest in_progress task.json
tj=sorted(glob.glob(os.path.join(root,'.tasks','in_progress','*','task.json')), key=os.path.getmtime, reverse=True)
if tj:
    try:
        t=json.load(open(tj[0]))
        if t.get('title'): lines.append(f"- (task-goal) {t['title']}")
        for L in (t.get('learnings') or [])[:15]:
            txt=L.get('text') if isinstance(L,dict) else L
            if txt: lines.append(f"- (learning) {txt}")
        for fdm in (t.get('fundamentals') or [])[:10]:
            txt=fdm.get('text') if isinstance(fdm,dict) else fdm
            if txt: lines.append(f"- (fundamental) {txt}")
    except Exception: pass
print('\n'.join(lines[-60:]) if lines else '(books are empty — nothing recorded yet)')
PY
)"

# --- transcript excerpt: only as BACKUP (used when note is thin/absent) ---
CWD_SLUG="$(echo "$PWD" | sed 's/\//-/g')"
TRANSCRIPT="$(ls -t "$HOME/.claude/projects/-${CWD_SLUG#-}"/*.jsonl 2>/dev/null | head -1 || true)"
[[ -z "$TRANSCRIPT" ]] && TRANSCRIPT="$(ls -t "$HOME/.codex/sessions/$(date +%Y/%m/%d)"/rollout-*.jsonl 2>/dev/null | head -1 || true)"
EXCERPT=""
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  EXCERPT="$(python3 - "$TRANSCRIPT" "$TURNS" <<'PY' 2>/dev/null || true
import json, sys
path,n=sys.argv[1],int(sys.argv[2]); rows=[]
for line in open(path,errors='ignore'):
    line=line.strip()
    if not line: continue
    try: o=json.loads(line)
    except Exception: continue
    msg=o.get('message') or o; role=msg.get('role') or o.get('role') or o.get('type')
    content=msg.get('content'); text=''
    if isinstance(content,str): text=content
    elif isinstance(content,list): text='\n'.join(c['text'] for c in content if isinstance(c,dict) and c.get('type')=='text' and c.get('text'))
    elif isinstance(o.get('text'),str): text=o['text']
    text=(text or '').strip()
    if text and role in ('user','assistant','human','agent',None): rows.append(f"[{role or '?'}] {text}")
print('\n'.join(rows[-n:])[-8000:])
PY
)"
fi
[[ -z "$HINT" && -z "$EXCERPT" ]] && exit 0

# --- build prompt (note primary, books for reconciliation, transcript backup) ---
PROMPT="$(python3 - "$PROMPT_TMPL" "$HINT" "$EXCERPT" "$BOOKS" <<'PY' 2>/dev/null || true
import sys
tmpl=open(sys.argv[1]).read()
print(tmpl.replace('{{CALLER_HINT}}', sys.argv[2] or '(no note given — infer from transcript)')
          .replace('{{TRANSCRIPT_EXCERPT}}', sys.argv[3] or '(none)')
          .replace('{{EXISTING_BOOKS}}', sys.argv[4] or '(books are empty)'))
PY
)"
[[ -z "$PROMPT" ]] && exit 0

REQ="$(python3 - "$HAIKU_MODEL" "$PROMPT" <<'PY' 2>/dev/null || true
import json,sys
print(json.dumps({"model":sys.argv[1],"max_tokens":2000,"messages":[{"role":"user","content":sys.argv[2]}]}))
PY
)"
[[ -z "$REQ" ]] && exit 0
# Reliability: small models occasionally return empty/truncated JSON. Retry once if the
# response has no parseable array. (A real [] on the 2nd try is accepted as genuine.)
RESP=""
for attempt in 1 2; do
  RESP="$(curl -s --max-time 60 "$BIFROST/v1/messages" -H "content-type: application/json" -H "x-api-key: local" -H "anthropic-version: 2023-06-01" -d "$REQ" 2>/dev/null || true)"
  PARSES="$(python3 - "$RESP" <<'PY' 2>/dev/null || echo no
import json,sys
try: txt=''.join(b.get('text','') for b in json.loads(sys.argv[1]).get('content',[]) if b.get('type')=='text')
except Exception: print('no'); sys.exit()
txt=txt.strip().lstrip('`');
if txt.startswith('json'): txt=txt[4:]
s,e=txt.find('['),txt.rfind(']')
print('yes' if (s>=0 and e>s) else 'no')
PY
)"
  [[ "$PARSES" == "yes" ]] && break
done
[[ -z "$RESP" ]] && exit 0

# --- validate + append rows (new|update only; dups were dropped by the model) ---
BY="${BOOKKEEP_BY:-${HERDR_AGENT_LABEL:-agent}}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
python3 - "$LEDGER" "$TS" "$BY" "$RESP" <<'PY' 2>/dev/null || exit 0
import json, sys
ledger, ts, by, resp = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
try: txt=''.join(b.get('text','') for b in json.loads(resp).get('content',[]) if b.get('type')=='text')
except Exception: sys.exit(0)
txt=txt.strip().lstrip('`')
if txt.startswith('json'): txt=txt[4:]
s,e=txt.find('['),txt.rfind(']')
if s<0 or e<0: sys.exit(0)
try: entries=json.loads(txt[s:e+1])
except Exception: sys.exit(0)
VALID={"decision","learning","progress","trap","thought"}
wrote=0
with open(ledger,"a") as f:
    for x in entries if isinstance(entries,list) else []:
        if not isinstance(x,dict): continue
        t=x.get("type"); text=(x.get("text") or "").strip()
        if t not in VALID or not text: continue
        verdict=x.get("verdict","new")
        if verdict not in ("new","update"): continue   # dup or junk -> skip
        conf=x.get("confidence","med")
        if isinstance(conf,(int,float)): conf="high" if conf>=0.8 else "med" if conf>=0.5 else "low"
        if conf not in ("high","med","low"): conf="med"
        row={"ts":ts,"type":t,"text":text,"evidence":x.get("evidence",""),"confidence":conf,
             "verdict":verdict,"by":by,"task":None,"filed":False,"filed_to":None}
        if verdict=="update" and x.get("supersedes"): row["supersedes"]=x["supersedes"]
        f.write(json.dumps(row,ensure_ascii=False)+"\n"); wrote+=1
sys.stderr.write(f"bookkeeper: added {wrote} entr{'y' if wrote==1 else 'ies'} (dups skipped) to {ledger}\n")
PY
exit 0
