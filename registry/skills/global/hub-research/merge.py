#!/usr/bin/env python3
"""Merge a run's rows, drop duplicates by URL, and print the coverage table the Opus reads (heavy / light per slice).

  merge.py research/<run> [--target 40]

Writes <run>/merged.jsonl and <run>/COVERAGE.md. Read COVERAGE.md, not the rows.
"""
import json, sys, glob, os, collections
run = sys.argv[1]; target = int(sys.argv[sys.argv.index("--target") + 1]) if "--target" in sys.argv else 40
def _stars(r):  # numbers may be a dict or free text from a Haiku
    n = r.get("numbers"); v = n.get("stars") if isinstance(n, dict) else None
    return v if isinstance(v, (int, float)) else 0
by_url, dup = {}, 0
for p in sorted(glob.glob(os.path.join(run, "rows", "*.jsonl"))):
    for line in open(p):
        line = line.strip()
        if not line: continue
        r = json.loads(line); u = (r.get("url") or r.get("name") or "").rstrip("/").lower()
        if u in by_url:
            dup += 1; o = by_url[u]
            o["source_urls"] = sorted(set(o.get("source_urls", []) + r.get("source_urls", [])))
            o.setdefault("also_in", []).append(r.get("slice"))
            if r.get("verified") is not None: o["verified"] = r["verified"]
            for k, v in r.items():  # fill fields the first row left empty (README readers enrich sweep rows)
                if v not in (None, "", [], {}) and o.get(k) in (None, "", [], {}): o[k] = v
        else:
            by_url[u] = r
rows = list(by_url.values())
with open(os.path.join(run, "merged.jsonl"), "w") as f:
    for r in rows: f.write(json.dumps(r) + "\n")
noise = lambda r: str(r.get("note") or "").upper().startswith("NOISE")
rows_ok = [r for r in rows if not noise(r)]
# credit a slice for every unique row it found, not only rows it found first (blind maps would steal credit)
sl = collections.Counter(s for r in rows_ok for s in set([r.get("slice")] + r.get("also_in", [])) if not str(s).startswith("zz-"))  # zz- = verify passes
kind = collections.Counter(r.get("kind") for r in rows_ok)
ver = collections.Counter(str(r.get("verified")) for r in rows)
out = [f"# Coverage: {run}", "", f"{len(rows)} unique rows ({dup} duplicates merged, {len(rows) - len(rows_ok)} marked NOISE). Verified: {ver.get('True',0)}, "
       f"failed: {ver.get('False',0)}, unchecked: {ver.get('None',0)}.", "", "| Slice | Rows | Verdict |", "|---|---|---|"]
for s, n in sl.most_common():
    out.append(f"| {s} | {n} | {'heavy' if n >= 3 * target else 'ok' if n >= target else 'LIGHT: send more Haikus'} |")
out += ["", "Kinds: " + ", ".join(f"{k} {n}" for k, n in kind.most_common()), "", "## Top 15 by stars"]
for r in sorted(rows_ok, key=lambda r: -(_stars(r) or 0))[:15]:
    out.append(f"- {r.get('name')} ({_stars(r)}) {r.get('url')}")
open(os.path.join(run, "COVERAGE.md"), "w").write("\n".join(out) + "\n")
print("\n".join(out[:8 + len(sl)]))
