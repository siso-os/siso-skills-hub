---
name: ui-iteration-round
description: Run one round of UI iteration on pages or widgets Shaan has seen. Shots before, at least five specified improvement ideas per item (his own first), one coder, shots after, then a before/after page with bullets of what was added, changed and kept. Use for any "improve these widgets/pages/components" round, and for his "two or three UI runs".
---

# One UI iteration round

Shaan, 2026-09-24, after a round that went wrong: "you only came up with one feedback point per
thing … i would expect at least like five feedback points … with improvements in bullet points …
did you not spec out the improvement enough did you not look at it and figure out how to improve it
and like come up with ideas first … turn it into a skill though so you get screenshots before and
after with bullet points of what you added".

That round failed for three reasons:
- **Thin:** one or two ideas per item.
- **Unspecified:** no check of what data existed, no comp search.
- **Subtractive:** it removed details he had picked (a level "bar code", a "Newest first" label, a
  pink card) and read to him as "regressed on everything".

This skill is the fix. Follow it in order.

## First: is he here? Then walk, don't run a round

Shaan, 2026-09-24 04:14, after round 2: "you've got to show me the app so I can visually actually
see it and then I'll go through review no need for screenshots and we'll go through comp by comp
because this is too slow these UI runs … me telling you more directly what should be done is
probably better and maybe a b testing some components".

- **He's available:** don't start a round. Give him the running app, one deep link per screen in
  walking order, and change each comp as he talks. When he's torn between two versions of a comp, put
  both on screen (a URL switch like `?read=a|b`, or two tiles side by side) and let him pick by
  looking.
- **He's away:** run this skill. It is the fallback, not the default.
- **Before a walk**, sort his earlier asks into built, partly built, not built and his call, each
  with a link to where it shows (the model app's is `public/review/feedback-ledger/`). He'll check
  it against what he remembers saying.

## 0. Read his words first (no shots yet)

For every item in the round, collect:
- **What he picked or liked.** Look in the project's reviews folder (verbatim words), the comp's
  `agent-note`, decision logs, and his ui-pick notes. **These are never removed, swapped or
  restyled** unless he asks.
- **What he asked for**, quoted verbatim. His own ideas come first in the list.
- **What he didn't notice or care about**, so you don't spend a round there.

Write these into `round.json` → `items[].his` (see `templates/round.example.json`).

## 1. Shots before

- Use his desktop ratio **2000×1250**, plus **1440×900**.
- Use his locale (en-GB for Shaan). Use real or scenario data, never blank.
- Take one element shot per item plus the full page.
- Use the project's shot script; the model app's is `oracle-worker/src/renderer/_review/widget-review-shots.mjs`,
  where `WIDGET_REVIEW_OUT` picks the folder.
- Run it with `shot` (a shared Chrome inside a load slot).
- **Look at every shot at full size.** Don't judge from a scaled contact sheet.

## 2. Ideas: at least five per item, each specified

For each item write **five or more** ideas, his first. Each idea is one bullet with:

- **what:** the concrete change. "A segmented All time / Month / Week switch in the head" is an
  idea; "make it cleaner" is not.
- **why:** his words, or a measured problem ("192 px of empty card below the list at 2000").
- **data:** whether it exists today (name the function or field) or needs a producer.
- **comp:** the pick number, or an existing app component. Run
  `python3 ~/.claude/skills/ui-pick/pick.py "<need>"` and quote his note on the pick.
- **risk:** "removes or restyles something he picked" means the idea is out.

**Lean additive.**
- More of her own stats where there is dead space.
- Interactions such as scroll, carousel, period switch, selector, hover detail or drill-in.
- Cohesion: the same control doing the same job across widgets.
- Motion he likes (animations "are always good").

**Out:**
- removing a detail he picked;
- decoration-policing;
- text nobody asked for (one round added "Go live tonight: day 2 · 1 point" and he called it
  random);
- anything that breaks the project's rules (for HALO: tokens per platform, no merged totals,
  effort not earnings, AI writes words not numbers).

## 3. Shared vs per-item, then choose

- **Shared:** ideas that apply across items, such as one period switch used by three widgets. Build
  those once.
- **Choose** at least three ideas per item for this round. Park the rest in `round.json`
  (`parked: true`) for the next round.

## 4. One coder

- One agent writes the round, in its own worktree, from `round.json`. On Claude, use Sonnet unless
  the round needs architecture.
- Picks are robbed whole: never resize or butcher one.
- Add or fix, never remove what he picked.
- Tests are updated and gates run (in the estate: `heavy -- …` for tsc and vitest).
- The owner lands the work and runs the gates again on the lane.

## 5. Shots after, and the compare page

- Re-shoot with the same script and viewports into `after/`.
- Build the compare page from `templates/compare.html` and `round.json`. For each item:
  - Before | After at 2000;
  - **Added**, **Changed** and **Kept (his picks)** as bullets;
  - the ideas that were parked.
- **Shoot the states too.** A switch, carousel, expand or scroll can't be judged from its default
  shot. Click each one, shoot it into `after/states/`, and list them per item under `extra`
  (`{src, caption}`); the compare page shows them. Model-app example:
  `_review/widget-review-states.mjs`.
- **Look at the after-shots at full size before telling him.** Compare each against its before and
  against his words. If an item got worse, fix it or roll it back first, and say so. Round 2 of the
  model-app review caught three problems this way that tests and gates had passed:
  - a list that grew its card to 1233 px and stretched its neighbour;
  - chart bars drawn in an undefined colour (black);
  - a "Last time" offer missing because the widget read the wrong goal source.

## 6. Report, then his verdict

- Close in the `shaan-report` shape, with the compare page URL. List per item what was added, as
  bullets.
- When he answers, save his words verbatim in the project's reviews folder, mark each item keep or
  revert in `round.json`, and start the next round from his verdict. He runs two or three rounds.

## Files

- `templates/round.example.json`: the round's data (items, his words, ideas, chosen, added,
  changed, kept).
- `templates/compare.html`: the before/after page, driven by `round.json`. Copy both next to the
  shots.
- Worked example (HALO model app, Dashboard widgets):
  `partners/halo/oracle/core` lane `oracle-worker/src/renderer/public/review/widget-review/`. Round 1
  shows what went wrong; round 2 and later follow this skill.
