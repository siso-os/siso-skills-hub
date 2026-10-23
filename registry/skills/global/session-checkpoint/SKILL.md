---
name: session-checkpoint
description: "Session Checkpoint"

disable-model-invocation: true
---

# Session Checkpoint

Write/read `.claude/session-context/<timestamp>-<topic>.md` for cross-session continuity.

## Auto-Write Mode (default via hook)

The `session-checkpoint-writer.mjs` hook automatically fires:
- **On PreCompact**: ALWAYS writes a checkpoint (about to lose context)
- **On Stop**: writes if session had >10 user messages

Hook spawns a background Haiku that:
1. Reads last ~100 transcript messages
2. Determines topic from conversation
3. Writes to `<PROJECT_ROOT>/.claude/session-context/<YYYY-MM-DD-HHMM>-<topic>.md`

Output: `📝 Session saved → <path>` (copy this for /clear restoration)

## READ Mode (session start or post-/clear)

When Shaan says "where were we" or starts a new session:

1. `ls -t <PROJECT_ROOT>/.claude/session-context/*.md | head -1`
2. Read the file end-to-end
3. If <24h old: treat as prior context, don't ask "where were we"
4. If older: confirm with Shaan it's still relevant

**After /clear restoration:**

If Shaan pastes a path from a previous session's `📝 Session saved →` line:
1. Read the file at that path
2. Extract the key context (branch, what was shipped, where we are)
3. Present as "Restored session context" and continue

## WRITE Mode (manual trigger)

Create/update checkpoint when Shaan says "checkpoint", "save context":

```markdown
# <Topic>
**Branch:** <git branch>
**Last commit:** <git log -1 --oneline>
**Dev server:** <running? port?>
**Updated:** YYYY-MM-DD HH:MM

## What was shipped
- [bullet list]

## Where we are RIGHT NOW
- [current state]

## Known issues / gotchas
- [avoid these]

## Next-likely user requests
- [guesses]
```

Steps: `cd <PROJECT_ROOT> && git status && git log -1 --oneline` → determine topic → write file → confirm with "Checkpoint saved: <path>"

## File Format

Each checkpoint includes:
- **Branch**: git branch --show-current
- **Last commit**: git log -1 --oneline
- **Dev server**: running status + port
- **What was shipped**: completed work this session
- **Where we are RIGHT NOW**: current state, in-flight, blocked
- **Known issues**: gotchas, pitfalls encountered
- **Next-likely requests**: educated next steps
- **Files touched**: git status --short

`.git/hooks/post-commit` appends `<sha> [branch] <subject>` to the most recent file automatically.

---

## Live handoff to a fresh agent (absorbed context-relay 2026-07-04)

A running agent's context fills up. Compaction squeezes the *same* window and keeps its artifacts; a relay spins up a **genuinely fresh** agent and transfers only the load-bearing state to it, then retires the old one. Use a relay when you want continuity of the work without continuity of the degraded context.

This is the `oracle-checkpoint` herdr handoff, generalized to any repo and hardened with a **verification gate**: the successor must *prove* it absorbed the context before the predecessor dies. No silent dumps.

### Preconditions (check first, stop if unmet)

```bash
[ "$HERDR_ENV" = "1" ] || echo "NOT in herdr — relay needs herdr tabs. Fall back to a paste prompt + a fresh session-checkpoint file."
export PATH="$HOME/.local/bin:$PATH"   # herdr lives here
herdr pane list >/dev/null 2>&1 || echo "herdr socket unreachable — stop."
```

If not in herdr, **do not invent a relay** — write a checkpoint (above) and hand the user a paste prompt. Stop.

### The mechanism (relay baton)

```
[outgoing A]  writes checkpoint  ─────────────┐
              spawns successor B (fresh tab)   │
              "@B: read checkpoint, then grill me"
[incoming B]  reads checkpoint ───────────────┤
              ROUND 1/2/3 interrogation  ⇄  A answers from live context
              both satisfied? ──────────────── gate
[incoming B]  takes over the work
              kills outgoing A (closes A's tab)
```

The checkpoint file stops **A from forgetting**. The 3-round interrogation stops **B from faking comprehension**. Belt and suspenders — neither alone is enough.

### Step 1 — Discover yourself (outgoing agent A)

You are the focused pane. Resolve your real identity *now* (ids are volatile — never trust a remembered one).

```bash
herdr pane list    # JSON. The focused pane is you. Note your pane_id, tab_id, workspace_id, and your tab's LABEL.
```

Capture, from your own pane:
- `WS` — your workspace id (e.g. `1`)
- `MY_TAB` — your tab id (e.g. `1:2`)
- `MY_PANE` — your pane id (e.g. `1-2`)
- `BASE_LABEL` — your tab label with any trailing `-N` stripped (e.g. `oracle-3` → base `oracle`). The successor is `oracle-4`.
- `CWD` — your repo root (`pwd`).

Derive the successor label: `<BASE_LABEL>-<n+1>`. If the label has no number, successor is `<label>-2`.

### Step 2 — Write the handoff checkpoint

Write a TIGHT checkpoint the successor reads as its first action. Keep it to what a fresh agent cannot reconstruct from the repo. **HTML** (machine/agent artifact — per workspace convention).

Path: `<CWD>/.relay/CHECKPOINT-<successor-label>.html` (create `.relay/` if absent; it's a scratch dir for baton passes).

Required sections — be concrete, no vibes:
1. **GOAL** — the actual objective, and the *current* objective if it drifted. One paragraph.
2. **VERIFIED STATE** — repo + branch + last commit hash; what is *done and observed* (not "should be done"). For anything mid-flight: exact `file:line` you were editing and what's half-changed.
3. **DO NEXT** — numbered, concrete, with exact commands. The first action the successor takes.
4. **DO NOT** — traps already hit this session (the hard-won ones). Each with its *why*.
5. **OPEN THREADS / RISKS** — unknowns, things you were unsure about, decisions deferred.
6. **PROOF ANCHORS** — for each "done" claim, where the proof is (test name, command output, file). The successor uses these to grill you.

Do NOT paste large files/logs into the checkpoint — reference `path:line` + a grep anchor. (Inline-paste is a context leak; the successor has a fresh window — let it read source itself.)

If the repo already has a richer checkpoint convention (e.g. Oracle Streaming's `docs/<project>/CHECKPOINT-*.html` via `oracle-checkpoint`), write THAT instead and point the successor at it. Don't duplicate.

### Step 3 — Spawn the successor in a fresh tab (close the orphan root)

Same recipe `oracle-checkpoint` proved — `agent start --tab` SPLITS the tab and leaves an empty root pane; close it so the successor is full-screen and the tab reads `panes 1`.

```bash
export PATH="$HOME/.local/bin:$PATH"
WS=<your workspace id>; CWD=<your repo root>; SUCC=<successor-label>

# create the tab; capture BOTH tab_id and root_pane id
read TAB ROOT < <(herdr tab create --workspace "$WS" --cwd "$CWD" --label "$SUCC" --no-focus \
  | python3 -c 'import sys,json; d=json.load(sys.stdin)["result"]; print(d["tab"]["tab_id"], d["root_pane"]["pane_id"])')

# start the successor IN that tab. Boot prompt = last argv after `--` (becomes its first message).
AGENT=$(herdr agent start "$SUCC" --tab "$TAB" --cwd "$CWD" --no-focus \
  -- claude --model opus --dangerously-skip-permissions \
  "You are $SUCC, the successor in a context-relay. Your predecessor is handing off live work. \
FIRST: read $CWD/.relay/CHECKPOINT-$SUCC.html in full. \
THEN: do NOT start the work yet. Interrogate your predecessor to confirm you actually absorbed the context — \
3 rounds. Each round, ask the SHARPEST questions that would expose a fake handoff: \
'you claim X is done — what's the proof anchor and does it still hold?', 'what's the exact next command and why that one?', \
'what trap did you hit and what happens if I ignore it?'. Message the predecessor with: \
herdr pane run <PRED_PANE> \"[from: $SUCC] round N: <questions>\". \
When you are genuinely satisfied you could continue with zero regression, send '[from: $SUCC] ONBOARDED — taking over'. \
Then and only then resume the work from DO NEXT. Identify the predecessor by READING pane content, never by a remembered id." \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["agent"]["pane_id"])')

herdr pane close "$ROOT"          # kill the orphan empty root
herdr tab list --workspace "$WS"  # VERIFY the successor's tab reads panes 1
herdr pane list                   # RE-RESOLVE the successor pane id (closing renumbers!)
```

After this, the successor's pane id may have changed — always re-read `pane list` before messaging it.

### Step 4 — The 3-round interrogation (the gate)

The successor drives; you (outgoing A) answer **from live context** — this is the whole point, you still have the real state the file couldn't fully capture.

For each round:
- Successor sends sharp questions (it was booted to do this).
- You answer concretely: real `file:line`, real command, real proof anchor. **If you can't answer, that's a gap in the checkpoint — fix the checkpoint, don't bluff.**
- Watch for the successor's messages (it addresses you `[from: <succ>]`):

```bash
herdr pane read <SUCC_PANE> --source recent --lines 40   # read its questions
# answer it:
herdr pane run <SUCC_PANE> "[from: $MY_LABEL] round N answers: ..."
```

**Gate condition:** the successor emits `ONBOARDED — taking over`. Until then, A stays alive and answering. Do NOT shortcut to 1 round because it "seems fine" — the recurring failure is fake-comprehension; 3 rounds is the floor.

If after 3 rounds the successor is still uncertain, that's a signal the checkpoint is thin — add the missing facts to the checkpoint file and do extra rounds. Quality of handoff > speed.

### Step 5 — Retire the outgoing agent

Only after `ONBOARDED`:

```bash
herdr wait agent-status <SUCC_PANE> --status working --timeout 60000   # confirm successor actually started the work
herdr tab close "$MY_TAB"   # outgoing A's tab — this kills A (you). Last command you run.
```

The successor closes you, OR you close yourself as your final act — either works; closing your own tab is cleanest since you hold `MY_TAB`. Do this **last**: once your tab closes, you're gone.

### Rules / traps (baked in from oracle-checkpoint scars)

- **`herdr` is at `~/.local/bin/herdr`** — export PATH first or commands fail silently.
- **`pane run` submits (presses Enter); `agent send` / `send-text` does NOT** — a message sent with `send-text` sits unsubmitted in the successor's prompt. Use `pane run` for messages you want acted on.
- **Closing a pane renumbers all ids.** Re-read `pane list` after every `pane close` / `tab close`; never reuse a pre-close id.
- **`agent start --tab` leaves an orphan root pane.** Always close it; verify the tab reads `panes 1`.
- **Address by identity, verify by content.** Every message starts `[from: <label>]`; before messaging, `pane read` the target to confirm it's who you think (labels lie, ids compact).
- **Don't paste bulk data into the checkpoint** — fresh window, let the successor read source. Reference `path:line` + grep anchor.
- **The interrogation is non-negotiable.** A relay without the gate is just a context dump that may have silently dropped the load-bearing state. 3 rounds minimum.
- **Not in herdr → no relay.** Fall back to a fresh `session-checkpoint` file + paste prompt. Never fabricate the choreography outside herdr.

### When NOT to relay
- Context < ~30% and work is nearly done → just finish; spawn cost isn't worth it.
- The task is genuinely complete → write a checkpoint and stop, don't spawn a successor to do nothing.
- Not in herdr → see fallback above.
