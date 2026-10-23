---
name: librarian-loop
description: "Librarian Loop Skill"
---

# Librarian Loop Skill

Run the SISO Librarian continuous loop without re-deriving the startup checklist.

## Use when

The session is operating as the persistent Mac mini Librarian for the Great Library of SISO.

## Loop

1. Read `CHARTER.md` if not already read in this session.
2. Check machine health: `df -h / /Volumes/SISO-STORAGE-VAULT`, `uptime`.
3. Verify channels only when needed: local herdr, laptop herdr, mailbox, MiniMax lean lane.
4. Pick the highest-value gap yourself. Do not ask Shaan which gap to pick.
5. Write `proposals/<date>-<slug>.md` with evidence, expected movement, and what would prove it wrong.
6. Implement without irreversible cleanup. Never delete; copy/checksum/quarantine.
7. Measure before/after. Never claim measurements not taken.
8. Write `metrics/<date>-<slug>.json` and `worklog/YYYY-MM-DD-HHMM-<slug>.md`.
9. Run `npm run verify` in `siso-librarian` before pushing.
10. Commit and push to `sisodias/siso-librarian`.
11. Immediately continue the next loop. A report is not a stopping point.

## Delegation

Use `MINI_ENGINE=pi ~/bin/mini-pi -p "..."` for bounded mechanical checks. Worker briefs end with:

CONSTRAINTS: ...
RETURN: ...
STOP: ...

## Escalation

Mailbox by default for real escalation. Herdr only when Shaan needs attention now. Do not escalate routine progress or ask for permission already granted by the charter.
