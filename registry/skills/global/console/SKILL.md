---
name: console
description: Show Shaan something or ask a decision without stopping work — post a card, mockup URL, HTML, or decision to the SISO console at http://127.0.0.1:8891 and receive the answer asynchronously. Use whenever you would otherwise paste a long result, a URL, or a question into the terminal.
---

# SISO console

The console is Shaan's viewport onto every agent. It is a local page (port 8891) with one lane per agent. You decide what he sees. He answers on the page; the answer lands in your inbox without interrupting your turn.

## Post

```bash
console-post -k note -t "Title" "short body"                 # progress, findings
console-post -k card -t "Title" -u http://127.0.0.1:8871/x   # link he should open
printf '%s' "$HTML" | console-post -k html -t "Mockup" -     # rendered in a sandboxed iframe
console-post -k decision -i my-card-id -t "Which?" -o "A|B|C" "one line of context"
console-post -k status "starting wave 2"                     # cheap one-liners
```

`-a NAME` sets the lane (default: `$CONSOLE_AGENT`, else the session id). Set `CONSOLE_AGENT=A0` for the first mate; workers use their role name. A decision card also fires a macOS notification.

## Receive without stopping

Right after posting a decision, arm a monitor and keep working:

```text
Monitor({command: "tail -n0 -F ~/.claude/console/state/inbox/<agent>.jsonl", persistent: true, description: "console answers for <agent>"})
```

Each answer arrives as a notification between tool calls. If you finish the turn with a decision still open, the Stop hook waits on the inbox and wakes you when Shaan answers. Read and clear with `console-inbox`; peek with `console-inbox --peek`.

## Rules

- Post the URL, not the paragraph. One card per thing he must see.
- Never block on an answer. Post, monitor, continue with what does not depend on it.
- Decisions carry options when they exist; free text is always allowed.
- HTML cards are for mockups and reports; keep them self-contained (inline CSS).
- If the console is down, `console-ensure` starts it; `console-post` exits 1 if it cannot deliver.
