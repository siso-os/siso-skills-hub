#!/usr/bin/env python3
"""base-score: is this repo a good base to build ours on? (Shaan, 14 Oct: "reverse engineer why T3 Code")

The T3 Code test: good now, iterating fast, many outside PRs merged quickly, a funded team that
builds with AI agents (so it compounds), and a licence we can fork. Scores 0-100 from live GitHub data.

  base-score.py owner/repo [owner/repo ...]   one line each plus a JSON row (--json for rows only)
Calibration: pingdotgg/t3code is the reference; anything close to it is worth basing on.
"""
import json, subprocess, sys, statistics
from datetime import datetime, timezone, timedelta

NOW = datetime.now(timezone.utc)
Q = """query($o:String!,$n:String!,$since:GitTimestamp!){repository(owner:$o,name:$n){
 stargazerCount forkCount isArchived licenseInfo{spdxId} owner{__typename login}
 createdAt pushedAt
 releases(last:20,orderBy:{field:CREATED_AT,direction:ASC}){nodes{createdAt}}
 pullRequests(last:100,states:MERGED){nodes{createdAt mergedAt authorAssociation author{login}}}
 open:pullRequests(states:OPEN){totalCount}
 closedIssues:issues(states:CLOSED){totalCount} openIssues:issues(states:OPEN){totalCount}
 defaultBranchRef{target{...on Commit{h90:history(since:$since){totalCount}
   recent:history(first:100){nodes{message author{user{login}}}}}}}}}"""
AI_MARKS = ("co-authored-by: claude", "co-authored-by: codex", "generated with [claude", "codex", "cursor agent",
            "co-authored-by: copilot", "devin", "openhands", "noreply@anthropic.com")


def days(ts):
    return (NOW - datetime.fromisoformat(ts.replace("Z", "+00:00"))).total_seconds() / 86400


def clamp(x):
    return max(0.0, min(1.0, x))


def score(full):
    o, n = full.split("/", 1)
    since = (NOW - timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%SZ")
    r = subprocess.run(["gh", "api", "graphql", "-f", f"query={Q}", "-f", f"o={o}", "-f", f"n={n}", "-f", f"since={since}"],
                       capture_output=True, text=True)
    if r.returncode:
        return {"repo": full, "error": r.stderr.strip()[:200]}
    d = json.loads(r.stdout)["data"]["repository"]
    stars = d["stargazerCount"]
    stars_per_day = stars / max(days(d["createdAt"]), 1)  # lifetime average; GitHub hides star dates on big repos
    commits_90 = d["defaultBranchRef"]["target"]["h90"]["totalCount"]
    rel = [x["createdAt"] for x in d["releases"]["nodes"] if days(x["createdAt"]) <= 90]
    prs = d["pullRequests"]["nodes"]
    prs_90 = [p for p in prs if days(p["mergedAt"]) <= 90]
    outside = {p["author"]["login"] for p in prs_90 if p["author"] and p["authorAssociation"] in ("CONTRIBUTOR", "FIRST_TIME_CONTRIBUTOR", "FIRST_TIMER", "NONE")}
    authors = {p["author"]["login"] for p in prs_90 if p["author"]}
    merge_h = statistics.median([(datetime.fromisoformat(p["mergedAt"][:-1]) - datetime.fromisoformat(p["createdAt"][:-1])).total_seconds() / 3600 for p in prs_90]) if prs_90 else None
    msgs = d["defaultBranchRef"]["target"]["recent"]["nodes"]
    ai_share = sum(any(m in c["message"].lower() for m in AI_MARKS) for c in msgs) / max(len(msgs), 1)
    logins = [c["author"]["user"]["login"] for c in msgs if c["author"] and c["author"]["user"]]
    top_share = max((logins.count(x) for x in set(logins)), default=0) / max(len(logins), 1)
    lic = (d["licenseInfo"] or {}).get("spdxId") or "NONE"
    issues_closed = d["closedIssues"]["totalCount"] / max(d["closedIssues"]["totalCount"] + d["openIssues"]["totalCount"], 1)

    # five parts, weights sum to 100; scales set so t3code (Oct 2026) lands near 90
    now_good = 20 * clamp((len(str(stars)) - 2) / 3)                       # 1k stars = 0.67, 100k = 1
    velocity = 25 * (0.5 * clamp(commits_90 / 600) + 0.25 * clamp(len(prs_90) / 80) + 0.25 * clamp(len(rel) / 12))
    community = 20 * (0.5 * clamp(len(outside) / 30) + 0.25 * clamp(1 - top_share + 0.3) + 0.25 * (clamp(1 - (merge_h or 999) / 240)))
    momentum = 15 * clamp(stars_per_day / 100)  # t3code ~110/day
    compounding = 10 * clamp(ai_share / 0.3) + 5 * (d["owner"]["__typename"] == "Organization")
    forkable = 5 * (lic in ("MIT", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause", "ISC", "MPL-2.0")) * (not d["isArchived"])
    total = round(now_good + velocity + community + momentum + compounding + forkable)
    return {"repo": full, "score": total, "stars": stars, "stars_per_day": round(stars_per_day, 1),
            "commits_90d": commits_90, "merged_prs_90d": len(prs_90), "pr_authors_90d": len(authors),
            "outside_authors_90d": len(outside), "median_merge_h": round(merge_h, 1) if merge_h else None,
            "releases_90d": len(rel), "ai_built_share": round(ai_share, 2), "top_author_share": round(top_share, 2),
            "issues_closed": round(issues_closed, 2), "open_prs": d["open"]["totalCount"], "licence": lic,
            "org": d["owner"]["__typename"] == "Organization", "owner": d["owner"]["login"],
            "age_days": round(days(d["createdAt"])), "last_push_days": round(days(d["pushedAt"]), 1),
            "manual": "funding/team size and the founder's spend are not on GitHub: one Haiku looks them up"}


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for full in args:
        row = score(full)
        if "--json" in sys.argv or "error" in row:
            print(json.dumps(row))
        else:
            print(f"{row['score']:>3}  {full}  {row['stars']}★ +{row['stars_per_day']}/day · {row['commits_90d']} commits/90d · "
                  f"{row['merged_prs_90d']} PRs merged ({row['outside_authors_90d']} outside authors, median {row['median_merge_h']}h) · "
                  f"{row['releases_90d']} releases · AI-built {int(row['ai_built_share']*100)}% · {row['licence']}")
            print(json.dumps(row))
