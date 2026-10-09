---
name: living-asset
description: Design and build a premium, alive, state-driven UI asset that feels 3D (a mascot face, assistant orb, status character, animated logo) as one SVG + CSS engine driven by data attributes. Use when asked to design a character or face for an app, to "make it cooler / more alive / more 3D / more premium", to give an AI assistant a look across several apps, or to replace clip-art state icons. Carries the method, the craft toolkit, the checks and a working reference engine (Halo, 1 Oct 2026, five rounds Shaan approved).
---

# Living asset: a face that feels alive, in SVG + CSS

Built from Halo's face (HALO, 1 Oct 2026). Shaan approved each round, and after round 5 he called the
point "diminishing returns". The reference engine is HALO's, so it stays in its private lane, with the worked
example with all five rounds: `partners/halo/.agents/lanes/2026-10-01-halo-face/`
(`RETURN.md`, `round4/`, `round5/`).

## 1. Shape of the work: rounds, not one shot

1. **Three directions side by side**: his reference, the house look, and your own idea. Render them
   with one engine at 160, 48, 24 and 16 px on dark and on light, then pick one from first principles in
   three lines. Don't ask him to choose; he overrides by voice.
2. **Lock the base** he reacts to. Keep his exact words, and never remove what he liked.
3. **Variations**: 4 to 6 `look`s on the same engine. Show them in one comparison: one control bar
   driving every look at every size, then a grid of every state × every look. Say which one you'd ship.
4. **Improve rounds** follow `ui-iteration-round`:
   - shots before;
   - at least five specified ideas;
   - additive changes only;
   - before/after per state, drawn at the same scale.

   Stop when he says it looks the same; that's diminishing returns.

Put everything on one page at one URL. Put the newest round on top and keep older rounds below it
for comparison.

## 2. Engine rules (why SVG + CSS)

- **One SVG template per instance, driven only by data attributes** on the host:
  - `data-state`, `data-tier`, `data-look`, `data-variant`, `data-fact`, `data-gesture`;
  - plus CSS variables for continuous values (`--gx`, `--lvl`, `--level`).

  Rive and Lottie keep colour in the file, not in the app's tokens; canvas has no CSS theming. SVG + CSS
  is about 7 KB gzipped, crisp from 16 to 256 px, and runs the same in WKWebView (Tauri) and Chrome.
- **Give gradient and clip ids a per-instance suffix** (`hfband${u}`), or several faces share one gradient.
- **Colour comes from CSS variables on `<stop>`** (`stop-color: var(--c1)`), so palettes transition
  per state.
- **Glows are radial gradients**, never `feGaussianBlur`, which is slow in WebKit.
- **SMIL only where CSS can't do it**:
  - `animateTransform` on a gradient (a turning frame);
  - `animateMotion` (a spark orbiting a ring);
  - pause it with `svg.pauseAnimations()` for reduced motion and when off screen.
- **`transform-box: fill-box; transform-origin: center` on every element.** With it, a `transform="rotate(a cx cy)"`
  attribute rotates about the wrong point: rotate with CSS instead.
- **Nest a wrapper `<g>` per transform source** (state, gesture, spring, animation). Two animations on
  the same element override each other.
- **Use `pathLength="100"` with `stroke-dasharray: 16 84`** for a light trail running round an ellipse.

## 3. Meaning before motion

- **Colour means, motion shows.** Give each state one palette inside the brand: pinks for itself,
  violet for thinking, gold for money, amber for "fixing itself", red for "at risk", grey for rest.
- **Two channels.** The body or frame carries the moment; a ring and rim carry the fact. A tip during a
  problem draws a gold body inside a red ring, so a fact always outranks a moment.
- **Red never moves.** Problems are still and steady; only good news bounces.
- **One face speaks per screen.**
- **Map every state of the existing system onto about 8 core states**, plus a variant or a one-shot
  gesture. Keep the map as data and fail the build if a new upstream state is unmapped.

## 4. Size tiers

| Tier | Size | Draws |
|---|---|---|
| xs | 16-21 px | Body, a thick colour band and eyes 40 % larger. No ring, glow or detail. Every look falls back to this. |
| sm | 22-43 px | Adds the ring, glow and ripples; band slightly thicker. |
| md | 44-111 px | Everything, including the screen instruments. |
| lg | 112 px and up | Adds the 3D turn and fine glass work. |

The eyes never drop out (except with `eyes={false}` for a seat that must have no face).

## 5. The craft toolkit (what made it read as premium and 3D)

- **Anodised material.** Draw the coloured band, then lay brushed metal on top of it at `opacity:.5;
  mix-blend-mode: luminosity`. The metal takes each state's colour.
- **Edge light, bezel, glass:**
  - a thin gradient line at the inner edge;
  - a dark bezel;
  - a wash in the state colour;
  - a curved reflection across the top;
  - slightly darker corners.

  Fine scanlines muddied a grid the client had picked, so check texture against their picks.
- **Light in the world:**
  - a coloured light spill and a contact shadow on the floor, which breathe with the body;
  - the ring lighting the top of the frame;
  - a glow that blooms on celebrations.
- **Depth.** On big sizes, use `perspective(800px) rotateY/rotateX` on the host from the gaze.
  Layers move by different amounts: eyes, then the head at 0.3, then the ring lagging behind.
- **The screen shows the state**, one small instrument each:
  - an equaliser while listening;
  - a waveform while talking (clip it to a narrow band, or it reads as a squiggle);
  - three dots while thinking;
  - stars when celebrating;
  - an indeterminate bar for a heads-up;
  - worried brows for a problem;
  - z's when asleep.
- **Device details:** a status LED that breathes while listening, a sheen sweep at rest, ear grooves,
  and a power-on (scale from a line) when waking.

## 6. Making it alive

- **Springs.** Integrate them in JS with fixed 4 ms sub-steps; a single 30 fps step over-damps them.
  - eyes: k 240, d 19.5 (about 14 % overshoot, settles in about 0.6 s);
  - head = eyes × 0.3;
  - accessory: k 80, d 7.5, which gives the follow-through.

  Write CSS variables only when the rounded values change.
- **Idle life at rest:**
  - mostly small saccades;
  - 14 % a look-around (left, right, back);
  - 8 % a head tilt;
  - 6 % a glance up at the ring;
  - 18 % of blinks are doubles.

  The blink squashes: `scale(1.14, .08)`.
- **Reactions:** `track` (eyes follow the pointer), notice (a pointer close by widens the eyes), and
  boop (a tap squashes and stretches, with happy eyes for 0.75 s). Voice level goes into `--lvl`.
- **Off-screen instances pause** (IntersectionObserver, `animation-play-state: paused`, SMIL paused,
  no tick). Without this, a review page of 130 faces ran at 2 frames a second.
- **Reduced motion.** No loops, springs, tilt or idle life. Each state keeps a still frame that still
  reads: parked spark, static ripples, held sparkles.

## 7. Checks (prove it before saying it's done)

```bash
python3 scripts/harness.py --js engine.js --css engine.css --cls HaloFace \
  --states standby,listening,thinking,talking,celebrating,heads-up,problem,asleep \
  --opts '{"look":"machined"}' --out /tmp/asset-check
shot scripts/check-asset.mjs /tmp/asset-check /tmp/asset-check/shots   # or node, with playwright resolvable
```

- The check exits 1 on a page error or a missing state cell. It prints the spring trace: max against
  target shows the overshoot; final shows it settled.
- **Look at every state shot at full size, before and after.** Compare at the same scale; unequal
  sizes make "after" look better by accident.
- **On the real page, probe every interaction:**
  - state buttons switch every face;
  - a fact over a moment colours both channels;
  - a celebration returns to the state underneath;
  - notice and boop fire;
  - reduced motion clears the transform;
  - nothing overflows at 390 px.
- **Sample springs on a light page**, not one with 100+ animated assets.
- **Known traps:**
  - Playwright's bundled browser can be missing: set `HF_CHROME` to an installed headless shell.
  - Resolve `playwright` through a scratch `node_modules` symlink, never by writing into another repo.
  - Text in spec data needs its own small markdown renderer (`**bold**`, backticks).

## 8. Deliverables

- `spec.json`, with: states (when, colour, eyes, moves, timing, easing, reduced motion), palettes,
  variants, gestures, sizes, rules, and the upstream state map.
- The engine (`*.js`, `*.css`), the page source and a `build.py` that inlines them into one
  self-contained HTML file.
- `roundN/round.json`, holding:
  - his verbatim words;
  - what was measured;
  - the ideas, with chosen, parked and why;
  - added, changed, kept.
- Before/after shots.
- A build plan: one component (`<Face state size look variant fact voice eyes track interactive/>`),
  vendored into each app by a sync script with a VERSION file.
