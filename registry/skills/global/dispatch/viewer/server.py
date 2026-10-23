#!/usr/bin/env python3
"""
Dispatch Viewer — local API server for monitoring Claude Code dispatch runs.
Usage: python3 server.py [--port 8765]
"""

import json
import os
import glob
import sys
import re
import time
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone

# ── Config ─────────────────────────────────────────────────────────────────────
PLANS_DIR = os.path.expanduser(
    "~/SISO_Workspace/SISO_Agency/apps/isso-dashboard/.claude/plans"
)
TMP_BASE_GLOB = "/private/tmp/claude-501/-Users-*/*/tasks"
ACTIVE_WINDOW_SECS = 300   # 5 minutes
COMPLETED_WINDOW_SECS = 7 * 86400  # 7 days

# ── Helpers ────────────────────────────────────────────────────────────────────

def utcnow_ts():
    return datetime.now(timezone.utc).timestamp()


def classify_status(content, mtime):
    """
    Classify a plan's status based on content + mtime.
    Returns: "active" | "completed" | "escalated" | "failed" | "stale"
    """
    age = time.time() - mtime
    has_final = "## Final" in content

    if "🛑 escalated" in content:
        return "escalated"
    if "❌" in content and has_final:
        return "failed"
    if has_final:
        return "completed"
    if age < ACTIVE_WINDOW_SECS:
        return "active"
    return "stale"


def parse_phase_progress(content):
    """Return (completed_phases, total_phases_seen) tuple."""
    phases = []
    for line in content.splitlines():
        m = re.match(r"^- \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] Phase (\d+):", line)
        if m:
            phases.append(int(m.group(1)))
    if not phases:
        return "0/0"
    total = max(phases)
    # count distinct phases that passed (accept both → and ->)
    passed_phases = set()
    for line in content.splitlines():
        m = re.match(r"^- \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] Phase (\d+):.*(?:→|->) ✅", line)
        if m:
            passed_phases.add(int(m.group(1)))
    return f"{len(passed_phases)}/{total}"


def parse_last_activity(content):
    """Return the last meaningful phase entry as a one-liner."""
    last = ""
    for line in content.splitlines():
        line = line.strip()
        if re.match(r"^- \[\d{4}-\d{2}-\d{2}", line):
            m = re.match(r"^- \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] (.+)$", line)
            if m:
                last = m.group(1)[:80]
    return last


def parse_started(content):
    """Extract Started: field from status file."""
    for line in content.splitlines():
        if line.startswith("Started:"):
            return line[len("Started:"):].strip()
    return ""


def parse_title(content, filename_slug):
    """Extract H1 title or fall back to slug."""
    for line in content.splitlines():
        if line.startswith("# Status:"):
            return line[len("# Status:"):].strip()
        if line.startswith("# "):
            return line[2:].strip()
    # humanise slug: 2026-05-01-reel-classifier → Reel Classifier
    parts = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", filename_slug).replace("-", " ").title()
    return parts


def parse_worker_counts(content):
    counts = {"haiku": 0, "sonnet": 0, "opus": 0}
    for line in content.splitlines():
        if line.startswith("Haiku:"):
            try:
                counts["haiku"] = int(re.search(r"\d+", line).group())
            except Exception:
                pass
        elif line.startswith("Sonnet:"):
            try:
                counts["sonnet"] = int(re.search(r"\d+", line).group())
            except Exception:
                pass
        elif line.startswith("Opus consults:"):
            try:
                counts["opus"] = int(re.search(r"\d+", line).group())
            except Exception:
                pass
    return counts


def find_status_files():
    """Return list of {name, status_path, last_modified, ...} dicts — v1 compat."""
    results = []
    plans_dir = os.path.expanduser(PLANS_DIR)
    if not os.path.isdir(plans_dir):
        return results

    for status_path in glob.glob(os.path.join(plans_dir, "*-status.md")):
        mtime = os.path.getmtime(status_path)
        name = os.path.basename(status_path).replace("-status.md", "")
        plan_path = os.path.join(plans_dir, name + ".md")
        results.append({
            "name": name,
            "status_path": status_path,
            "plan_path": plan_path if os.path.exists(plan_path) else None,
            "last_modified": mtime,
            "last_modified_iso": datetime.fromtimestamp(mtime).isoformat(timespec="seconds"),
            "is_active": (utcnow_ts() - mtime) < ACTIVE_WINDOW_SECS,
        })

    results.sort(key=lambda x: x["last_modified"], reverse=True)
    return results


def build_dashboards():
    """
    Return list of dashboard card metadata for /api/dashboards.
    Each entry: slug, title, started, lastUpdate, phaseProgress,
                status, lastActivity, workerCounts
    """
    plans_dir = os.path.expanduser(PLANS_DIR)
    results = []
    if not os.path.isdir(plans_dir):
        return results

    for status_path in glob.glob(os.path.join(plans_dir, "*-status.md")):
        try:
            with open(status_path, "r") as f:
                content = f.read()
        except OSError:
            continue

        mtime = os.path.getmtime(status_path)
        try:
            ctime = os.path.getctime(status_path)
        except OSError:
            ctime = mtime
        slug = os.path.basename(status_path).replace("-status.md", "")
        title = parse_title(content, slug)
        # Started: trust body if it looks real, else fall back to ctime
        started_body = parse_started(content)
        if started_body and not re.search(r"\b00:00\b", started_body):
            started = started_body
        else:
            started = datetime.fromtimestamp(ctime).isoformat(timespec="seconds")
        last_update = datetime.fromtimestamp(mtime).isoformat(timespec="seconds")
        phase_progress = parse_phase_progress(content)
        status = classify_status(content, mtime)
        last_activity = parse_last_activity(content)
        worker_counts = parse_worker_counts(content)

        results.append({
            "slug": slug,
            "title": title,
            "started": started,
            "lastUpdate": last_update,
            "phaseProgress": phase_progress,
            "status": status,
            "lastActivity": last_activity,
            "workerCounts": worker_counts,
            # internal sort key
            "_mtime": mtime,
        })

    results.sort(key=lambda x: x["_mtime"], reverse=True)
    # strip internal key
    for r in results:
        del r["_mtime"]
    return results


def parse_status_file(path):
    """Parse a -status.md file into structured JSON."""
    try:
        with open(path, "r") as f:
            content = f.read()
    except OSError:
        return {"error": "Cannot read file"}

    out = {
        "title": "",
        "plan_path": "",
        "started": "",
        "last_update": "",
        "phases": [],
        "workers": {"haiku": 0, "sonnet": 0, "opus": 0},
        "files_touched": [],
        "failures": [],
        "final": None,
        "raw": content,
    }

    for line in content.splitlines():
        line = line.strip()

        if line.startswith("# Status:"):
            out["title"] = line[len("# Status:"):].strip()
        elif line.startswith("Plan:"):
            out["plan_path"] = line[len("Plan:"):].strip()
        elif line.startswith("Started:"):
            out["started"] = line[len("Started:"):].strip()
        elif line.startswith("Last update:"):
            out["last_update"] = line[len("Last update:"):].strip()

        elif re.match(r"^- \[\d{4}-\d{2}-\d{2}", line):
            m = re.match(
                r"^- \[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\] Phase (\d+): (.+?) (?:→|->) (.+)$",
                line,
            )
            if m:
                ts, num, name, result = m.groups()
                status = (
                    "passed" if "✅" in result else
                    "failed" if "❌" in result else
                    "escalated" if "🛑" in result else
                    "unknown"
                )
                out["phases"].append({
                    "timestamp": ts,
                    "number": int(num),
                    "name": name.strip(),
                    "result": result.strip(),
                    "status": status,
                    "sub_entries": [],
                })
            else:
                if out["phases"]:
                    out["phases"][-1]["sub_entries"].append(line.lstrip("- ").strip())

        elif line.startswith("Haiku:"):
            try:
                out["workers"]["haiku"] = int(re.search(r"\d+", line).group())
            except Exception:
                pass
        elif line.startswith("Sonnet:"):
            try:
                out["workers"]["sonnet"] = int(re.search(r"\d+", line).group())
            except Exception:
                pass
        elif line.startswith("Opus consults:"):
            try:
                out["workers"]["opus"] = int(re.search(r"\d+", line).group())
            except Exception:
                pass

        elif re.match(r"^- .+\((created|modified)\)$", line):
            out["files_touched"].append(line.lstrip("- ").strip())

        elif line.startswith("Completed:"):
            if out["final"] is None:
                out["final"] = {}
            out["final"]["completed"] = line[len("Completed:"):].strip()
        elif line.startswith("Total:") and out["final"] is not None:
            out["final"]["total"] = line[len("Total:"):].strip()
        elif line.startswith("Time:") and out["final"] is not None:
            out["final"]["time"] = line[len("Time:"):].strip()

    return out


def find_task_dirs():
    """Return list of ALL tasks/ dirs across all sessions, sorted newest first."""
    dirs = glob.glob(TMP_BASE_GLOB)
    dirs = [d for d in dirs if os.path.isdir(d)]
    dirs.sort(key=lambda d: os.path.getmtime(d), reverse=True)
    return dirs


def parse_jsonl_output(path, max_lines=500):
    events = []
    try:
        with open(path, "r") as f:
            for i, line in enumerate(f):
                if i >= max_lines:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    ev = extract_event(obj)
                    if ev:
                        events.append(ev)
                except json.JSONDecodeError:
                    pass
    except OSError:
        pass
    return events


def extract_event(obj):
    if not isinstance(obj, dict):
        return None
    ts = obj.get("timestamp", "")
    agent_id = obj.get("agentId", "")
    session_id = obj.get("sessionId", "")
    ev_type = obj.get("type", "")
    msg = obj.get("message", {})

    base = {"ts": ts, "agent_id": agent_id, "session_id": session_id}

    if ev_type == "user" and isinstance(msg, dict):
        content = msg.get("content", "")
        if isinstance(content, str) and obj.get("parentUuid") is None:
            snippet = content[:200].replace("\n", " ")
            return {**base, "kind": "brief", "text": snippet}
        return None

    if ev_type == "assistant" and isinstance(msg, dict):
        content_blocks = msg.get("content", [])
        model = msg.get("model", "")

        if not isinstance(content_blocks, list):
            return None

        for block in content_blocks:
            if not isinstance(block, dict):
                continue
            btype = block.get("type", "")

            if btype == "tool_use":
                tool_name = block.get("name", "")
                inp = block.get("input", {})
                target = (
                    inp.get("file_path") or inp.get("path") or inp.get("pattern") or
                    inp.get("command") or inp.get("url") or inp.get("query") or
                    inp.get("skill") or inp.get("notebook_path") or ""
                )
                return {**base, "kind": "tool_use", "tool": tool_name,
                        "target": str(target)[:200], "model": model}

            if btype == "text":
                text = block.get("text", "").strip()
                if text:
                    return {**base, "kind": "text", "text": text[:300], "model": model}

            if btype == "thinking":
                thinking = block.get("thinking", "").strip()
                if thinking:
                    return {**base, "kind": "thinking", "text": thinking[:200], "model": model}

        return None

    if ev_type == "tool_result" or (isinstance(msg, dict) and msg.get("type") == "tool_result"):
        result_content = ""
        if isinstance(msg, dict):
            c = msg.get("content", "")
            if isinstance(c, str):
                result_content = c[:500]
            elif isinstance(c, list):
                for item in c:
                    if isinstance(item, dict) and item.get("type") == "text":
                        result_content = item.get("text", "")[:500]
                        break
        return {**base, "kind": "tool_result", "text": result_content}

    return None


def get_workers_for_plan(plan_slug):
    """
    Find .output files across ALL session task dirs.
    When plan_slug is given, filter by timestamp overlap with the plan's status file.
    Falls back to most-recent-session behavior if no match found.
    """
    plans_dir = os.path.expanduser(PLANS_DIR)
    status_path = os.path.join(plans_dir, plan_slug + "-status.md")

    plan_start_ts = None
    plan_end_ts = None

    if os.path.exists(status_path):
        plan_end_ts = os.path.getmtime(status_path)
        # parse started timestamp from content
        try:
            with open(status_path) as f:
                content = f.read()
            started_str = parse_started(content)
            if started_str:
                for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
                    try:
                        plan_start_ts = datetime.strptime(started_str, fmt).timestamp()
                        break
                    except ValueError:
                        pass
        except OSError:
            pass

    task_dirs = find_task_dirs()
    if not task_dirs:
        return []

    all_workers = []
    seen_ids = set()

    for tasks_dir in task_dirs:
        for output_path in glob.glob(os.path.join(tasks_dir, "*.output")):
            basename = os.path.basename(output_path)
            if basename.startswith("hook_"):
                continue
            agent_id = basename.replace(".output", "")
            if agent_id in seen_ids:
                continue

            file_mtime = os.path.getmtime(output_path)

            # If we have plan timestamps, filter by overlap
            if plan_start_ts and plan_end_ts:
                # worker must have been active during plan window (with 10-min buffer)
                if file_mtime < plan_start_ts - 600:
                    continue
                if plan_end_ts and file_mtime > plan_end_ts + 600:
                    continue

            seen_ids.add(agent_id)
            size = os.path.getsize(output_path)
            events = parse_jsonl_output(output_path)

            model_hint = "unknown"
            for ev in events:
                m = ev.get("model", "")
                if m:
                    if "haiku" in m.lower() or "minimax" in m.lower() or "highspeed" in m.lower():
                        model_hint = "haiku"
                    elif "sonnet" in m.lower():
                        model_hint = "sonnet"
                    elif "opus" in m.lower():
                        model_hint = "opus"
                    break

            brief = ""
            for ev in events:
                if ev.get("kind") == "brief":
                    brief = ev["text"]
                    break

            all_workers.append({
                "agent_id": agent_id,
                "path": output_path,
                "mtime": file_mtime,
                "mtime_iso": datetime.fromtimestamp(file_mtime).isoformat(timespec="seconds"),
                "size": size,
                "model": model_hint,
                "brief": brief,
                "events": events,
            })

    # If no plan-scoped match, fall back to most recent session
    if not all_workers and task_dirs:
        tasks_dir = task_dirs[0]
        for output_path in glob.glob(os.path.join(tasks_dir, "*.output")):
            basename = os.path.basename(output_path)
            if basename.startswith("hook_"):
                continue
            agent_id = basename.replace(".output", "")
            file_mtime = os.path.getmtime(output_path)
            size = os.path.getsize(output_path)
            events = parse_jsonl_output(output_path)

            model_hint = "unknown"
            for ev in events:
                m = ev.get("model", "")
                if m:
                    if "haiku" in m.lower() or "minimax" in m.lower() or "highspeed" in m.lower():
                        model_hint = "haiku"
                    elif "sonnet" in m.lower():
                        model_hint = "sonnet"
                    elif "opus" in m.lower():
                        model_hint = "opus"
                    break

            brief = ""
            for ev in events:
                if ev.get("kind") == "brief":
                    brief = ev["text"]
                    break

            all_workers.append({
                "agent_id": agent_id,
                "mtime": file_mtime,
                "mtime_iso": datetime.fromtimestamp(file_mtime).isoformat(timespec="seconds"),
                "size": size,
                "model": model_hint,
                "brief": brief,
                "events": events,
            })

    all_workers.sort(key=lambda w: w["mtime"])
    return all_workers


def get_workers_for_session():
    """Legacy: return workers from most recent session (v1 compat)."""
    task_dirs = find_task_dirs()
    if not task_dirs:
        return []
    tasks_dir = task_dirs[0]
    workers = []
    for output_path in glob.glob(os.path.join(tasks_dir, "*.output")):
        basename = os.path.basename(output_path)
        if basename.startswith("hook_"):
            continue
        agent_id = basename.replace(".output", "")
        mtime = os.path.getmtime(output_path)
        size = os.path.getsize(output_path)
        events = parse_jsonl_output(output_path)

        model_hint = "unknown"
        for ev in events:
            m = ev.get("model", "")
            if m:
                if "haiku" in m.lower() or "minimax" in m.lower() or "highspeed" in m.lower():
                    model_hint = "haiku"
                elif "sonnet" in m.lower():
                    model_hint = "sonnet"
                elif "opus" in m.lower():
                    model_hint = "opus"
                break

        brief = ""
        for ev in events:
            if ev.get("kind") == "brief":
                brief = ev["text"]
                break

        workers.append({
            "agent_id": agent_id,
            "path": output_path,
            "mtime": mtime,
            "mtime_iso": datetime.fromtimestamp(mtime).isoformat(timespec="seconds"),
            "size": size,
            "model": model_hint,
            "brief": brief,
            "events": events,
        })

    workers.sort(key=lambda w: w["mtime"])
    return workers


def count_active_agents(window_secs=30):
    """Count agent .output files modified within window_secs across all sessions."""
    now = time.time()
    n = 0
    for tasks_dir in glob.glob(TMP_BASE_GLOB):
        if not os.path.isdir(tasks_dir):
            continue
        for output_path in glob.glob(os.path.join(tasks_dir, "*.output")):
            basename = os.path.basename(output_path)
            if basename.startswith("hook_"):
                continue
            try:
                if (now - os.path.getmtime(output_path)) < window_secs:
                    n += 1
            except OSError:
                pass
    return n


def cwd_slug_to_project(cwd_slug):
    """Turn -Users-shaansisodia-SISO-Workspace-SISO-Agency-apps-isso-dashboard
    into a short project label like 'isso-dashboard'."""
    if not cwd_slug:
        return "unknown"
    parts = cwd_slug.lstrip("-").split("-")
    # drop leading Users/<user>/SISO/Workspace boilerplate if present
    drop_prefix = ["Users", "shaansisodia", "SISO", "Workspace"]
    while parts and parts[0] in drop_prefix:
        parts.pop(0)
    if not parts:
        return "Workspace"
    # take last 2-3 segments — the meaningful tail
    tail = parts[-3:] if len(parts) > 3 else parts
    return "-".join(tail)


def get_all_agents(since_secs=None):
    """
    Return all agents grouped by parent session UUID.
    Sessions sorted by lastActivity DESC, agents within each session by ts DESC.
    Structure: /private/tmp/claude-501/<cwd-slug>/<uuid>/tasks/*.output

    If since_secs is set, only include agents whose .output file mtime is within
    that window. Sessions with zero matching agents are dropped.
    """
    # Each tasks_dir path ends in <uuid>/tasks — extract UUID as session ID
    tasks_dirs = glob.glob(TMP_BASE_GLOB)  # /private/tmp/claude-501/-Users-*/*/tasks
    tasks_dirs = [d for d in tasks_dirs if os.path.isdir(d)]

    now_ts = time.time()
    current_window_secs = 1800  # 30 min

    sessions = []
    most_recent_mtime = 0
    most_recent_uuid = None

    for tasks_dir in tasks_dirs:
        # tasks_dir = .../claude-501/<cwd-slug>/<uuid>/tasks
        session_uuid = os.path.basename(os.path.dirname(tasks_dir))
        cwd_slug = os.path.basename(os.path.dirname(os.path.dirname(tasks_dir)))
        project = cwd_slug_to_project(cwd_slug)
        tasks_mtime = os.path.getmtime(tasks_dir)

        if tasks_mtime > most_recent_mtime:
            most_recent_mtime = tasks_mtime
            most_recent_uuid = session_uuid

        agents = []
        for output_path in glob.glob(os.path.join(tasks_dir, "*.output")):
            basename = os.path.basename(output_path)
            if basename.startswith("hook_"):
                continue

            agent_id = basename.replace(".output", "")
            file_mtime = os.path.getmtime(output_path)
            if since_secs is not None and (now_ts - file_mtime) > since_secs:
                continue
            size = os.path.getsize(output_path)

            # Parse JSONL for model + description + first tool action + tool count
            events = parse_jsonl_output(output_path, max_lines=200)

            model_hint = "unknown"
            for ev in events:
                m = ev.get("model", "")
                if m:
                    ml = m.lower()
                    if "haiku" in ml or "minimax" in ml or "highspeed" in ml:
                        model_hint = "haiku"
                    elif "sonnet" in ml:
                        model_hint = "sonnet"
                    elif "opus" in ml:
                        model_hint = "opus"
                    break

            description = ""
            preview = ""
            for ev in events:
                if ev.get("kind") == "brief":
                    text = ev.get("text", "")
                    description = text[:200]
                    preview = text[:500]
                    break

            tool_uses = [e for e in events if e.get("kind") == "tool_use"]
            tool_count = len(tool_uses)
            first_action = ""
            if tool_uses:
                t = tool_uses[0]
                first_action = f"{t.get('tool', '')} {t.get('target', '')[:60]}".strip()

            agents.append({
                "agentId": agent_id,
                "description": description,
                "model": model_hint,
                "project": project,
                "toolCount": tool_count,
                "firstAction": first_action,
                "ts": datetime.fromtimestamp(file_mtime).isoformat(timespec="seconds"),
                "outputFile": output_path,
                "size": size,
                "preview": preview,
                "_mtime": file_mtime,
            })

        if not agents:
            continue

        agents.sort(key=lambda a: a["_mtime"], reverse=True)
        last_activity_ts = max(a["_mtime"] for a in agents)

        # Strip internal sort key
        for a in agents:
            del a["_mtime"]

        sessions.append({
            "sessionId": session_uuid,
            "isCurrent": False,  # filled in below
            "lastActivity": datetime.fromtimestamp(last_activity_ts).isoformat(timespec="seconds"),
            "agentCount": len(agents),
            "agents": agents,
            "_last_activity_ts": last_activity_ts,
        })

    # Mark current session
    if most_recent_uuid and (now_ts - most_recent_mtime) < current_window_secs:
        for s in sessions:
            if s["sessionId"] == most_recent_uuid:
                s["isCurrent"] = True

    sessions.sort(key=lambda s: s["_last_activity_ts"], reverse=True)
    for s in sessions:
        del s["_last_activity_ts"]

    return sessions


# ── HTTP Handler ───────────────────────────────────────────────────────────────


class DispatchHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} {fmt % args}", file=sys.stderr)

    def send_json(self, data, status=200):
        body = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html_path):
        try:
            with open(html_path, "rb") as f:
                body = f.read()
        except OSError:
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        if path == "/":
            html_path = os.path.join(os.path.dirname(__file__), "index.html")
            self.send_html(html_path)

        elif path == "/api/dashboards":
            self.send_json(build_dashboards())

        elif path == "/api/dispatches":
            # v1 compat
            self.send_json(find_status_files())

        elif path == "/api/status":
            plan_name = qs.get("plan", [None])[0]
            if not plan_name:
                self.send_json({"error": "missing ?plan="}, 400)
                return
            plans_dir = os.path.expanduser(PLANS_DIR)
            status_path = os.path.join(plans_dir, plan_name + "-status.md")
            if not os.path.exists(status_path):
                self.send_json({"error": "not found"}, 404)
                return
            self.send_json(parse_status_file(status_path))

        elif path == "/api/workers":
            plan_name = qs.get("plan", [None])[0]
            if plan_name:
                workers = get_workers_for_plan(plan_name)
            else:
                workers = get_workers_for_session()
            safe = []
            for w in workers:
                safe.append({
                    "agent_id": w["agent_id"],
                    "mtime_iso": w["mtime_iso"],
                    "size": w["size"],
                    "model": w["model"],
                    "brief": w["brief"],
                    "events": w["events"],
                })
            self.send_json(safe)

        elif path == "/api/all-agents":
            since_param = qs.get("since", [None])[0]
            since_secs = None
            if since_param:
                try:
                    since_secs = int(since_param)
                except ValueError:
                    pass
            self.send_json(get_all_agents(since_secs=since_secs))

        elif path == "/api/active-agents":
            self.send_json({"count": count_active_agents()})

        elif path == "/api/agent-stream":
            file_path = qs.get("file", [None])[0]
            if not file_path:
                self.send_json({"error": "missing ?file="}, 400)
                return
            # Security: only allow paths under /private/tmp/claude-501/
            if not file_path.startswith("/private/tmp/claude-501/"):
                self.send_json({"error": "forbidden"}, 403)
                return
            if not os.path.exists(file_path):
                self.send_json({"error": "not found"}, 404)
                return
            events = parse_jsonl_output(file_path)
            self.send_json({"file": file_path, "events": events})

        elif path == "/api/health":
            self.send_json({"ok": True, "ts": datetime.now(timezone.utc).isoformat()})

        else:
            self.send_json({"error": "not found"}, 404)


# ── Entry Point ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Dispatch Viewer API server")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--help-only", action="store_true")
    args = parser.parse_args()

    if args.help_only:
        parser.print_help()
        sys.exit(0)

    addr = ("127.0.0.1", args.port)
    server = HTTPServer(addr, DispatchHandler)
    print(f"Dispatch Viewer running at http://localhost:{args.port}", file=sys.stderr)
    print(f"  Plans dir : {os.path.expanduser(PLANS_DIR)}", file=sys.stderr)
    print(f"  Press Ctrl-C to stop", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.", file=sys.stderr)
        server.server_close()


if __name__ == "__main__":
    main()
