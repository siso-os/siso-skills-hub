#!/usr/bin/env python3
"""Generate the human-readable skill index from the machine registry."""

import argparse
from collections import defaultdict
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "registry" / "skills_registry.json"
OUTPUT = ROOT / "registry" / "INDEX.md"


def render():
    entries = json.loads(REGISTRY.read_text()).get("skills", [])
    by_category = defaultdict(list)
    for entry in entries:
        if (entry.get('metadata') or {}).get('status') == 'dormant':
            continue
        by_category[entry["category"]].append(entry)

    lines = ["# Skill Registry", "", "> Auto-generated from `skills_registry.json`. Do not edit manually.", "", "## Categories", ""]
    for category in sorted(by_category):
        lines.extend([f"### {category}", "", "| Skill | Description | Source |", "|---|---|---|"])
        for entry in sorted(by_category[category], key=lambda item: item["skill_id"]):
            source = entry.get('source_path') or ("independent" if entry.get("remote_url") else "bundled")
            lines.append(f"| {entry['skill_id']} | {entry['description']} | {source} |")
        lines.append("")
    lines.extend(["---", "", f"**Total: {len(entries)} skills**", "", "Use `python3 scripts/skills list`, `search <query>`, or `info <skill>` to explore.", ""])
    return "\n".join(lines)


parser = argparse.ArgumentParser()
parser.add_argument("--check", action="store_true")
args = parser.parse_args()
expected = render()
if args.check:
    if not OUTPUT.exists() or OUTPUT.read_text() != expected:
        raise SystemExit("registry/INDEX.md is stale; run npm run build:index")
else:
    OUTPUT.write_text(expected)
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")
