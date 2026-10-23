---
name: claude-ops
description: Meta-rules for AI Factory home base (~/.claude/). Use when editing CLAUDE.md, building skills, cleaning configs, or updating roadmap. Enforces post-step changelog+roadmap updates and design principles.
---

# Claude-Ops Process Skill

The discipline for working on `~/.claude/`. Activate when doing AI Factory maintenance.

## After Every Meaningful Step

1. **Update `~/.claude/ops/changelog.json`** — new entry at TOP:
   ```json
   {
     "date": "YYYY-MM-DD",
     "title": "Brief title",
     "what": "What changed",
     "why": "Why it matters",
     "files_touched": ["paths"],
     "result": "What to verify",
     "tags": ["category"]
   }
   ```

2. **Update `~/.claude/ops/roadmap.json`** — move items: `next` → `now` → `done`

3. **Open viewer:** `open ~/.claude/ops/index.html`

## Before Structural Change

1. Read `roadmap.json` § `design_principles`
2. If changing CLAUDE.md design, read `~/.claude/research/claude-md/00_SYNTHESIS.md`

## Apply the Rules

- **Cherny's law:** target ~100 lines for CLAUDE.md (hard ceiling 300)
- **Lazy by default:** skill > CLAUDE.md when possible
- **Hooks for enforcement, CLAUDE.md for advisory**
- **Machine-personal in memory**, repo-shared in `<repo>/docs/`
- **Each layer earns its load cost**
- **No premature abstraction:** don't build a skill until hand-rolled 3x

## Hard Rules

- **Never edit CLAUDE.md without measuring before/after** (line count)
- **Skill descriptions must be ≤30 words** (triggers, not summaries)
- **Archival pattern:** if changelog >50 entries, archive oldest to separate file
- **Always update roadmap** on status changes

## Verification

After any change, note what to verify. User will restart to run:
- `/memory` — memory system
- `/context` — context chains
- `/skills` — skill catalog

---

*This is a process-skill, not a workflow-skill. It enforces meta-discipline, not step sequences.*
