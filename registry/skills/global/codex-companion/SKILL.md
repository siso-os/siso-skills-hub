---
name: codex-companion
description: "codex-companion \u2014 split-brain pairing with Codex"

disable-model-invocation: true
---

# codex-companion — split-brain pairing with Codex

Summon a Codex peer to work the **same task** beside you. Not delegation (one task, one owner) — **pairing** (one task, two brains that argue to a better answer). The value is the *disagreement*: when you and Codex independently reason the same problem and reconcile, the gap between your answers is where the bugs and bad calls hide. A rubber duck that pushes back.

You stay **lead**. Codex is the challenger you consult, not an autonomous loop. You pose, it answers, you integrate or push back, you decide when you've converged. Bounded rounds.

**Layout: split your own pane to the RIGHT — same tab, side by side, both full vertical height.** NOT a separate tab. You watch Codex think next to you in real time. (This is what was asked for and it's the right shape for live pairing.)

## The split

| | **You (Opus) — left brain** | **Codex — right brain** |
|---|---|---|
| Owns | intent, approach, taste, ambiguity, synthesis, "is this the *right* thing" | correctness, exhaustive edge cases, mechanical depth, "does this *break*", adversarial review |
| Default keyboard | **writes the code / edits files** | **reviews + proposes diffs in text** (no file edits) |

Both get the **full task** + their **lens** (above). Same problem, divergent angles → richer disagreement than two identical prompts. One hand on the keyboard at a time (write-conflict). Default driver = you; flip with `driver=codex` for heavy mechanical work, then you review.

---

## ⚠️ Four facts that broke earlier versions — internalize before spawning

0. **KNOW WHICH PANE YOU ARE — from `$HERDR_PANE_ID`, NEVER from `focused`.** herdr injects your own stable pane id into your environment as `$HERDR_PANE_ID` (e.g. `p_27`). **This is the only reliable "which pane am I."** The `focused` flag in `pane list` is whichever pane the HUMAN clicked last — usually NOT you — so keying off `focused` spawns Codex next to a random stranger pane. (This is why it kept landing in the wrong place.) `herdr pane split "$HERDR_PANE_ID"` accepts the env id directly and resolves to YOU regardless of where the human is looking. VERIFIED 2026-06-04.

1. **herdr display ids are OPAQUE + VOLATILE** (`w652818d97ed322-6`, tab `:4`, ws `w652818d97ed322`) and RENUMBER when panes open/close — but `$HERDR_PANE_ID` (`p_27`) is STABLE across renumbers. Always start from the env id; capture the volatile display ids only as needed and re-read them after any close.

2. **`codex` is a SHELL FUNCTION, not a bare binary** (it wraps `command codex -c sandbox_policy.network_access=true` + a style preamble). So you canNOT `herdr agent start ... -- codex ...` (that execs a binary directly and the function won't resolve). **Instead: split a plain pane, then `herdr pane run <pane> "codex -m gpt-5.6-sol -c model_reasoning_effort=xhigh"`** — `pane run` executes in the pane's interactive shell where the `codex` function IS defined. VERIFIED working 2026-06-04.

3. **`pane run` submits (presses Enter); `pane send-text` does NOT.** Every message + the launch command goes via `pane run`, or it sits unsubmitted in Codex's prompt.

---

## Step 0 — Preconditions

```bash
[ "$HERDR_ENV" = "1" ] || { echo "NOT in herdr — codex-fast is BANNED. Use a persistent codex herdr pane or a Claude Agent reviewer. Stop."; }
export PATH="$HOME/.local/bin:$PATH"   # herdr lives here
herdr pane list >/dev/null 2>&1 || echo "herdr socket unreachable — stop."
```

## Step 1 — Confirm you know which pane you are (from the environment)

```bash
export PATH="$HOME/.local/bin:$PATH"
echo "I am pane: $HERDR_PANE_ID"          # e.g. p_27 — your STABLE self id, injected by herdr
[ -n "$HERDR_PANE_ID" ] || echo "HERDR_PANE_ID unset — not a herdr-managed pane; stop. (codex-fast is BANNED — use a codex herdr pane.)"
```

That's it — `$HERDR_PANE_ID` IS you. Do NOT look up `focused` in `pane list` to find yourself; `focused` is wherever the human clicked, not you. If you want your label for naming, read the row whose `pane_id` matches — but you don't need it to split.

## Step 2 — Split YOURSELF right + launch Codex (verified recipe)

```bash
export PATH="$HOME/.local/bin:$PATH"

# 1. split YOUR OWN pane (env id) to the right, keep focus on yourself, capture the new pane id
COMP=$(herdr pane split "$HERDR_PANE_ID" --direction right --no-focus \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
echo "companion pane: $COMP"

# 2. launch codex IN that pane via pane run (interactive shell → the codex() function resolves)
herdr pane run "$COMP" "codex -m gpt-5.6-sol -c model_reasoning_effort=xhigh"

# 3. give the TUI ~6s to boot, then confirm it came up
sleep 6
herdr pane read "$COMP" --source recent --lines 20   # expect the codex TUI banner (gpt-5.6-sol, cwd, permissions)
```

Splitting `$HERDR_PANE_ID` guarantees Codex lands **beside YOU** — not beside whatever pane the human is looking at. No orphan-root problem (splitting your own pane adds exactly one sibling, no empty root to close — that trap only applies to the `tab create → agent start` path, which this deliberately avoids).

If the read shows a shell prompt instead of the codex TUI, the function didn't resolve — retry with the explicit binary: `herdr pane run "$COMP" "command codex -c sandbox_policy.network_access=true -m gpt-5.6-sol -c model_reasoning_effort=xhigh"`.

## Step 3 — Brief the companion (the pairing contract)

Codex booted with a default placeholder prompt (e.g. "Summarize recent commits") loaded — your brief replaces it. Send via `pane run`:

```bash
herdr pane run "$COMP" "You are my CODEX COMPANION — split-brain pairing on ONE task. I am Opus (left brain: intent, approach, taste). You are right brain: correctness, exhaustive edge cases, mechanical depth, adversarial review. THE TASK: <state the full task — the same one I'm working>. Repo: $(pwd). KEYBOARD: I hold it by default — you do NOT edit files; propose changes as 'file:line — change X to Y because Z'. PROTOCOL: we work in rounds. Each round I send my thinking/diff; you reply with (1) where you AGREE, (2) where you DISAGREE and why — be adversarial, find what I missed, (3) concrete next steps. START NOW: give me your INDEPENDENT first-principles take on this task BEFORE I show my approach — I want your unbiased read. Then wait for my round-1 message."
```

Asking for Codex's **independent take first** (before it sees your plan) is the whole point — an unbiased second derivation to diff against yours. If it just reacts to your approach, you lose the split-brain value.

## Step 4 — The paired dialogue (you drive, bounded rounds)

```bash
herdr pane read "$COMP" --source recent --lines 60   # read its response
```

1. **Diff its reasoning against yours.** Agreement → confidence. **Disagreement → STOP and look** — that delta is the finding. Don't dismiss it to move fast; the disagreement is why you paired.
2. Do your half (write code if you're driver), then send the next round:
   ```bash
   herdr pane run "$COMP" "round N: <your current diff/thinking>. Specifically: <sharp question>"
   ```
3. Repeat until **converged** — you both agree it's right, or you've consciously chosen between options and logged why. **YOU call convergence, not Codex.**

Bounded ~2–5 rounds. Past ~6 without converging → the task is underspecified or too big; split it, don't ping-pong.

**Keyboard discipline:** only the driver edits files. Never both edit the same files the same round. If a file needs both, take turns — announce who's holding it.

## Step 5 — Converge and dismiss

```bash
export PATH="$HOME/.local/bin:$PATH"
# optional final adversarial pass:
herdr pane run "$COMP" "converged on <X>. Final pass — anything still wrong before I ship?"
# then close the companion pane (re-read pane list first if unsure of the current id — closes renumber):
herdr pane close "$COMP"
# verify your tab is back to just you:
herdr pane list | python3 -c 'import sys,json; t="<your tab id>"; n=len([p for p in json.load(sys.stdin)["result"]["panes"] if p["tab_id"]==t]); print("panes in my tab:",n)'
```

Pairing is a **mode you enter and leave** — don't leave Codex burning after the hard part is done. (Codex spends its OWN account, so it's ~free against your Claude plan while live — but a stray pane is still clutter.)

---

## Rules / traps
- **You are `$HERDR_PANE_ID` — split THAT, never the `focused` pane.** `focused` follows the human's mouse and spawns Codex next to a stranger. (The bug that kept landing it in the wrong place.)
- **Display ids are opaque + volatile** (`w652818d97ed322-6`); `$HERDR_PANE_ID` is stable. Start from the env id; re-read display ids after any close.
- **Launch via `pane run "codex ..."`, not `agent start -- codex`** — `codex` is a shell function.
- **`pane run` submits; `send-text` does not** — use `pane run` for the launch + every message. (Bug #3.)
- **Split your own pane (`--direction right`)** for side-by-side full-height pairing — not a new tab, no orphan root to close.
- **`codex -m gpt-5.6-sol -c model_reasoning_effort=xhigh`** — hard-thinking pair work; don't pair on `medium`.
- **One keyboard.** Driver edits; the other proposes in text.
- **You call convergence, not Codex.** It's the challenger; you're the lead.
- **Closing a pane renumbers ids** — re-resolve from `pane list` after a close before reusing any id.

## When NOT to pair
- Trivial / one-obvious-answer task → just do it.
- Need one-shot Codex output, not dialogue → use a codex herdr pane (codex-fast is BANNED).
- Different tasks, division of labor → `orchestrate` (many agents, many tasks), not this.
- Not in herdr → stop (codex-fast is BANNED).

## Relation to the other herdr skills
- **`orchestrate`** = many workers, many tasks (division of labor). **this** = two brains, one task (dialectic).
- **`context-relay`** = hand your OWN context to a fresh successor when full.
- Shared mechanics live in the **`herdr`** skill.
