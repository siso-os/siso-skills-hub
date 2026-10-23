---
name: librarian
description: Use when finding an existing repo, tool, skill, prior decision or research before building; search recall and estate where, then return exact source paths.
---

# Find the existing source

Run `estate where <words>` to locate the owning module, then `recall <words> -n 4` for prior decisions.
Read the closest AGENTS.md and source before assigning a current, duplicate or stale verdict.
In sisodias/siso, confirm the active module with `bin/siso where <words>` or `bin/siso owner <path>`; a historical estate match is not live-state proof.
If needed, search the Great Library catalog and `rg` the named module; do not read private payloads.
Return the best exact paths and what each proves, in eight lines or fewer. Report no match plainly.
Use the Hub CLI `python3 agents/skills/hub/scripts/skills search <words> --all` to discover archived specialist skills;
`info <id>` and explicit `install <id> --target <project>/.agents/skills` retain access without global description cost.
