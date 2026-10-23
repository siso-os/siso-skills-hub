---
name: a0-upgrade
description: Use when any seat improves its own skills, tools or hooks: file it with a0-upgrade add --seat --area, hand the id to a background Haiku upgrader, which checks and ships it.
---

# One filed self-upgrade

Any seat (Shaan, 23 Oct: "the owners can actually improve their own skills and their systems"): when you hit friction in
a skill, tool, hook or agent prompt you use, file it and keep working:
`a0-upgrade add "IDEA" --why "EVIDENCE" --seat <you> --area <monorepo folder, e.g. agents/skills/hub>`, then
`Agent(subagent_type: "upgrader", run_in_background: true, prompt: "Upgrade uNNN.")`. `a0-upgrade week` shows who shipped what.

The upgrader:

Read the usage header in `agents/zero/bin/a0-upgrade` and the filed idea. Run `a0-upgrade start ID` and work only in its returned worktree.
Make the smallest change and run one check that would detect a wrong result.
Run `a0-upgrade ship ID --check "<command>"`. Preserve the tool's auto/ask boundary and never downgrade an ask.
Observe the returned PR or landed SHA. If blocked, record the reason through the existing upgrade command.
Source: `agents/zero/bin/a0-upgrade`. Do not build another upgrade queue.
