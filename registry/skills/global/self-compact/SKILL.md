---
name: self-compact
description: Compact your own context and carry on without anyone typing for you. Use when you are a long-running Claude agent in a herdr pane and `self-compact check` shows about 40% context, or earlier at a clean break before a big new phase; also when asked to "checkpoint and compact", "self-compact", or run forever. You write the checkpoint, tell who should know, arm the waiter with `self-compact go`, and end your turn. Not for Agent Zero (Shaan compacts it himself).
---

# Self-compact

Claude Code will not let you run `/compact` on yourself, but herdr can type into your own pane once you are idle.
`self-compact` (source `SISO_Agents/siso-harness-lab/bin/self-compact`) does that: one detached waiter per call types
`/compact <focus>` when your pane goes idle, waits until the context has dropped, types your resume prompt, and exits.
You come back with a fresh window and a pointer to your own checkpoint.

The built-in net stays underneath: `claude-siso-3` auto-compacts at 45% and the PreCompact hook writes a template
checkpoint to `<repo>/.claude/session-context/`. Those keep you alive; this keeps your thread, because you choose
the moment and you write the checkpoint yourself.

## When

- Run `self-compact check` at each milestone. It prints `NN% ctx` from your pane footer.
- At about 40%, compact at the next clean break. Earlier is fine at a natural seam before a big new phase.
- Never mid-edit, mid-test, or while a worker you must read is still running and unread.
- No hook nags you about this. You decide (DECISIONS.md, 4 Sep: no context-size hooks).

## The four steps

1. **Write the checkpoint where it belongs.** That is the owning repo's `.agents/HANDOFF.md` (new top entry), or
   your lane or brief file if you have one. It must stand alone for a reader who remembers nothing:
   - **Done:** what now works and how it was checked, with commit hashes.
   - **Next:** the exact next action, then the rest of the plan.
   - **Open threads:** workers running (names, panes, where results land), waits, promises to Shaan or Agent Zero.
   - **Key paths:** the files, briefs, receipts and commands you will need first.
   - **Shaan's words:** the ask in his words, so the goal survives the summary.
2. **Tell who should know.** Append one line to Agent Zero's inbox:
   `echo "$(date +%H:%M) <YOUR-NAME>: compacting at NN%; checkpoint <path>; next: <one line>" >> ~/SISO_Workspace/SISO_Agents/agent-zero/siso-firstmate/.agents/a0/inbox.log`.
   If the project has a Work page, also `siso-work checkin "compacting; next: <one line>"`.
3. **Arm the waiter.**
   ```bash
   self-compact go --checkpoint <path> \
     --focus "<what the summary must keep: goal, current step, open threads>" \
     [--resume "<first prompt after; default: Compacted. Read <path> and continue.>"]
   ```
   It returns at once with `armed (pid N)`.
4. **End your turn immediately.** Do not call another tool. The waiter only types once your pane is idle, and text
   typed into a busy pane arrives garbled. After the compaction, the resume prompt arrives as a new turn: read the
   checkpoint and carry on.

## Refusals (exit 3, nothing typed)

- Outside herdr (no `HERDR_PANE_ID`): run `/compact` by hand or ask the operator.
- `SISO_A0=1`: Agent Zero is compacted by Shaan.
- A waiter is already armed for your pane (`self-compact status` shows it), the checkpoint file does not exist, or
  your pane does not host a Claude agent.

## Boundaries

- It only ever types into `$HERDR_PANE_ID`, your own pane. Never point it, or `herdr pane send-text`, at another
  agent's pane.
- If the pane is replaced, the waiter's timeout passes (`--timeout`, default 45 minutes), or the context never drops,
  the waiter logs `failed` and exits without typing the resume prompt. Then the 45% auto-compact net still holds.
- Everything it does is logged to `~/.local/state/self-compact/log.jsonl` (`armed`, `compact-typed`, `resumed` with
  context before and after, `refused`, `failed`).
