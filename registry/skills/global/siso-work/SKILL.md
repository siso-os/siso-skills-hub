---
name: siso-work
description: Claim your task and check in on the Work page Shaan reads (sisolabs.space/agents). Use whenever you work on a SISO project that has a Work page (HALO Streaming, HALO CRM, SISO Internal Labs, Agent stack, Organise). Run `siso-work show` when you start; claim a task before you begin it; post a one-line check-in at each milestone and at least every 20 minutes of work; mark it done with a note when it is finished.
version: 1.0.0
tags: [work, tasks, check-in, agents, herdr, internal-labs]
---

# siso-work

The Work page in Internal Labs (Agents → Work) is where Shaan sees, per project, what is
being worked on, by which agent, and what each agent last said. It is built from what you
write with this command. If you do not claim and check in, your work is invisible there.

```bash
siso-work show                          # your project: goal, open tasks, recent timeline
siso-work claim <task>                  # id or part of the title; refused if another agent holds it
siso-work add "what needs doing" --claim
siso-work checkin "what changed, what is next"
siso-work done <task> "one line on what shipped, where"
siso-work                               # every project, and the tasks you hold
```

## The loop

1. **Start:** `siso-work show`. If the thing you were asked to do is a task there, `claim` it;
   if it is not, `add "..." --claim` so it is.
2. **While working:** `checkin` at each real milestone, and at least every ~20 minutes of work.
   One line, for Shaan: what changed and what is next, with a commit, URL or path when there is
   one. Not "working on it". A blocker goes in a check-in the moment you hit it.
3. **Finish:** `done <task> "..."` with where the result is. Found more work? `add` it.
4. **Stopping unfinished:** check in with where it stands, then `drop <task>` so another agent
   can take it.

## Who and where

- Your name is read from herdr (your pane's agent name, pane label or tab label). It must be
  the name the project lists you by. `siso-work whoami` shows it; override with `--as NAME`
  or `SISO_WORK_AGENT`.
- Your project is the one that lists you as an agent, else the one whose repo you stand in.
  Override with `-p <project-id>`.
- Add `--json` for machine-readable output. `-` as the text reads it from stdin.

## Where it runs

On the SISO VPS it talks to the agents hub on loopback. Anywhere else it runs itself on the
VPS over `ssh siso-vps` (set `SISO_WORK_VIA` for another host), so it needs that ssh access.
Source: `siso-internal-labs` repo, `ops/siso/agents-hub/bin/siso-work` (VPS: `/usr/local/bin`,
laptop: `~/.local/bin`). Not on your PATH? Say so in your report rather than skipping the
check-ins.
