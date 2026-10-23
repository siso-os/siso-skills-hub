---
name: shaan-report
description: How to report to Shaan — the closing shape every turn ending in a deliverable uses, in the adhd-agent-output style: his next action first, the goal as X of Y done, one numbered line per ask (✅ verified / ⏳ in progress / ⛔ needs him), the one thing only he can do (no yes/no questions), and a URL he can click. Load at the START of work so the URL is arranged while building, not hunted for afterwards, and so the thread back to the session goal is carried rather than reconstructed.
---

# Reporting to Shaan

Shaan does not read prose walls. He said it plainly, 2026-09-19:

> "what did i tell you to do, what did you do, give me a url for review —
>  that's the output, and then any other extra comments you want to add below"

and earlier, 2026-09-18:

> "I don't respond well to just text output"

On 2026-09-25 he said the five-part shape that used to live here was "quite
difficult to understand" and asked for the ADHD shape instead, for every agent.
So every turn that ends in a deliverable now closes in the shape owned by the
**`adhd-agent-output`** skill. Load it with this one; it wins where they differ.

## The shape

```
<first line: his next action, or the most useful thing to look at next / what you propose to improve next; never "Nothing needed from you">

**<the goal, in his words>: X of Y done**
1. ✅ <what now works, plain words>. <how it was checked>
2. ⏳ <in progress>. <who is on it, time estimate>
3. ⛔ <waiting on him>. <exactly what only he can do: what, where, how long>

**Needs you:** <the one thing only he can do: what, where, how long; never a yes/no>
Look: <the URL: the exact page>
Next: <one thing he can do in under two minutes>
```

What the old sections asked for still holds, carried inside that shape:

- **The thread, not the turn** (his words, 2026-09-19: "the whole goal of the
  whole session and multi-session before"). The bold goal line names the
  standing goal and the count across the whole thread, not just this turn. Get
  it from the durable record (the project's `AGENTS.md`, handoff, backlog, open
  PR); if it cannot be recovered, that is the finding.
- **Quote him.** Name the goal and each decision in his exact words, so it is
  clear which ask each line answers. If you cannot quote an ask, you did not do it.
- **One line per ask.** Every ask he made gets a numbered line; an unfinished or
  dropped one is marked ⛔ or ❌ on its own line, never buried in prose.
- **No implementation detail** in the list. He will ask if he wants it.

### 3. A URL — always

**This is the part that keeps getting missed.** He is reviewing a running app;
he needs to open it, not read about it. Never end a UI turn without one.

- Running dev server: give the deep link to the exact page changed, with
  whatever query params reach the right state
  (`http://localhost:5601/?app&scenario=…&dashboard=…`), not the bare root.
- Something not routable (a menu state, a narrow viewport, a hover): screenshot
  it with Playwright and serve the shot, or post it with `console-post -k card`.
- No server: start one, or publish the artifact. "No URL available" is a last
  resort that needs a reason beside it.

Arrange the URL **while** building. Hunting for one after the work is what
produces a turn with no link in it.

### 3a. What the page is made of

He said it on 2026-09-23, after agents started handing him Lavish review sessions:

> "i'd rather just have html's i don't need to be able to click stuff in that unless you just
>  build in buttons like i usually just voice feedback ... we have a whole html on component bank
>  ... templates and stuff that they can use to make a nice html outputs ... don't do it like this again"

- A report, plan or findings page is **plain HTML composed from the siso-shell template bank**
  (`~/SISO_Workspace/_data/worktrees/siso/main/library/banks/siso-shell (sisodias/siso, module siso.library.banks.shell)`, gallery at https://siso-shell.pages.dev). Pick the family
  (e.g. U7 doc reader for a plan or report, U4 project one-pager, U16 decision), write its data
  JSON, and run `bin/compose <family> data.json --out page.html`. Inline the shell assets or pass
  `--base https://siso-shell.pages.dev`. Keep the data/build script beside the page as its source.
- Post it with `console-post -k html -t "<title>" - < page.html`; the direct URL is
  `http://127.0.0.1:8891/card/<id>/html`. Screenshot that URL before telling him to look.
- **Never Lavish** (`lavish-axi`) and no annotation or review-session surfaces. No forms or
  "queue your answer" controls: he answers by voice. A button is fine only when it does a
  real thing by itself.

### 4. What is next — and what needs him

End pointing forward. Two kinds of line, kept separate:

- **What you would do next**, stated as a recommendation, not a menu. He
  asked for this to be told to him, not asked of him.
  If that next step is yours and you can do it now, it is not a closing line:
  do it in this turn, then report (Shaan, 15 Oct: "they're stopping before
  their objective"). "Next" at the end of a turn is only for what waits on a
  background run that will wake you, on another day, or on him.
- **What physically needs him** — a code sent to his phone, his face on
  camera, his card beyond the budget. Never an approval, a green light or a
  command for him to run (Shaan, 11 Oct: "I don't want to have to green light
  anything. It should just get done and you tell me the results"). Merges,
  deploys, Go Live and logins we hold are done, then reported. Send one link.

If nothing needs him, do not say so as an opener (Shaan, 2 Oct: "you should be more of a better assistant"): open with what landed and the next thing you would improve, as a decided proposal he can redirect.

## Extra comments

Below the three parts. This is where a real finding goes — a bug found while
measuring, a wrong assumption, a decision he should overrule. Keep it short
and make it about *his* decisions, not your process.

## Rules that survive the format

- **Measure before claiming.** "100% filled at 1440 and 1100" beats "looks
  better". A screenshot or a probe number, not an adjective.
- **Never claim an ask is done if it is not.** He tracks them across sessions.
- **Own an error in one sentence**, fix it, move on. No ruminating.
- **Comps are robbed whole, never resized.** He picks; you take it intact.

## Where this skill lives

Canonical copy: `~/SISO_Workspace/SISO_Agents/agent-zero/siso-agent-zero/.claude/skills/shaan-report/SKILL.md`, version-controlled.
Working copy: `~/.claude/skills/shaan-report/SKILL.md`, which is what a plain Claude session loads.
Edit either, then copy across so they do not drift; the repo copy carries extra frontmatter.
Improve this file rather than inventing a private reporting format elsewhere.
