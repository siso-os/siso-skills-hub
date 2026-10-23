#!/bin/bash
# Usage: render-board.sh
set -euo pipefail
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$SCRIPT_DIR/lib.sh"
rd=$(run_dir)
agents_json=$("$HERDR" agent list 2>/dev/null || printf '{"result":{"agents":[]}}')
AGENTS_JSON="$agents_json" python3 - "$rd" <<'PY'
import datetime as dt, html, json, os, re, sys, time
rd = sys.argv[1]
out_path = os.path.join(rd, "board.html")
now = int(time.time())
stamp = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
def esc(x): return html.escape("" if x is None else str(x), quote=True)
def tree():
    text = open(os.path.join(rd, "agent-tree.html"), encoding="utf-8").read()
    m = re.search(r'<script[^>]*id=["\']tree["\'][^>]*>(.*?)</script>', text, re.S)
    return json.loads(m.group(1).replace("<\\/", "</")) if m else {"workers":[]}
def blocked_text(v):
    if isinstance(v, list): return ", ".join(str(x) for x in v)
    return "" if v in (None, "") else str(v)
def time_ago(ts):
    if not ts: return "n/a"
    s = max(0, now - int(ts))
    if s < 5: return "just now"
    if s < 60: return "%ss ago" % s
    if s < 3600: return "%sm ago" % (s // 60)
    if s < 86400: return "%sh ago" % (s // 3600)
    return "%sd ago" % (s // 86400)
def note_tail(name):
    p = os.path.join(rd, "notes", "%s.ndjson" % name)
    try:
        with open(p, "rb") as f:
            f.seek(0, 2); size = f.tell(); f.seek(max(0, size - 4096)); lines = f.read().splitlines()
        return ((lines[-1] if lines else b"").decode("utf-8", "replace")[:120], int(os.path.getmtime(p)))
    except FileNotFoundError:
        return ("", 0)
def updated_ts(w, note_ts):
    ts = note_ts
    try:
        ts = max(ts, int(dt.datetime.fromisoformat(str(w.get("updated","")).replace("Z","+00:00")).timestamp()))
    except Exception:
        pass
    return ts
def goals_html():
    for n in ("goals.md", "goals.txt"):
        p = os.path.join(rd, n)
        if os.path.exists(p):
            rows = []
            for line in open(p, encoding="utf-8", errors="replace"):
                s = line.strip().lstrip("#-*0123456789. )\t").strip()
                if s: rows.append("<li>%s</li>" % esc(s))
            return "<section><h2>Goals</h2><ul class='goals'>%s</ul></section>" % "".join(rows)
    return ""
def tasks():
    p = os.path.join(rd, "tasks.json")
    if not os.path.exists(p): return []
    data = json.load(open(p, encoding="utf-8"))
    return data if isinstance(data, list) else []
data = tree()
workers = data.get("workers", [])
run_id = data.get("run_id") or os.path.basename(rd)
live = {a.get("terminal_id"): a for a in json.loads(os.environ.get("AGENTS_JSON","{}")).get("result",{}).get("agents",[]) if a.get("terminal_id")}
task_rows, needs, cards = tasks(), [], []
for w in workers:
    name, term = w.get("name",""), w.get("terminal_id","")
    note, note_ts = note_tail(name)
    live_status = live.get(term, {}).get("agent_status", "gone" if term else "unstarted")
    note_need = bool(re.search(r'BLOCKED|action_required|NEEDS-YOU', note, re.I))
    agent_need = w.get("status") == "SUSPECT" or note_need
    if w.get("status") == "SUSPECT": needs.append("%s is SUSPECT" % name)
    if note_need: needs.append("%s note: %s" % (name, note[:80]))
    display = "needs-you" if agent_need else str(live_status).lower()
    cls = re.sub(r'[^a-z0-9_-]+', '-', display)
    ts = updated_ts(w, note_ts)
    note_html = "<span>%s</span>" % esc(note or "no recent note")
    if len(note) > 78:
        note_html = "<details><summary>%s...</summary><code>%s</code></details>" % (esc(note[:78]), esc(note))
    meta = [("role", w.get("role","")), ("lane", w.get("lane","")), ("model", w.get("model","")), ("live", live_status), ("tree", w.get("status","")), ("spawn", w.get("spawn_state",""))]
    meta_html = "".join("<div><b>%s</b><span>%s</span></div>" % (esc(k), esc(v)) for k, v in meta)
    cards.append(({"needs-you":0,"blocked":0,"working":1,"done":2,"idle":3}.get(display,4), name,
        "<article class='card status-%s'><div class='card-header'><div class='card-label'><span class='status-dot %s'></span>%s</div><span class='card-status %s'>%s</span></div><div class='card-meta'>%s<div><b>age</b><span><time data-ts='%s'>%s</time></span></div></div><div class='note'>%s</div><div class='term'>%s</div></article>" %
        (esc(cls), esc(cls), esc(name), esc(cls), esc(display), meta_html, esc(ts * 1000 if ts else ""), esc(time_ago(ts)), note_html, esc(term))))
for t in task_rows:
    bt = blocked_text(t.get("blockedBy",""))
    if str(t.get("status","")).lower() == "blocked" or bt: needs.append("Task %s blocked: %s" % (t.get("id",""), bt or t.get("status","")))
need_label = "%d thing needs you" % len(needs) if len(needs) == 1 else "%d things need you" % len(needs)
banner = "<div class='banner ok'><div>All clear</div><p>Nothing needs you.</p></div>" if not needs else "<div class='banner need'><div>%s</div><ul>%s</ul></div>" % (need_label, "".join("<li>%s</li>" % esc(x) for x in needs))
cards_html = "".join(x[2] for x in sorted(cards, key=lambda x: (x[0], x[1])))
task_html = ""
if task_rows:
    body = "".join("<tr><td>%s</td><td>%s</td><td class='%s'>%s</td><td>%s</td><td>%s</td></tr>" % (esc(t.get("id","")), esc(t.get("subject","")), esc("blocked" if blocked_text(t.get("blockedBy","")) else str(t.get("status","")).lower()), esc(t.get("status","")), esc(t.get("owner","")), esc(blocked_text(t.get("blockedBy","")))) for t in task_rows)
    task_html = "<section><h2>Tasks</h2><div class='table-wrap'><table><thead><tr><th>ID</th><th>Subject</th><th>Status</th><th>Owner</th><th>Blocked By</th></tr></thead><tbody>%s</tbody></table></div></section>" % body
css = """:root{color-scheme:dark;--bg:#0a0e14;--bg-card:#111820;--bg-card-hover:#161d27;--border:#1e2a3a;--text:#c5cdd8;--text-dim:#5c6a7a;--text-bright:#e8edf3;--green:#00ff88;--amber:#ff9f1c;--red:#ff4444;--grey:#555;--blue:#4dabf7;--bar-bg:#1a2332}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:13px/1.45 "IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}main{max-width:1280px;margin:0 auto;padding:16px}h1{font-size:18px;margin:0 0 12px;color:var(--text-bright)}h2{font-size:14px;margin:22px 0 10px;color:var(--text-bright)}.banner{border:1px solid;border-radius:8px;padding:16px;margin-bottom:14px}.banner div{font-size:22px;font-weight:700;letter-spacing:-.01em}.banner p,.banner ul{margin:6px 0 0}.banner.need{background:linear-gradient(90deg,rgba(255,68,68,.2),rgba(255,159,28,.12));border-color:var(--red);color:#ffe7d6;box-shadow:0 0 0 1px rgba(255,68,68,.2)}.banner.ok{background:rgba(0,255,136,.08);border-color:var(--green);color:#d9ffe9}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}.card{background:var(--bg-card);border:1px solid var(--border);border-left:4px solid var(--border);border-radius:8px;padding:14px;transition:background .2s,border-color .2s}.card:hover{background:var(--bg-card-hover)}.card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px}.card-label{display:flex;align-items:center;gap:8px;color:var(--text-bright);font-weight:600;font-size:14px;min-width:0}.status-dot{width:10px;height:10px;border-radius:50%;flex:0 0 auto}.card-status{font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:2px 7px;border-radius:4px;font-weight:600}.status-working{border-left-color:var(--green)}.status-working .status-dot{background:var(--green);animation:pulse 1.5s infinite}.status-working .card-status{color:var(--green);background:rgba(0,255,136,.1)}.status-idle{border-left-color:var(--grey);opacity:.4}.status-idle .status-dot{background:var(--grey)}.status-idle .card-status{color:var(--grey);background:rgba(85,85,85,.12)}.status-done{border-left-color:var(--blue)}.status-done .status-dot{background:var(--blue)}.status-done .card-status{color:var(--blue);background:rgba(77,171,247,.12)}.status-blocked,.status-needs-you{border-left-color:var(--red);box-shadow:0 0 0 1px rgba(255,68,68,.16)}.status-blocked .status-dot,.status-needs-you .status-dot{background:var(--amber);animation:strongPulse .8s infinite}.status-blocked .card-status,.status-needs-you .card-status{color:#ffd2a1;background:rgba(255,68,68,.18)}.status-gone,.status-unstarted,.status-unknown{border-left-color:var(--amber)}.status-gone .status-dot,.status-unstarted .status-dot,.status-unknown .status-dot{background:var(--amber);animation:pulse 2s infinite}.card-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-bottom:10px}.card-meta div{display:flex;justify-content:space-between;gap:8px}.card-meta b{color:var(--text-dim);font-weight:500}.card-meta span{color:var(--text);text-align:right}.note{border-top:1px solid var(--border);padding-top:9px;color:var(--text);word-break:break-word}.note code{display:block;margin-top:6px;white-space:pre-wrap;color:var(--text)}summary{cursor:pointer;color:var(--text-bright)}.term{margin-top:8px;color:var(--text-dim);font-size:11px;word-break:break-all}.goals{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px 24px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;background:var(--bg-card);border:1px solid var(--border)}th,td{padding:8px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}th{color:var(--text-dim);font-weight:500}.blocked{color:var(--red);font-weight:700}footer{margin:22px 0 4px;color:var(--text-dim);font-size:11px}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes strongPulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(255,159,28,.45)}50%{opacity:.55;box-shadow:0 0 0 5px rgba(255,68,68,0)}}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:var(--bg-card)}::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}@media(max-width:600px){main{padding:8px}h1{font-size:16px;margin-bottom:8px}.banner{padding:14px 12px}.banner div{font-size:20px}.banner ul{padding-left:18px}.grid{grid-template-columns:1fr;gap:8px}.card{width:100%;padding:10px}.card-header{flex-direction:column;gap:6px}.card-label{font-size:14px}.status-dot{width:8px;height:8px}.card-meta{grid-template-columns:1fr;gap:5px}.card-meta div{align-items:flex-start}.card-meta b,.card-meta span,.note,.term,td,th{font-size:11px}h2{margin-top:18px}}"""
js = """<script>function timeAgo(ms){if(!ms)return'n/a';const s=Math.floor((Date.now()-ms)/1000);if(s<5)return'just now';if(s<60)return s+'s ago';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago'}document.querySelectorAll('time[data-ts]').forEach(t=>{const v=Number(t.dataset.ts);if(v)t.textContent=timeAgo(v)});</script>"""
doc = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><meta http-equiv='refresh' content='5'><title>Orchestrator Dashboard</title><style>%s</style></head><body><main><h1>Orchestrator Dashboard</h1>%s%s<section><h2>Agents</h2><div class='grid'>%s</div></section>%s<footer>run_id=%s · generated=%s</footer></main>%s</body></html>" % (css, banner, goals_html(), cards_html or "<p>No workers.</p>", task_html, esc(run_id), esc(stamp), js)
tmp = out_path + ".tmp.%s" % os.getpid()
open(tmp, "w", encoding="utf-8").write(doc)
os.replace(tmp, out_path)
print(out_path)
PY
