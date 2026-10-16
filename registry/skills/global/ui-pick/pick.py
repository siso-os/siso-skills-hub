#!/usr/bin/env python3
"""
ui-pick — rank the curated UI bank against a stated need, in one parallel call.

Reads registry/curated/picks.jsonl (137 hand-picked 21st.dev components, each with
Shaan's verbatim note about why he saved it) and asks Jev one narrow question per
component. The note is weighed as INTENT, not as a description — which is precisely
what an embedding flattens and ripgrep cannot read at all.

This RANKS. It does not decide. Feed the shortlist to `design-lab` and pick by looking.
"""
from __future__ import annotations
import json, os, sys, time

# Jev is a sibling skill. Find it beside this file in the skills hub first, so ui-pick works wherever it is projected
# and whether or not jev-judgment is (16 Oct: it was dropped from ~/.claude/skills and every seat's ui-pick failed).
HERE = os.path.dirname(os.path.realpath(__file__))
JEV_DIRS = [os.path.join(HERE, "..", "jev-judgment"),
            os.path.expanduser("~/.claude/skills/jev-judgment"),
            os.path.expanduser("~/SISO_Workspace/SISO_Agents/siso-skills-hub/registry/skills/global/jev-judgment")]
HUB_SKILL = next((os.path.normpath(d) for d in JEV_DIRS if os.path.isfile(os.path.join(d, "jev.py"))), None)
if HUB_SKILL is None:
    sys.exit("ui-pick: jev-judgment not found beside ui-pick or in ~/.claude/skills; looked in: " + ", ".join(JEV_DIRS))
if HUB_SKILL not in sys.path:
    sys.path.insert(0, HUB_SKILL)
import jev  # noqa: E402

PICKS = os.path.expanduser(
    "~/SISO_Workspace/Great_Library_of_SISO/banks/siso-ui-base/registry/curated/picks.jsonl")
BATCH = 70          # keeps state+questions well inside Jev's 32k ceiling


def load(path: str = PICKS) -> list[dict]:
    return [json.loads(l) for l in open(path, encoding="utf-8") if l.strip()]


def rank(need: str, rows: list[dict] | None = None, *, batch: int = BATCH):
    """Returns ([(prob, row)] desc, cost, ms). One narrow question per component."""
    rows = rows if rows is not None else load()
    out, cost, t0 = [], 0.0, time.time()
    for i in range(0, len(rows), batch):
        chunk = rows[i:i + batch]
        q = {}
        for j, r in enumerate(chunk):
            card = {"type": r.get("type"), "slug": r.get("slug"),
                    "shaan_said": (r.get("feedback") or "")[:220],
                    "targets": r.get("targets"), "signal": r.get("signal")}
            q[f"c{j}"] = {"type": "noul", "instructions":
                "This component is a genuine fit for `need`. `shaan_said` is the curator's own "
                "verbatim note about why he saved it — weigh it as intent, not as description. "
                f"Component: {json.dumps(card, ensure_ascii=False)}"}
        d = jev.ask({"need": need}, q)
        cost += d["usage"]["cost"]
        out.extend((d["answers"][f"c{j}"]["noul"], r) for j, r in enumerate(chunk))
    out.sort(key=lambda x: -x[0])
    return out, cost, (time.time() - t0) * 1000


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: pick.py \"<what you need>\" [top_n]"); raise SystemExit(2)
    need = sys.argv[1]
    top = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    res, cost, ms = rank(need)
    print(f"{need!r}  —  {len(res)} components, {ms:.0f}ms, ${cost:.5f}\n")
    for p, r in res[:top]:
        print(f"  {p:.2f}  {r.get('type','?'):<24} {r.get('slug','?')}")
        if r.get("feedback"):
            print(f"        \"{r['feedback'][:88]}\"")
        if r.get("url"):
            print(f"        {r['url']}")
