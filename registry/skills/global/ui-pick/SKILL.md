---
name: ui-pick
description: Rank Shaan's 137 curated UI components against what you actually need, in one ~1.5s call for $0.0006. Use BEFORE building any UI screen or component, and before opening design-lab — it turns "which of 137" into a shortlist of 5. Reads his verbatim note on each pick as intent, which embeddings flatten and grep cannot read. Ranks only; design-lab still decides by looking.
version: 1.0.0
tags: [ui, components, ranking, jev, 21st, design]
---

# ui-pick

**First:** `~/SISO_Workspace/Great_Library_of_SISO/banks/siso-ui-hub/bin/uihub brief <project>` (the UI hub): most categories already have a decided pick with an install line.
Rank here for taste, or where the hub has no pick. Whatever you build carries a line `// uihub: <id>`, and
`uihub check` fails without it.

```bash
python3 ~/.claude/skills/ui-pick/pick.py "a notifications dropdown in the top bar"
```

One narrow Jev question per component, all in one parallel request. Returns a ranked
shortlist with each pick's URL and Shaan's original note.

```python
import sys; sys.path.insert(0, "<this dir>")
from pick import rank
top, cost, ms = rank("a login screen for the operator dashboard")
```

## Why this works

Each pick carries a verbatim note — *"our login is really shit so I'm gonna give you some
sign in cards"*, *"more charts, fucking beautiful, exactly what we want"*. That is stated
intent, and the question tells Jev to read it as intent. An embedding turns it into a
vector and loses the reason; ripgrep cannot match it unless you guess the words.

Measured: "login screen" → the two sign-in cards at 0.90 / 0.88. "notifications dropdown"
→ three notification components at 0.75 / 0.70 / 0.60. "live streaming stats" → four
chart components at 0.89 / 0.88 / 0.79 / 0.71. ~1.3-1.9s, $0.0006 for all 137.

## Limits

- **Ranks, never decides.** Jev cannot see. Hand the top 5 to `design-lab` and look at them.
- Scores are relative to the phrasing of `need`. Describe the surface and the job, not a
  component name.
- Components with no `feedback` score lower simply because there is less to read. That is
  a data gap, not a verdict.
