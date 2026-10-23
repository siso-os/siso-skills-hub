#!/bin/bash
# Usage: orchestrate-tree.sh init RUN_ID | add NAME ROLE TASK_ID MODEL LANE | set NAME FIELD VALUE | get NAME FIELD | list | render | reconcile
set -euo pipefail
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$SCRIPT_DIR/lib.sh"
cmd=${1:-}
[ "$cmd" != "" ] || die "usage: orchestrate-tree.sh init|add|set|get|list|render|reconcile ..."
shift
case "$cmd" in
  init) : ;;
  add|set|get|list|render|reconcile) export ORCH_TREE_RUN_DIR="$(run_dir)" ;;
  *) die "unknown subcommand: $cmd" ;;
esac
if [ "$cmd" = "reconcile" ]; then
  export HERDR_AGENTS_JSON="$("$HERDR" agent list)"
else
  export HERDR_AGENTS_JSON=""
fi
export ORCH_SCRIPT_DIR="$SCRIPT_DIR"
python3 - "$cmd" "$@" <<'PY'
import datetime as dt, html, json, os, re, sys
cmd, args = sys.argv[1], sys.argv[2:]
script_dir = os.environ["ORCH_SCRIPT_DIR"]
def fail(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)
def now():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
def run_dir():
    if cmd == "init":
        if len(args) != 1:
            fail("usage: orchestrate-tree.sh init RUN_ID")
        return os.environ.get("RUN_DIR") or os.path.join(".orchestrate", "runs", args[0])
    return os.environ["ORCH_TREE_RUN_DIR"]
rd = run_dir()
path = os.path.join(rd, "agent-tree.html")
def read_tree():
    try:
        text = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        fail("missing agent tree: %s" % path)
    m = re.search(r'<script[^>]*id=["\']tree["\'][^>]*>(.*?)</script>', text, re.S)
    if not m:
        fail("agent tree json block not found: %s" % path)
    return json.loads(m.group(1).replace("<\\/", "</"))
def table_rows(data):
    rows = []
    for w in data.get("workers", []):
        status = str(w.get("status", ""))
        cls = "suspect" if status == "SUSPECT" else status.lower()
        cells = [w.get(k, "") for k in ("name", "role", "task_id", "model", "lane", "spawn_state", "status", "terminal_id", "updated")]
        rows.append("<tr class='%s'>%s</tr>" % (html.escape(cls), "".join("<td>%s</td>" % html.escape(str(c)) for c in cells)))
    if not rows:
        return "<tr><td colspan='9' class='empty'>No workers yet.</td></tr>"
    return "\n".join(rows)
def render(data):
    data.setdefault("workers", [])
    payload = json.dumps(data, indent=2, sort_keys=True).replace("</", "<\\/")
    tpl_path = os.path.join(os.path.dirname(script_dir), "templates", "agent-tree.template.html")
    try:
        tpl = open(tpl_path, encoding="utf-8").read()
    except FileNotFoundError:
        tpl = "<!doctype html><table><tbody>__TABLE_ROWS__</tbody></table><script type=\"application/json\" id=\"tree\">__TREE_JSON__</script>"
    return tpl.replace("__TABLE_ROWS__", table_rows(data)).replace("__TREE_JSON__", payload)
def write_tree(data):
    os.makedirs(os.path.join(rd, "notes"), exist_ok=True)
    os.makedirs(os.path.join(rd, "handoffs"), exist_ok=True)
    tmp = path + ".tmp.%s" % os.getpid()
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(render(data))
    os.replace(tmp, path)
def parse_value(value):
    try:
        return json.loads(value)
    except Exception:
        return value
def worker(data, name):
    for w in data.get("workers", []):
        if w.get("name") == name:
            return w
    fail("unknown worker: %s" % name)
def handoff_pass(name):
    hp = os.path.join(rd, "handoffs", "%s.result.html" % name)
    try:
        with open(hp, encoding="utf-8", errors="replace") as f:
            ok = any("PASS" in line for line in f)
    except FileNotFoundError:
        return False, hp
    return ok, hp
if cmd == "init":
    rid = args[0]
    data = {"run_id": rid, "created": now(), "workers": []}
    write_tree(data)
    if "RUN_DIR" not in os.environ:
        os.makedirs(".orchestrate", exist_ok=True)
        tmp = ".orchestrate/current.tmp.%s" % os.getpid()
        open(tmp, "w", encoding="utf-8").write(rid + "\n")
        os.replace(tmp, ".orchestrate/current")
    print(path)
elif cmd == "add":
    if len(args) != 5:
        fail("usage: orchestrate-tree.sh add NAME ROLE TASK_ID MODEL LANE")
    name, role, task_id, model, lane = args
    data = read_tree()
    found = None
    for w in data.setdefault("workers", []):
        if w.get("name") == name:
            found = w
            break
    if found and found.get("spawn_state") not in ("spawning", "lost", "LOST"):
        fail("worker already exists and is not recoverable: %s" % name)
    row = found if found is not None else {"name": name, "created": now()}
    row.update({"role": role, "task_id": task_id, "model": model, "lane": lane, "spawn_state": "spawning", "status": "working", "terminal_id": "", "task_state": "in_progress", "blocked_by": [], "updated": now()})
    if found is None:
        data["workers"].append(row)
    write_tree(data)
elif cmd == "set":
    if len(args) != 3:
        fail("usage: orchestrate-tree.sh set NAME FIELD VALUE")
    data = read_tree()
    w = worker(data, args[0])
    w[args[1]] = parse_value(args[2])
    w["updated"] = now()
    write_tree(data)
elif cmd == "get":
    if len(args) != 2:
        fail("usage: orchestrate-tree.sh get NAME FIELD")
    value = worker(read_tree(), args[0]).get(args[1], "")
    print(json.dumps(value) if isinstance(value, (dict, list)) else value)
elif cmd == "list":
    for w in read_tree().get("workers", []):
        print("\t".join(str(w.get(k, "")) for k in ("name", "status", "spawn_state", "terminal_id", "task_id")))
elif cmd == "render":
    write_tree(read_tree())
elif cmd == "reconcile":
    data = read_tree()
    agents = json.loads(os.environ.get("HERDR_AGENTS_JSON") or "{}").get("result", {}).get("agents", [])
    by_term = {a.get("terminal_id"): a for a in agents if a.get("terminal_id")}
    by_name = {a.get("name") or a.get("agent"): a for a in agents if a.get("name") or a.get("agent")}
    for w in data.get("workers", []):
        name = w.get("name", "")
        ok, hp = handoff_pass(name)
        if ok:
            w.update({"spawn_state": "complete", "status": "complete", "handoff": hp, "updated": now()})
            continue
        term = w.get("terminal_id", "")
        if w.get("spawn_state") == "spawning" and not term and name in by_name:
            term = by_name[name].get("terminal_id", "")
            w.update({"terminal_id": term, "spawn_state": "live", "status": "working", "last_seen": now(), "updated": now()})
        elif w.get("spawn_state") == "live":
            if term and term in by_term:
                w["last_seen"] = now()
                if w.get("status") in ("LOST", "lost", ""):
                    w["status"] = "working"
                w["updated"] = now()
            else:
                w.update({"spawn_state": "lost", "status": "LOST", "updated": now()})
                print("LOST %s terminal_id=%s" % (name, term))
    write_tree(data)
PY
