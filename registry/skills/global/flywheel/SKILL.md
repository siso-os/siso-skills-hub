---
name: flywheel
description: "Flywheel \u2014 the system improves itself, with receipts"
---

# Flywheel — the system improves itself, with receipts

Every piece exists; this skill is the wiring. The loop's power is stage 6: each round
reads the SAME metrics as the last round, so fixes are graded by whether the failure
count actually dropped — iteration, not vibes.

## Stage 1 — HARVEST (refresh the spine)
```bash
# legibility-floor: append new transcript events to the spine (append-only, idempotent, no LLM)
python3 ~/.claude/skills/legibility-floor/scripts/harvest_events.py   # see that skill for flags
# receipt: row count + newest ts (column is `ts`, NOT `timestamp`)
sqlite3 ~/SISO_Workspace/.SystemDB/sisosystem.db "SELECT COUNT(*), MAX(ts) FROM event_log;"
```

## Stage 2 — MINE (ranked failure classes, with counts)
```bash
python3 ~/SISO_Workspace/SISO_Agent_Base/extensions/session-mirror/preflight_lessons.py --top 15
tail -20 ~/.claude/.reflect-queue.jsonl        # Shaan's live corrections (the freshest signal)
tail -10 /tmp/jarvis-distill.log               # daily distill health (0-extract days = signal starving)
```
Record the counts for the tracked classes (baseline 2026-07-04): fake-done ×232 ·
ignored-instruction ×161+149 · overcomplicated ×138+150+90+81+75 · hallucinated ×105 ·
lost-context ×96+86.

## Stage 3 — DIAGNOSE (diff classes against the counter-measures registry)
| Failure class | Existing counter-measure | Enforcement status |
|---|---|---|
| fake-done / unverified counts | count-claims-gate (hooks/drafts/ — UNREGISTERED), verify-gate-stop, prove-before-claim | draft not armed |
| unreceipted worker claims | evidence-contract.mjs (tier-agnostic since 2026-07-03) | ARMED |
| ignored-instruction / substitution | policy only (lessons INDEX #42) | **NO trip-wire — top gap** (instruction-fidelity Stop-gate is roadmapped) |
| amnesia / re-derive existing work | preflight-lessons skill, task skill, WHAT-WE-FORGOT pattern (oracle-only) | skill exists; not pre-action-enforced; ledger not global |
| overcomplication | coding-discipline §2-3, /simplify | policy only |
| under-parallelization | fan-out skill + CLAUDE.md fan-out-default | ARMED (new — measure next round) |
| accidental expensive-tier workers | no-fable-subagents.mjs + OPUS_HARD=1 | ARMED |
For each top class: is the counter-measure missing, drafted-but-unarmed, or armed-but-not-moving-the-number? That's the fix list.

## Stage 4 — PROPOSE (top-3, receipts mandatory)
Write the top-3 fixes into `~/.claude/ops/roadmap.json` (house ledger), each with: the class +
its count, the receipt, the fix shape (skill / hook / CLAUDE.md line / script), and lane:
**safe** (new skills, drafts, doc regen, project-local) vs **gated** (global deletions,
CLAUDE.md core, arming hooks that block, anything spending money) → gated goes to JARVIS/Shaan.

## Stage 5 — EXECUTE the safe lane (conductor pattern)
Haiku workers for reads/edits (explicit `model: haiku`, CONSTRAINTS/RETURN/STOP + EVIDENCE line),
Codex for code. Every ship: `ops/changelog.json` entry + VALUE-LEDGER row (what landed, est. value).
Known standing backlog (from the 2026-07-03 audit, in order): PreStop transcript-hash dedup for the
4 Stop gates (5-10x close-out latency) · WHAT-WE-FORGOT + DOC-INDEX pair globally · MEMORY.md
autogen+validation across all stores · compose --check pattern for reference.html/ops docs ·
instruction-fidelity Stop-gate · cross-store memory search gateway. Full detail:
~/.claude/work/EXPLORER-FINDINGS.html + SYSTEM-AUDIT.html.

## Stage 6 — MEASURE (what makes it a flywheel)
Re-run stage-2 mining and diff the class counts against the previous round's numbers (keep them
in the round report). A fix whose class count didn't drop gets escalated (arm the draft, harden
WARN→block) or reverted. Append the round report to `~/.claude/work/VALUE-LEDGER.html`.

## Cadence & home
Transcripts + spine live on the LAPTOP → the loop runs here (the Mini is Foundry's engine,
single-writer law — don't put this DB there). v1 cadence: JARVIS or any Opus session runs
`/flywheel` weekly. An unloaded launchd draft exists at `~/.claude/work/com.siso.flywheel.plist.draft`
— arming an autonomous weekly Claude run is a spend decision: Shaan's call, not an agent's.

## Round health checks (fix these before mining if broken)
- forge-round.js must pass `node --check` (it was silently broken 4 weeks — the lesson of this skill's birth).
- jarvis-distill: 3+ consecutive 0-extract days = its input query is starving; investigate, don't ignore.
- reflect queue growing without consumption = capture without recall; run the ingest.
