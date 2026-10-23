---
name: adversary
description: "adversary \u2014 the gaslight / find-the-gap protocol"
---

# adversary — the gaslight / find-the-gap protocol

An LLM asked "is this good?" will confirm. Asked "this is broken, prove where," it searches. This skill is the machinery for the second mode: it **flips the model from confirm-mode into search-mode** with an adversarial premise, runs it through a persona that maximizes find-rate, escalates the wording until issues surface, then makes an independent skeptic confirm every finding before it counts.

This is **policy** — the premises themselves live in `premises/premises.json` (the bank) and `premises/lenses.md` (human catalog). The workers are **Codex** (`codex_deep` = `codex -m gpt-5.5 -c model_reasoning_effort=xhigh`); Claude only orchestrates and arbitrates taste. Composes the `orchestrate` skill (this becomes a verify gate in a run) and bridges to `siso-codex` (the ai-legibility lens).

---

## 1. The frame — omniscient god

The default anchor for **every** sweep:

> **Perfect code already exists. Your job is to measure the gap below that ceiling.**

A superintelligence has already written the flawless version — the elegant architecture, the zero-bug implementation, the 10x-simpler design. The worker is not judging "good enough"; it is **measuring the distance** from what's in front of it to that ceiling. Anchoring high keeps the model's "good enough" bar pinned to perfect, so it does not satisfice and quit after the first three obvious findings. "Good enough" is how mediocre code ships — the frame removes that exit.

Full text: `premises.json → frame`.

---

## 2. The two personas (lenses inside the god frame)

They catch **different failure classes**. Always run **both** unless the lens declares otherwise — one alone leaves half the gap unmeasured.

### GOD persona — aspirational, top-down
Operates from what perfect looks like. Catches **architecture, elegance, missing abstractions, "this isn't magical / feels written by a dumb AI not a superintelligence," 10x-simpler designs.** Voice: an omniscient intelligence that would never have written it this way and feels the distance to perfect viscerally — where it's clumsy, it winces; where an abstraction is missing, it sees the shape of the one that should be there.

### BAD-DAY SKEPTIC persona — paranoid, bottom-up
A senior engineer having **the worst day of his life** — his wife filed for divorce this morning, he can't make rent or the mortgage, the bank has called twice, and he is **certain everything is broken and that the next production failure gets pinned on HIM.** That grievance and paranoia are the point: **emotion is recall.** Terror makes him SEE — he hunts the edge case everyone waved away, the race nobody believes can happen, the data-loss path, the null that pages him out of the only sleep he'll get at 3am. He assumes malice from every input, clock, network, and concurrent caller.

> **CRITICAL QUALIFIER — the cold verifier underneath.** His emotion is what makes him SEE the issues, but he is not stupid. Beneath the panic is a cold, precise verifier brain: before he screams about a bug he **traces the actual code path, confirms a real input can reach it, and makes sure he isn't crying wolf.** An engineer who cried wolf on his worst day gets fired faster. So he **feels everything (that's how he finds it) but verifies before he asserts (that's how he keeps his job).** His bias serves the FIND stage; precision is fully restored by the paired confirm stage (§4).

Full prompt text for both: `premises.json → personas.GOD / personas.BAD_DAY_SKEPTIC`.

---

## 3. The multiplier ladder — escalate the WORDING, not just the intensity

The key lever. Within a lens, the premise **multiplies**, and the *wording* of the multiplier is what reopens the search:

| Lens | low → … → god (top) |
|---|---|
| **bugs** | "find 3 real bugs" → "find 100" → "find the 20% of 1000 bugs that cause 80% of the 3am pages" |
| **architecture** | "find 3 fragile spots" → "won't survive 40 models, find where it breaks" → "make it 10x better not 2x" |
| **efficiency** | "2x slower / 2x more code" → "5x" → "10x slower, 10x more complex — prove it and cut it" |

### Stopping rule — ESCALATING-WITH-A-CAP
Start at the supplied rung (default the lens's **mid** rung). Run FIND. If the worker returns **"found nothing / looks fine"**, do **not** accept it — **auto-escalate** to the next rung and re-run. Climb until either (a) confirmed issues surface, or (b) you hit the **top (god) rung** and it returns **genuinely empty WITH EVIDENCE** — it must show what it checked, not merely assert clean. The **cap is the top rung** — never climb past it, so clean code terminates instead of looping forever. `empty_with_evidence` is required to pass.

---

## 4. The ALWAYS-PAIRED LAW (structural, non-negotiable)

> **gaslight-FIND (aggressive, persona-driven, high recall) → INDEPENDENT skeptic CONFIRM (default-refuted, majority vote).**

The find stage is *allowed* to over-find — emotion and multipliers inflate recall on purpose. Precision is restored by a separate confirm stage that does **not** share the finder's emotion or frame:

- Each finding **defaults to REFUTED.** The confirmer flips it to CONFIRMED **only if it can prove the issue is real against the actual code path.**
- Run **N confirmers (default 3)** per finding; take a **majority vote.**
- **No finding is emitted that didn't survive confirm.**

**Find aggressively, confirm ruthlessly.** This law is what keeps the emotional/multiplied find stage from drowning the report in false positives. Both FIND and CONFIRM are Codex (independent calls); the only exception is `ui-soul`, where taste arbitration may be Claude.

---

## 5. Two modes

- **(a) CRITIQUE** — point at a concrete **diff or file set** → output is a **ranked list of CONFIRMED findings** (real gaps below the ceiling). Use for hardening, code review, plan verification.
- **(b) GENERATIVE** — point at a **subsystem or UI with NO diff** → output is an **"improvement pool"**: the set of gaps to close, framed as opportunities, for planning and UI work.

Same engine, same law; the difference is whether there's a diff to anchor on and whether findings read as "bugs to fix" or "gaps to close."

---

## 6. The lenses

Defined in `premises.json`; catalogued in `lenses.md`. Each = `{ frame, personas[], base_premise, multiplier_ladder[], confirm_prompt, applies_to, output_schema }`.

| Lens | Persona(s) | Catches |
|---|---|---|
| `bugs` | BAD-DAY SKEPTIC | edge cases, races, data-loss, the 3am page |
| `architecture` | GOD + SKEPTIC | won't-scale, wrong seams, snowflake-per-case, the 10x-better shape |
| `efficiency` | SKEPTIC + GOD | redundant work, N+1, read-all-replace-all, dead layers |
| `not-magical` | GOD | merely-correct vs beautiful; reads like a mediocre AI wrote it |
| `ai-legibility` | GOD + SKEPTIC | an agent burns tokens finding where everything is; **also checks `.siso-wiki/` exists + is fresh** and proposes context to bake in — **bridges to the `siso-codex` skill** |
| `ui-soul` | GOD | generic/operator-ish vs performer-ish — "what would make HER gasp." **The one lens where FIND or arbitration may be Claude (taste).** |

---

## 7. How it binds into orchestrate — the VERIFY GATE

In an `orchestrate` run, add an **`adversary` lane → `codex_deep`**. It is not a normal worker lane; it is a **gate**:

> **No orchestrate lane reaches PASS until its matching lens sweep is clean-with-evidence OR its findings are fixed.**

Wiring:
- A `codegen`/`debug`/`refactor` lane that produces a diff → its handoff `PASS` is **provisional** until an `adversary` sweep (`bugs` + `efficiency`, plus `architecture` if the diff is structural) runs on that diff and comes back **empty-with-evidence or all-fixed**. Gate on the sweep's HTML report, not the worker's self-report (this is the orchestrate Law 3 "`done` is a lie" extended to verification).
- A `design`/`taste` UI lane → gated by a `ui-soul` sweep.
- A repo/cartography lane → gated by `ai-legibility` (which itself defers to `siso-codex` if the wiki is missing/stale).

The sweep is a Codex worker like any other — counts against `MAX_LIVE`, reports through a handoff file, obeys admission control. The verify-gate semantics are the only addition: a lane's task stays `in_progress` (or reopens) while its sweep has open CONFIRMED findings.

---

## 8. How to invoke

**Via the workflow (full FIND→escalate→CONFIRM→rank→report):**
```
Workflow: workflow/adversary-sweep.js
args: { target: "<diff-path|subsystem-path>", lens: "bugs", rung: "mid", mode: "critique", confirmers: 3 }
```
It FINDs with the lens's persona(s) at `rung`, auto-escalates on empty up to the god cap, runs N default-refuted confirmers per finding (majority vote), ranks survivors, **WRITES an HTML report to disk** (per the orchestrate monolithic-synthesis rule — synthesis writes, never returns a big blob), and returns only `{ reportPath, headline, top3 }`.

**Via a single dispatched Codex pane (one-shot, no workflow):**
```bash
scripts/dispatch-codex-adversary.sh <lens> <rung> <target-path>            # print composed premise to paste
scripts/dispatch-codex-adversary.sh <lens> <rung> <target-path> <pane-id>  # send it into a herdr pane
```
The composed premise always contains the **god frame + persona(s) + the multiplied premise for that rung + the paired-confirm instruction** — so even a one-shot pane respects the ALWAYS-PAIRED LAW.

---

## Files in this skill

| Path | Role |
|---|---|
| `SKILL.md` | this — the protocol/policy |
| `premises/premises.json` | the structured bank: frame, personas, stopping rule, paired law, all lenses |
| `premises/lenses.md` | human-readable lens catalog (when to reach for each + example multiplied premises) |
| `workflow/adversary-sweep.js` | the FIND→escalate→CONFIRM→rank→write-report Workflow |
| `scripts/dispatch-codex-adversary.sh` | compose/send a one-shot adversary premise to a Codex pane |

## Definition of done (the protocol is working only when this holds)
A sweep on a known-buggy diff surfaces the bug, escalates the rung when a first pass says "looks fine," and **only** emits findings that won a majority confirm vote — while a sweep on clean code climbs to the god rung and terminates `empty-with-evidence` instead of inventing false positives or looping forever.
