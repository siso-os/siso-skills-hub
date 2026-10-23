---
name: design-directions
description: "design-directions \u2014 N divergent takes, side by side, before you commit"

disable-model-invocation: true
argument-hint: "<brief or path-to-spec> [N]"
user-invocable: true
---

# design-directions — N divergent takes, side by side, before you commit

The mistake in AI design work is **single-shot tunnel vision**: the agent picks one aesthetic, builds it, and the user reacts to the only thing in front of them. This skill forces divergence first — generate several *genuinely different* directions as comparable HTML pages, let the user choose from artifacts, then commit. (Adapted from Anthropic's `cwc-workshops` phase-2-planning, done HTML-native with no `AskUserQuestion`.)

## When to use

- Starting a new landing page, dashboard, app shell, or marketing surface and the visual direction is open.
- User says "show me options / a few directions / some takes / mock it up a few ways."
- Before `impeccable craft` on a greenfield surface — use this to pick the lane, then `impeccable` to build the winner to production quality.

**Not for:** cloning an existing site (use `clone-website`), or when the direction is already decided (go straight to `impeccable`).

## Inputs

- A **brief** (plain text) or a **path to a spec file** (e.g. a phase-1 exploration spec, a CURRENT_STATE doc, a ticket).
- Optional **N** = number of directions (default **4**; 3–6 sensible).

If the brief is thin, **don't silently assume** — surface the ambiguities in plain chat first (audience? primary action? brand tone? one screen or a flow?). Define the **audience before features**. One quick round, then build. (Shaan uses voice — ask in chat, never `AskUserQuestion`.)

## Method

1. **Read the brief / spec.** Extract: audience, the 1–2 screens that matter most, the primary user action, any brand/tone constraints. State them back in one tight paragraph so the directions are grounded, not random.
2. **Define N distinct design *axes*** — directions must differ on a real axis, not just color. Pick contrasting points such as:
   - editorial / typographic vs. dense / data-first
   - minimal / restrained vs. bold / expressive
   - light / airy vs. dark / cinematic
   - classic / trustworthy vs. experimental / novel
   Name each direction with a one-line thesis (e.g. *"Direction B — Dark cinematic: oversized type, single accent, image-led"*).
3. **Fan out one builder per direction** (parallel — see `subagents` skill). Each builder gets: the grounded brief, its assigned thesis, the same screen list, and the shared shell contract below. Builders should lean on `impeccable` for craft so output isn't generic-AI aesthetic. Give each builder a compact return contract (path to its HTML + one-line thesis — nothing else).
4. **Emit comparable artifacts.** Each direction = a self-contained HTML file covering the same important screens, so they're judged on design, not content variance. Same copy, same data, different design.
5. **Build the side-by-side index.** A single `index.html` linking all directions, each in a labelled frame/card with its thesis. This is what the user actually opens.
6. **Present, don't pick for them.** Output the index path + a terse table (direction · thesis · best-for). Let the user choose. Optionally run a quick judge-panel (`Workflow`) scoring each against the brief's audience/primary-action to add a recommendation — but the human picks.
7. **Hand off the winner** to `impeccable craft` for production build.

## Output layout (HTML-native — matches the SISO artifact rule)

```
<out-dir>/                     e.g. design-directions/<surface-name>/
  index.html                   side-by-side comparison — labelled frames + thesis per direction
  direction-a-<thesis>.html    self-contained, same screens
  direction-b-<thesis>.html
  direction-c-<thesis>.html
  direction-d-<thesis>.html
  BRIEF.html                   the grounded brief + the N axes (so the choice is reproducible)
```

Self-contained HTML (inline CSS, or a shared `tokens.css`), openable with no build step. Same screens across all directions for fair comparison.

## The shell contract (every direction obeys)

So directions are comparable, not chaotic:
- **Same screens, same content/data, same copy** — only the design differs.
- Each direction page starts with a small header strip: `<direction letter> · <thesis>`.
- Responsive-ish (looks right at desktop width at minimum).
- No external network deps that could fail to load — inline or vendored.

## Anti-patterns

- **Four shades of the same idea.** If all N could be the same design with a palette swap, you diverged on color, not direction. Force different *axes* (step 2).
- **Different content per direction.** Then the user is comparing copy, not design. Hold content constant.
- **Picking for the user.** Present artifacts + a recommendation; the human chooses the lane. (Decide-and-announce applies to execution, not to taste calls that are the user's.)
- **Silent assumptions on a thin brief.** One plain-chat clarifying round first — audience and primary action especially.
- **Markdown mockups.** These are machine/human visual artifacts → HTML, per the SISO doctrine.

## Pairs with
- `impeccable` — build the chosen direction to production quality (this skill picks the lane; impeccable paves it).
- `clone-website` — when the direction is "make it look like X" rather than "explore."
- `subagents` / `Workflow` — the parallel fan-out + optional judge-panel scoring.
