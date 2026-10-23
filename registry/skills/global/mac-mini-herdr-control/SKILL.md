---
name: mac-mini-herdr-control
description: Control Shaan's Mac Mini from the MacBook through the primary Cloudflare WARP private route or legacy Tailscale fallback, using SSH and Herdr. Use for Mac Mini access, remote agents, Herdr, syncing, deployment preparation, and connectivity recovery.
disable-model-invocation: true
---

# Mac Mini Herdr Control

Read and follow the canonical shared skill completely before acting:

`~/.codex/skills/mac-mini-herdr-control/SKILL.md`

That file is the single source of truth. Do not copy or independently amend its
network addresses, aliases, verification state, or recovery workflow here.

## Messaging another agent — `agent send` does NOT send

**The trap that has cost this estate repeatedly.** `herdr agent send <target> "text"` only
*types* the text into the agent's input box. It never presses Enter, so the message sits
there unsubmitted and the sender believes it was delivered. herdr's own help says so:

> agent send writes literal text; use pane run when you want command text plus Enter

Verified 2026-09-11: a message sent this way stayed in the input box until Shaan pressed
Enter himself.

**Always send in two steps, against the PANE id (not the terminal id):**

```bash
herdr pane send-text <pane_id> "your message"
sleep 1
herdr pane send-keys <pane_id> Enter
```

Get the pane id from `herdr agent list` — it is the `pane_id` field, e.g.
`w65b0dbdd91d7811-1`, distinct from `terminal_id` (`term_…`) and `tab_id` (`w…:1`).

**Confirm delivery by reading the target's pane**, not by trusting the command's exit code:
`herdr agent read <target> --source visible --lines 10`. A message still visible in the
input box was not sent.

A working example is `az-notify` on the SISO VPS (`~/bin/az-notify` as user `siso`), which
wraps this pattern and falls back to appending to `~/.siso/vps-inbox/messages.log` on the
laptop if the send fails, so a message is never silently lost.
