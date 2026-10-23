---
name: seat-launch
description: Start a named Claude seat (an owner agent Shaan talks to) so it shows in Agent Base's side nav, in the right group, already working on its brief. Use whenever you spawn or relaunch an owner agent in herdr.
version: 1.0.0
tags:
  - agent-management
  - herdr
  - agent-base
---

# Seat launch

A seat is a long-lived named agent Shaan talks to from Agent Base (http://127.0.0.1:5401). It shows in the side nav
only when it runs under **siso-host** and the Agent Base registry places it. Worked out 11 Oct by ECOSYSTEM starting
UI-HUB; Shaan: "make this a skill so all agents know this and don't have to re-derive this".

## Traps (each one cost a relaunch)

- Plain `claude` in a pane never shows in the nav, even after `/rename`. Bare `siso` starts pi on another model.
- The pane reads input in the terminal's line mode, which caps one line at **1,024 bytes**. A longer `send-text` is cut,
  jams the line and never submits. Put the brief in a file and pass it with `--prompt`.
- `herdr agent` names must be lowercase; the seat name (`--name`) is UPPER-CASE.
- An owner works in the real repo when Shaan says it owns the project, not in a worktree (11 Oct: "he should fucking
  own the project, enough of this worktree bullshit").

## Steps

1. **Brief in a file:** `~/SISO_Workspace/_data/<area>/<SEAT>-brief.txt`. Say who it is, the repo it owns, what to
   read first (`.agents/HANDOFF.md` section, Shaan's words), its jobs, and whose files to leave alone.
2. **A tab:** `herdr tab create --workspace <w> --cwd <repo> --label <SEAT> --no-focus`. Note the pane id it prints
   (for example `w7:p5J`).
3. **Launch:** send this into the pane, then press Enter:
   ```bash
   herdr pane send-text <pane> "siso-host --keep-herdr-env --permission-mode bypassPermissions --name <SEAT> --model '<model>' --prompt \"\$(cat <brief>)\""
   herdr pane send-keys <pane> Enter
   ```
   The model comes from `routing.json` in Agent Zero's repo (owners: `claude-opus-5-5[1m]` on 11 Oct).
4. **Place it in the nav** (needs no restart):
   ```bash
   curl -s -X POST http://127.0.0.1:5401/api/registry -H 'content-type: application/json' \
     -d '{"op":"update","name":"<SEAT>","workspace":"<workspace-id>","project":"<Project>","domain":"<Group>","kind":"owner","main":true,"owner":"","role":"<one line>"}'
   ```
   - A new or renamed group: `{"op":"workspace","id":"<id>","name":"<Shown name>","owner":"<SEAT>","group":"Clients","parent":"<parent-id>","nav":true}`.
   - The id stays fixed; rename by `name` alone.
   - Send `"owner":""` to clear a stray owner.
5. **Prove it:**
   - `curl -s http://127.0.0.1:5401/api/agents` lists the seat with its pane, domain and `status: working`.
   - A headless Playwright screenshot of 5401 shows it under the right group. Never open it on Shaan's screen.
6. **Tell Agent Zero:** append one line to `~/SISO_Workspace/SISO_Agents/agent-zero/siso-agent-zero/.agents/a0/inbox.log`
   with the seat, its pane, its repo and its brief.

## Fixing a running seat

- **Jammed input:** Ctrl-C twice quits siso-host (`herdr pane send-keys <pane> C-c`, twice). Relaunch with `--prompt`.
- **A message to a working seat:** keep it under 1,024 bytes. Point it to a file rather than pasting a long text.
