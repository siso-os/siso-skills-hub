---
name: research-first
description: Use when about to build, design or decide anything non-trivial: fan out Haiku scouts over the estate, GitHub, top companies, open data and free asset libraries, then build only the gap.
---

# Research first

Shaan, 23 Oct 2026: "there's stuff already built out there which I have to continually tell the agents, when they
could just have a Haiku fan out and go find a bunch of shit, if they were brave."

Most of what you are about to build exists: in our estate, on GitHub, at a company that does it best, or in a free
library. Ten minutes of Haiku research beats a day of building from zero.

1. **Name the gap.** One line: the outcome, and what you would otherwise make from scratch.
2. **Fan out, in one message.** One cheap scout per source (`haiku-team` with `mode: research`, or several `scout` /
   `researcher` agents in one message). Typical slices:
   - estate: `estate where <words>`, `recall <words>`, Great Library banks, `library/research`, old repos and archives;
   - GitHub: maintained repos, their issues, awesome-lists (`gh search repos`, `gh search code`);
   - companies: the 3 to 5 best at it; what they ship, how it looks, how they price;
   - data: open datasets and APIs (`references/assets.md`);
   - assets: photos, icons, illustrations, 3D, fonts, video, Lottie, UI kits (`references/assets.md`).
   Ask each scout for rows (`name | URL | licence | what to take`) and a stop at about 15 tool calls.
3. **Steal the best, cite it.** Pick, combine, then build only what nobody else has. Record the sources you reused
   in the commit or HANDOFF so nobody researches it twice.
4. **Stop researching when it converges**: the same answers come back twice, or the gap is clear. Then build.

Licences: commercial use is fine for everything in `references/assets.md` unless the row says otherwise; keep the
attribution a row asks for, never resell raw assets, and never feed a "no AI training" library to a model.
Never paste private corpus content (Life, WhatsApp, Fahmy) into a public repo.

Not for one-line fixes, or when the brief already names the source to use.
