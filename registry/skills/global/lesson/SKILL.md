---
name: lesson
description: "AUTO-TRIGGER the moment you realize you made a mistake (wrong assumption, broken build, user correction, wasted work): fire the background extractor and continue working — never pause, never wait."
allowed-tools: [Bash]
---

# lesson — fire-on-mistake lesson extractor

AUTO-TRIGGER the moment you realize you made a mistake. Fire the background extractor and continue working — the extraction runs entirely in the background and you never wait for it.

## When to trigger

- You discover a wrong assumption (you claimed X, it was Y)
- A build/test/run you thought would pass fails
- Shaan corrects you (explicitly or implicitly — "actually…", "no, that's…", "you missed…")
- You realise you wasted significant work on the wrong path
- You verify something you claimed was already done and find it wasn't

## How to dispatch (one shell line — copy-paste, fill HINT)

```bash
nohup bash ~/.claude/skills/lesson/scripts/extract.sh \
  "$(ls -t ~/.claude/projects/$(python3 -c "import re,os; print(re.sub(r'[/_.]','-',os.getcwd()))" 2>/dev/null)/*.jsonl 2>/dev/null | head -1)" \
  "HINT: <one line describing what went wrong>" \
  > /tmp/lesson-extract-$$.log 2>&1 &
```

Replace `<one line describing what went wrong>` with a brief description (e.g. "claimed done without verifying", "used wrong import alias", "forgot to check existing file"). Leave the rest unchanged.

**For Codex:** replace the transcript-finding expression with:
```bash
$(ls -t ~/.codex/sessions/$(date +%Y)/$(date +%m)/$(date +%d)/rollout-*.jsonl 2>/dev/null | head -1)
```

## What gets extracted

The MiniMax analyst reads the last ~200 turns of the session transcript, locates the mistake and the moment it occurred, and writes **one** lesson file to the ingest drop directory:

- **Claude drop dir:** `~/.claude/lessons/feedback_<slug>.md`
- **Project drop dir:** `~/.claude/projects/<project-slug>/memory/feedback_<slug>.md`

The lesson file format matches the `ingest_reflect_lessons.py` contract exactly — it flows automatically into the spine DB on the next `ingest` run and is injected at boot.

## What you do NOT do

- **Do not wait.** Fire the nohup line, then continue your current work immediately.
- **Do not re-check** whether the lesson landed. The extractor is safe: if the transcript is missing or claude-mini fails, it silently exits 0 and writes nothing.
- **Do not manually write the lesson** (unless you want to add one independently via `/reflect`). The extractor does it.

## Lesson file format (reference)

```markdown
---
name: <slug>
description: One-liner summary
tags: [global]
---

# <Slug>

**When:** <specific incident>
**Why:** <root cause>
**Apply:** <how to prevent in future>
```

## Drop dirs (ingest contract)

Source: `SISO_Agent_Base/extensions/session-mirror/ingest_reflect_lessons.py` lines 29-30

```
~/.claude/lessons/feedback_*.md          # global scope
~/.claude/projects/*/memory/feedback_*.md  # per-project scope
```

Both are consumed automatically by `ingest_reflect_lessons.py` — no additional wiring needed.
