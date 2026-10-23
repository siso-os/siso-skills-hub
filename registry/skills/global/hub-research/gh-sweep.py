#!/usr/bin/env python3
"""GitHub sweep for hub-research: run many `gh search repos` queries, split by star bands to get past GitHub's
1,000-result cap, and write deduplicated rows in the shared row schema.

  gh-sweep.py --slice github-skills --out research/<run>/rows/github-skills.jsonl \
      "agent skills" "claude skills" "topic:claude-skills" "topic:mcp-server" ...

A query starting with "topic:" searches by topic. Needs `gh` logged in. Read-only.
"""
import argparse, json, subprocess, sys, os, time
BANDS = [">=1000", "200..999", "50..199", "15..49", "3..14"]
FIELDS = "fullName,description,stargazersCount,url,updatedAt,language,isArchived"

def search(q, band, limit):
    cmd = ["gh", "search", "repos", "--limit", str(limit), "--json", FIELDS, "--stars", band, "--sort", "stars"]
    if q.startswith("topic:"):
        cmd += ["--topic", q[6:]]
    else:
        cmd += ["--", q]
    for attempt in range(3):
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0:
            return json.loads(r.stdout or "[]")
        if "rate limit" in r.stderr.lower():
            time.sleep(30 * (attempt + 1)); continue
        print(f"warn: {q} {band}: {r.stderr.strip()[:160]}", file=sys.stderr); return []
    return []

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slice", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=1000); ap.add_argument("queries", nargs="+")
    a = ap.parse_args()
    seen, rows = set(), []
    if os.path.exists(a.out):
        for line in open(a.out):
            r = json.loads(line); seen.add(r["url"]); rows.append(r)
    new = 0
    for q in a.queries:
        for band in BANDS:
            hits = search(q, band, a.limit)
            for h in hits:
                if h["url"] in seen or h.get("isArchived"):
                    continue
                seen.add(h["url"]); new += 1
                rows.append({"id": f"{a.slice}-{len(rows)+1}", "slice": a.slice, "kind": "repo", "name": h["fullName"],
                    "url": h["url"], "what": (h.get("description") or "")[:300], "why_it_matters": "",
                    "numbers": {"stars": h["stargazersCount"], "updated": h["updatedAt"][:10], "lang": h.get("language")},
                    "ui_notes": "", "source_urls": [h["url"]], "found_by": f"gh:{q}:{band}", "verified": None, "note": ""})
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w") as f:
        for r in rows: f.write(json.dumps(r) + "\n")
    print(f"{a.slice}: {new} new, {len(rows)} total -> {a.out}")

if __name__ == "__main__":
    main()
