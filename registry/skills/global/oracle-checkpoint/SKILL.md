---
status: retired
name: oracle-checkpoint
description: Write a debrief + checkpoint + update DECISION-LOG before compacting, so the next agent continues without regression. Trigger when context on the 1M window reaches ~33%, when the user says "checkpoint", "debrief", "compact and hand off", or before ending a long Oracle Streaming session.
---

# Oracle Checkpoint Skill

Preserve hard-won state before context degrades or compacts. Built because Oracle Streaming regressed for a week from having no running memory of what was tried. Run around **33% context on the 1M window** (Opus), or on request.

## When to run
- Context usage approaching ~33% of the 1M window, OR the user asks to checkpoint/debrief/compact, OR a long session is wrapping.
- Project: works for Oracle Streaming (`apps/oracle-streaming`); the pattern generalizes to any project with a `docs/<project>/` doc home.

## What to produce (4 artifacts, all HTML except CLAUDE.md edits)

1. **Update DECISION-LOG.html** — append newest-at-top entries for every meaningful WIN / DECISION / TRAP / LEARN this session, each with a date and the *why*. This is the anti-regression spine.

2. **DEBRIEF-<date>.html** — the full context dump: what shipped (commits + one-line each), the core problem solved + root cause, architecture decisions, script/asset inventory worth reusing, open questions/risks, and immediate next steps. This holds everything important from your context that won't fit in the checkpoint.

3. **CHECKPOINT-<date>.html** — the TIGHT handoff the next agent reads for action. Sections: verified State (with commit hash + repo/branch), "Do these in order" (numbered, concrete, with exact commands), "Do NOT" (hard-won traps), orchestration reminders. Keep it scannable — this is the next agent's first real read after CLAUDE.md.

4. **CLAUDE.md** (project root) — ensure locked decisions, the read-order, platform scope, and guardrails are current so a fresh agent boots correctly without the checkpoint.

## Steps
1. Read the current CONTROL-ROOM / DECISION-LOG to avoid duplicating entries.
2. Write/append the 4 artifacts above. Date-stamp DEBRIEF + CHECKPOINT (`-YYYY-MM-DD`). If a checkpoint for today exists, supersede it (note "supersedes prior").
3. Update relevant memory files (`~/.claude/projects/<project>/memory/`) for cross-session facts; add MEMORY.md index lines.
4. Verify the build state you're claiming is real: `npx tsc -p tsconfig.json --noEmit` clean, key tests pass. Don't write "green" you didn't observe.
5. Commit + push everything (own repo — checkpoint often). Confirm correct gh account first.
6. Output to the user: a 1-paragraph summary + **the exact prompt to paste into the next chat** (point it at the new CHECKPOINT file + CLAUDE.md).

## Handoff — two ways

### Preferred: auto-spawn the next agent in a herdr tab (no copy-paste)
After committing, spawn a fresh Claude lead in a NEW tab of the CURRENT workspace and hand it the checkpoint directly. This is the clean handoff — the new agent boots itself.

Each Opus lead must get its OWN FULL TAB (like the OPUS DIAGNOSIS tab), NOT a split pane.

```bash
export PATH="$HOME/.local/bin:$PATH"
# 1. find the focused workspace id
herdr workspace list   # note workspace_id of the focused workspace
# 2. create a NEW full tab (its own tab, not a split). Capture the new tab_id and its root_pane id.
herdr tab create --workspace <WORKSPACE_ID> --label "CLAUDE LEAD" \
  --cwd ~/SISO_Workspace/SISO_Agency/apps/oracle-streaming --no-focus
#   -> returns tab.tab_id (e.g. ...:3) and root_pane.pane_id (e.g. ...-4)
# 3. start the agent IN that tab
herdr agent start claude-lead --tab <NEW_TAB_ID> \
  --cwd ~/SISO_Workspace/SISO_Agency/apps/oracle-streaming --no-focus \
  -- claude "You are CLAUDE LEAD continuing Oracle Streaming. Read CLAUDE.md, then docs/oracle-streaming/CHECKPOINT-<date>.html (your next steps), then CONTROL-ROOM.html. Deep context: DEBRIEF-<date>.html. Continue from step 1 of the checkpoint. Stay lead/orchestrator; append to DECISION-LOG every meaningful step. Identify peer agents by READING pane content, never tab labels."
# 4. CRITICAL: `agent start --tab` ADDS a pane next to the tab's empty root pane = a SPLIT.
#    Close the empty ROOT pane so the agent is full-screen. (The agent pane is the one whose `agent` field == claude.)
herdr pane list   # find the empty root pane in the new tab (agent: None) vs the claude pane
herdr pane close <EMPTY_ROOT_PANE_ID>
# 5. verify the tab now has exactly 1 pane and it's the claude agent:
herdr pane list   # filter tab_id == NEW_TAB_ID -> should be 1 pane, agent=claude
```

Notes that bit us before (bake them in):
- `herdr` lives at `~/.local/bin/herdr` — export PATH first.
- **Full tab, not split:** plain `herdr agent start --workspace <id>` splits the CURRENT tab; `--tab <newtab>` still leaves an empty root pane alongside. Always: tab create → agent start --tab → close the empty root pane. Verify pane count == 1.
- The boot prompt goes as the LAST argv after `--` (it becomes Claude's first message). It runs automatically — no manual paste.
- To MESSAGE an already-running pane later, use `herdr pane run <id> "msg"` (SUBMITS with Enter). `herdr agent send` writes text but does NOT press Enter — the message will sit unsubmitted.
- Identify panes by `herdr pane read <id> --source recent`, never by tab label (labels lie, IDs compact).
- Give the new agent a few seconds, then `herdr agent read claude-lead --source recent` to confirm it booted into Claude and read the checkpoint.

### Fallback: give the user a paste prompt
If herdr isn't available, output this for the user to paste into a new chat:
> You are CLAUDE LEAD continuing Oracle Streaming. Read `CLAUDE.md`, then `docs/oracle-streaming/CHECKPOINT-<date>.html` (your next steps), then `CONTROL-ROOM.html`. Deep context if needed: `DEBRIEF-<date>.html`. Continue from step 1 of the checkpoint. Stay lead/orchestrator; append to DECISION-LOG every meaningful step.

## Rules
- HTML for debrief/checkpoint/decision-log (project convention). Markdown only for CLAUDE.md.
- Subtractive: supersede/append, don't pile up per-session docs forever — keep the latest CHECKPOINT authoritative; old ones are history.
- The checkpoint is the contract for the next agent. The debrief is the "why" archive. Don't conflate them.
