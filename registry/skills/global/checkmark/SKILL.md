---
status: active
name: checkmark
description: "Checkmark Skill"

disable-model-invocation: true
argument-hint: "[optional: a topic/scope note, e.g. 'camsoda']"
---

# Checkmark Skill

**Purpose:** at the end of a meaningful chunk of work, produce ONE durable HTML record of what was actually accomplished — checked off against what was attempted — and make sure it's wired into the project's documentation system so nothing is orphaned. This is the bookkeeping pass that keeps the doc skeleton honest and the next agent un-confused.

Shaan invokes this when a session is "looking Gucci" and wants it banked. Do NOT invent work or inflate status — checkmark only what was **observed done** (verify-at-the-surface), mark the rest honestly as partial or blocked.

## Core principle — observed, not claimed

A line gets a ✅ ONLY if there is evidence it actually happened (a passing test, a control-plane record, a public-API confirmation, a committed diff). If it was code-read or "should work" but not run, it is 🟡 partial. If it was attempted and failed/blocked, it is ⛔ with the reason. This mirrors the project's "done means observed" rule — a checkmark report that lies is worse than none.

Status vocabulary (use these exact markers):
- **✅ DONE** — observed working, with evidence cited inline.
- **🟡 PARTIAL** — built/written but not fully verified live, OR done with a caveat. State what's left.
- **⛔ BLOCKED** — attempted, not achieved. State the blocker + who/what unblocks it.
- **➡️ NEXT** — a known, in-scope follow-up (only if genuinely known and safe).

## Steps

### 1. Gather the session's work (don't trust memory — read the ground truth)
- `git log --oneline` since the session start (and `git diff --stat` of uncommitted work) — the commits ARE the done-ledger.
- Scan the session's TaskList (completed vs pending) if one exists.
- Note any tests run, live proofs observed, docs written, memories saved.
- If the user passed a scope note (`$ARGUMENTS`), focus the report on that; else cover the whole session.

### 2. Write the HTML checkmark report
Write to the project's docs area as `CHECKMARK-<YYYY-MM-DD>[-<topic>].html` (for oracle-streaming: `docs/oracle-streaming/`). Use the project's existing HTML report style — match an existing doc's `<style>` block (e.g. CONTROL-ROOM.html) so it's visually consistent. **HTML, not markdown** (project convention: machine/agent artifacts are HTML).

The report contains:
- **Header**: title, date, one-line session summary, branch + HEAD commit.
- **The checkmark table**: every meaningful item attempted this session → status marker → one-line evidence (file:line, test result, eventId, commit hash, public-API confirm). This is the heart of the doc.
- **What shipped** (commits, with hashes + one-line each).
- **What's proven vs unproven** (the honest status — partial/blocked items with their caveats).
- **New docs / scripts / memories created** this session (so they're discoverable).
- **Open follow-ups** (➡️ NEXT items), if any.

### 3. Wire it into the doc skeleton (the "available to the whole DB system" part)
This is what makes checkmark different from a throwaway note — the report must be **reachable** from the project's hub and ledgers:
- **DECISION-LOG**: append an entry (newest at top) summarizing the session's wins/traps/learns with the standard tags, linking to the new CHECKMARK doc. (Oracle: `docs/oracle-streaming/DECISION-LOG.html`.)
- **CHANGELOG** (if the project has one): add a dated entry for what shipped.
- **Hub / START-HERE doc** (Oracle: `CONTROL-ROOM.html`): if status changed (a capability flipped proven, a matrix cell moved), update the relevant table/status line, and link the new CHECKMARK report from the "docs that matter" list so it's not orphaned.
- **Memory**: write/update project memories for any durable, non-obvious facts learned (per the memory rules — one fact per file, update the `MEMORY.md` index line). Link related memories with `[[name]]`.
- Cross-link: the CHECKMARK doc links back to CONTROL-ROOM + DECISION-LOG; they link forward to it. No dangling docs.

### 4. Commit (and push if the session was pushing)
Stage the new report + every doc/memory you touched, commit with a clear message (`docs(checkmark): <date> session — <one-line>`), end with the project's Co-Authored-By line. Push if the branch was already being pushed this session. Report the commit hash back.

### 5. Report back (terse)
Show the user: the checkmark table (or a tight summary of it), where the report was written, what docs were updated, and the commit hash. Don't narrate the process — show the result.

## What checkmark is NOT
- Not a place to do new feature work — it only records + files what's already done.
- Not a status inflator — unverified work stays 🟡/⛔, never ✅.
- Not markdown — HTML for the report + doc updates (project convention; human-facing READMEs can stay MD).
- Not a duplicate-doc spawner — UPDATE the hub/ledgers (subtractive over additive); the only new file is the dated CHECKMARK report itself.

## Project-specific notes (oracle-streaming)
- Docs live in `docs/oracle-streaming/`. Hub = `CONTROL-ROOM.html`. Append-only log = `DECISION-LOG.html`. Ledger = `CHANGELOG.html`. The 8-cell matrix in CONTROL-ROOM is the scoreboard — update cells that flipped.
- Tip-event verify gotcha: the control plane stores tip amount as `tokens` + tipper as `tipperUsername` (not `amount`/`username`) — read those when citing evidence.
- Co-Authored-By: `Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Memory dir: `~/.claude/projects/-Users-shaansisodia-SISO-Workspace-SISO-Agency-apps-oracle-streaming/memory/`.
