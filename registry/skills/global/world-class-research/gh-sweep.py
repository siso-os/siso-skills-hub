#!/usr/bin/env python3
"""GitHub sweep for hub-research: run many `gh search repos` queries, split by star bands to get past GitHub's
1,000-result cap, and write deduplicated rows in the shared row schema.

  gh-sweep.py --slice github-skills --out research/<run>/rows/github-skills.jsonl \
      "agent skills" "claude skills" "topic:claude-skills" "topic:mcp-server" ...

A query starting with "topic:" searches by topic. Needs `gh` logged in. Read-only on GitHub.

Options:
  --relevance REGEX  keep a repo only if name+description matches (case-insensitive). Off by default.
  --limit N          results per query+band (default 1000).

Resume: after every query+band finishes, its new rows are appended to --out and the key "query|band" is appended
to <out>.done. A rerun skips keys already in .done and dedupes by URL against rows already in --out. A band whose
search failed (rate limit, gh error) is not marked done, so a rerun retries it. One progress line per query goes
to stderr.
"""
import argparse, json, re, subprocess, sys, os, time
BANDS = [">=1000", "200..999", "50..199", "15..49", "3..14"]
FIELDS = "fullName,description,stargazersCount,url,updatedAt,language,isArchived"

def search(q, band, limit):
    """Return the hit list, or None if the search failed (so the caller does not mark it done)."""
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
        print(f"warn: {q} {band}: {r.stderr.strip()[:160]}", file=sys.stderr); return None
    return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slice", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=1000)
    ap.add_argument("--relevance", default=None, help="case-insensitive regex on name+description; keep only matches")
    ap.add_argument("queries", nargs="+")
    a = ap.parse_args()
    rel = re.compile(a.relevance, re.I) if a.relevance else None
    done_path = a.out + ".done"
    seen, n_rows = set(), 0
    if os.path.exists(a.out):
        for line in open(a.out):
            if line.strip():
                seen.add(json.loads(line)["url"]); n_rows += 1
    done = set()
    if os.path.exists(done_path):
        done = {l.strip() for l in open(done_path) if l.strip()}
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "a") as fout, open(done_path, "a") as fdone:
        for q in a.queries:
            new_q, skipped = 0, 0
            for band in BANDS:
                key = f"{q}|{band}"
                if key in done:
                    skipped += 1; continue
                hits = search(q, band, a.limit)
                if hits is None:
                    continue
                batch = []
                for h in hits:
                    if h["url"] in seen or h.get("isArchived"):
                        continue
                    if rel and not rel.search(f"{h['fullName']} {h.get('description') or ''}"):
                        continue
                    seen.add(h["url"]); n_rows += 1; new_q += 1
                    batch.append({"id": f"{a.slice}-{n_rows}", "slice": a.slice, "kind": "repo", "name": h["fullName"],
                        "url": h["url"], "what": (h.get("description") or "")[:300], "why_it_matters": "",
                        "numbers": {"stars": h["stargazersCount"], "updated": h["updatedAt"][:10], "lang": h.get("language")},
                        "ui_notes": "", "source_urls": [h["url"]], "found_by": f"gh:{q}:{band}", "verified": None, "note": ""})
                for r in batch:
                    fout.write(json.dumps(r) + "\n")
                fout.flush()
                fdone.write(key + "\n"); fdone.flush(); done.add(key)
            print(f"{a.slice}: '{q}' +{new_q} new, {n_rows} rows total, {skipped} bands skipped (done)", file=sys.stderr)
    print(f"{a.slice}: {n_rows} rows in {a.out}")

if __name__ == "__main__":
    main()
