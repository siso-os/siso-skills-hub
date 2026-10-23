#!/usr/bin/env python3
"""ask.py — read-only query handle over the 34k session_extract insights.

Leaf tool for the insights-ask skill. Runs ONLY SELECTs over the spine DB's
session_extract table. The connection is opened read-only (mode=ro) so a write
is impossible even by accident.

Usage:
  ask.py [--dim DIM] [--domain SUB] [--query TEXT] [--min-importance F]
         [--landed 0|1] [--top N] [--format table|json] [--fails]

Examples:
  ask.py --top 10                         # top 10 insights by importance
  ask.py --dim ai_failures --top 15       # what fails most (high importance)
  ask.py --fails                          # alias: top ai_failures by importance
  ask.py --domain SISO_Voice --top 10     # insights for a project/domain
  ask.py --query orb --top 10             # full-text-ish match on title/body
  ask.py --dim ideas --min-importance 0.7 # high-value ideas
  ask.py --top 20 --format json           # machine-readable for agents
"""
import argparse
import json
import os
import sqlite3
import sys

HOME = os.path.expanduser("~")
DB = os.environ.get("SISO_DB", f"{HOME}/SISO_Workspace/.SystemDB/sisosystem.db")

DIMS = [
    "ai_failures", "prompt_improvements", "user_misuse", "framework_gaps",
    "tasks", "intentions", "goals", "decisions", "ideas",
    "friction_patterns", "wins", "entities",
]

COLS = ["id", "dim", "title", "body", "domain", "severity",
        "recurrence", "importance", "source_path", "landed", "last_seen"]


def connect_ro(path):
    """Open the DB strictly read-only. Any write attempt raises."""
    if not os.path.exists(path):
        sys.exit(f"ERROR: DB not found at {path}")
    uri = f"file:{path}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn


def run(args):
    where, params = [], []
    if args.dim:
        where.append("dim = ?")
        params.append(args.dim)
    if args.domain:
        where.append("domain LIKE ?")
        params.append(f"%{args.domain}%")
    if args.query:
        where.append("(title LIKE ? OR body LIKE ? OR evidence_quote LIKE ?)")
        q = f"%{args.query}%"
        params += [q, q, q]
    if args.min_importance is not None:
        where.append("importance >= ?")
        params.append(args.min_importance)
    if args.landed is not None:
        where.append("landed = ?")
        params.append(args.landed)

    clause = ("WHERE " + " AND ".join(where)) if where else ""
    sql = (
        f"SELECT {', '.join(COLS)} FROM session_extract "
        f"{clause} ORDER BY importance DESC, recurrence DESC, last_seen DESC "
        f"LIMIT ?"
    )
    params.append(args.top)

    conn = connect_ro(DB)
    try:
        rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
    finally:
        conn.close()
    return rows


def fmt_table(rows):
    if not rows:
        return "(no rows)"
    out = []
    for i, r in enumerate(rows, 1):
        body = (r.get("body") or "").strip().replace("\n", " ")
        if len(body) > 240:
            body = body[:240] + "…"
        out.append(
            f"{i:>3}. [{r['importance']:.2f}] ({r['dim']}"
            f"{'/' + r['severity'] if r.get('severity') else ''}"
            f", x{r['recurrence']}) {r.get('title') or '(untitled)'}"
        )
        if body:
            out.append(f"      {body}")
        dom = r.get("domain")
        if dom:
            out.append(f"      domain: {dom}")
    return "\n".join(out)


def main():
    p = argparse.ArgumentParser(description="Query the session_extract insight store (read-only).")
    p.add_argument("--dim", choices=DIMS, help="filter by dimension")
    p.add_argument("--domain", help="substring match on domain/project bucket")
    p.add_argument("--query", help="substring match on title/body/evidence_quote")
    p.add_argument("--min-importance", type=float, dest="min_importance",
                   help="only importance >= F (0-1)")
    p.add_argument("--landed", type=int, choices=[0, 1],
                   help="0=not yet projected, 1=landed to memory/lessons")
    p.add_argument("--top", type=int, default=10, help="max rows (default 10)")
    p.add_argument("--fails", action="store_true",
                   help="alias for --dim ai_failures (what fails most)")
    p.add_argument("--format", choices=["table", "json"], default="table")
    args = p.parse_args()

    if args.fails and not args.dim:
        args.dim = "ai_failures"

    rows = run(args)
    if args.format == "json":
        print(json.dumps(rows, indent=2, default=str))
    else:
        print(fmt_table(rows))
        print(f"\n— {len(rows)} row(s) from session_extract @ {DB}")


if __name__ == "__main__":
    main()
