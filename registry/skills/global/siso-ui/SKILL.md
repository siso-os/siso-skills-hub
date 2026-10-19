---
name: siso-ui
description: How any SISO agent builds or restyles UI - start from Shaan's own picks and rankings in the SISO UI Hub (his 138 curated picks with notes first, then the 13,590 items behind them by rung, the charts he ranked, decided swaps), follow the house rules and the verified evidence rules, build from the surface's own standard and kit, prove the result with machine checks (uihub check, impeccable's detector) in every state at laptop and phone size, get a fresh reviewer's verdict, then show Shaan numbered shots (show-shots) and keep what he approves as goldens. Use before building, restyling or reviewing any screen, component, chart, dashboard, page or app view in any SISO or HALO project, and whenever you are about to pick a library or draw a component yourself.
---

# SISO UI

Shaan, 17 Oct: "they're looking at screenshots and allowing UI which is just so god awfully terrible". The fix is not
better eyes. It is: take what he already chose, follow rules that have a source, and let a script say pass or fail.

Everything below lives in the UI Hub: `~/SISO_Workspace/Great_Library_of_SISO/banks/siso-ui-hub` (call it `$HUB`).
Its own docs: `$HUB/AGENTS.md`. Browse it at https://ui.sisolabs.space (the newest hub; signed in as Shaan it serves his
private build with the 138 curated picks and their code, everyone else gets the public build). Its source is
`hubs/ui` in the sisodias/siso monorepo. The older links (the dtc-storefront worker, the tailnet :8767 snapshot)
are stale: never send them.

## First: the surface's own standard

Every surface Shaan cares about gets one page that says how it is built, in the shape of the landing page's
`SISO-UI-STANDARD.md` (`~/SISO_Workspace/_data/worktrees/siso-agency-lp/siso-ecosystem/docs/specs/`, "build to the
footer's level"; reference build https://7cbd1492.siso-agency-showcase.pages.dev): 1. what Shaan judges, in his words;
2. the kit (the building blocks to reuse, with paths); 3. tokens (colours, type, motion); 4. traps already hit; 5. how to
prove it. That is how the landing page went fast and good: one page he signed off on, its parts named, everything else
built from them.

- The surface has a standard: read it before you touch anything, and build only from its kit.
- It has none: do not redesign many pages. Get one reference page right with Shaan (design-lab if there is a real fork),
  then write the standard from that page, then build the rest from it.

## The loop (every screen)

1. **Brief, one call.** `$HUB/bin/uihub brief <project|surface>`: the house rules, what fits this surface, the picks with
   install lines and the swaps already decided. Projects: `operator`, `model-app`, `agent-base`, `halo-crm`; surfaces:
   `dashboard`, `native-app`, `landing-site`.
2. **Take, don't draw.** The hub holds 13,590 UI items (11,950 with a live preview), not just his 138. Search with
   `$HUB/bin/uihub find <words> [--kind component|section|page|layout|motion]`, then `uihub show <id>` for his note, code
   and install line. Take from the highest rung that fits, and stop there:
   1. What he loves or starred (26 love, 5 star), then the rest of his 138 curated picks and the 74 he marked good. His
      note is the intent; read it. `ui-pick` ranks these against a brief in one call.
   2. Picked and ours: 31 library picks (`catalogue/picks.json`), 104 of our own (`catalogue/custom.json`), decided swaps
      (`catalogue/swaps.json`). Charts: `@siso/charts` (`$HUB/charts/SISO-CHARTS.md`).
   3. Looked at, not yet chosen: 301 rated and 1,285 reviewed. Good for slots he has not curated yet (sheets and
      drawers, tab bars, segmented controls, empty states, settings rows have few or none).
   4. The rest of the corpus (about 12,000 indexed, mostly 21st.dev). Read for the idea, rebuild against the project's
      tokens; never paste 21st.dev code into a product. Arc Pro, Kobra and Kinetics are reference only.
   - For a slot from rung 3 or 4, show him two or three real options (`show-shots` or `design-lab`) before you build;
     when he picks one, `uihub bookmark <id> --signal good --note "<his words>"` so the next agent starts from it. That
     is how the library grows past 138.
   - Nothing fits anywhere: build it against the project's tokens, then `uihub add siso:<id> --from <path> --reason
     "..."` before it ships.
   - A shell (sidebar, top bar, dock, bottom bar): `catalogue/app-frame.json` (read from 87 shells we hold) first.
   - **The project's own art goes in.** Before you draw an icon or leave a card plain, list what the project already
     made: `git ls-files | grep -iE '\.(svg|png|webp|jpg)$' | grep -vE 'screens/|proof/|reports/'`, plus any
     `*Art*.tsx`, `emptyArt`, `icons/` and `heroes/`. Generated art often lives outside the repo, in the project's art
     bank: for HALO, `SISO_Agency/partners/halo/oracle/uihub/decide/gen`. It holds hundreds of images; `SHIP-PLAN.json`
     gives each pick's slot and score, and `HOUSE-STYLE.md` gives the style. Use it creatively in widgets, cards and empty states. Shaan,
     17 Oct: "We've made a bunch of icons and visual SVGs for this project ... if they used them in widgets and cards,
     wherever they wanted creatively, it'd be so much better ... Empty states, whatever. We've made so much stuff."
3. **Mark.** First line of each component file: `// uihub: <id>`. `uihub check <project>` fails without it.
4. **Follow the rules** (below). House rules win any conflict.
5. **Prove it with a script, not a screenshot.**
   - `$HUB/bin/uihub check <url> --surface dashboard|native-app [--width 390]`: box in a box, type sizes per band,
     emoji, accent lines, inline colours, clickable non-buttons, tall empty states, broken images, motion without
     reduced motion. Exit 1 = fix it. (Uses one camofox tab; it closes it.)
   - `$HUB/bin/uihub check <project>`: every new component says where it came from.
   - impeccable's detector on the changed files (section "Borrowed checks").
   - A screenshot is for showing Shaan the result, never the test that it is good.
6. **Every state, both sizes.** Shoot the screen in every state that changes its look (open, closed, empty, loading,
   error, stale, hover, focus, pressed, long text, many items) at his laptop (1440x900) and a phone (390x844). A screen
   checked only at rest is not checked.
   **Look at it yourself first, in SISO Code** (the `mcp__t3-code__preview_*` tools; load them with ToolSearch). Most
   bad screens passed every machine check because no agent looked at them on a phone:
   - `preview_open` the dev or tunnel URL. Shaan sees the tab beside your chat, so he can watch.
   - `preview_resize {mode:"preset", preset:"iphone-14-pro-max"}`, then `iphone-se` for the small phone (and
     `{mode:"freeform", width:1440, height:900}` for the laptop).
   - Use `preview_click`, `preview_type` and `preview_scroll` to put the screen in each state. Then call
     `preview_snapshot {includeImage:true}` and read the image as Shaan would: crowding, white on white, clipped text,
     tap targets, what is missing, his words in the project's FEEDBACK file. Fix it before any check runs.
   - `preview_snapshot {save:true}` returns the PNG paths that `show-shots` inlines. `preview_recording_start`/`stop`
     records anything that moves (sheets, the tab bar, transitions).
   - Use the iOS Simulator (`device_open`) only when SISO Code has device access on and an iOS runtime is installed.
     Neither is true on the laptop as of 17 Oct, so use the preview presets.
7. **A fresh reviewer, only when Shaan is not looking.** While he is looking, he is the reviewer: skip this. Otherwise
   one short review by a new agent with no transcript (shots, the standard, his words; ship, fix or rebuild per
   component), done in minutes in the foreground. Shaan, 17 Oct: "it's unviable now to use sub-agents if they're gonna
   take that long". No background reviewers or scouts that run for minutes in his loop.
8. **Show him, numbered.** The `show-shots` skill: before beside after, laptop beside phone, every section numbered so
   he answers "3 worse, keep 2b". If he is around, walk him through the running app instead (`ui-iteration-round`).
9. **Keep what he approved.** His words verbatim in the project's reviews folder; an approved shot becomes the golden
   for that state, and the next change to that screen is diffed against it first. Nothing he liked is removed,
   swapped or restyled unless he asks.

## When the shape itself is open

Most work is not a redesign: build from the standard's kit and decide. Only when the structure is genuinely in question
(a new screen, a shell, a flow like going live or ending a show):
- Write the identity lock first, with real values: "Cam's creator phone theme, canvas 225 18% 4%, Montserrat, his
  PhoneFrame layout" beats "dark and clean". Never invent a look (17 Oct: a dark mode that was "my own invention").
- Make three options that differ in kind (layout, hierarchy, density, how the screen is split), not three colours of one
  layout. Show them with `show-shots`; he picks or mixes. Then build the one he picked.

## House rules (Shaan's, `$HUB/principles/0001-0015`, dated, his words)

1. Hover shows more; click commits.
2. Space comes before components (work >= 55% of the fold, actions <= 20%, glance <= 12%).
3. A page is bands: glance, then work, then detail. One 16 px gutter, one height per band, no box in a box.
4. Widgets are data, drawn in one frame.
5. Open detail in place (drawer, sheet, expand), not a new page.
6. Say it once, in fewer words.
7. Cards are for things, not for wrapping text.
8. A list beats a pile of cards; what's live is on top.
9. Tell the truth about state (loading, empty, error, stale: each looks different and says why).
10. The shell loads once; the data streams in. Skeletons at real size.
11. Take before you build.
12. Decide; show only the real forks.
13. Motion has a job.
14. One set of tokens, real type, real icons (no emoji as icons, no inline colours).
15. Fixed anchors, split buttons, one bell.

## Evidence rules

`~/SISO_Workspace/Great_Library_of_SISO/knowledge/design-system/principles/`: one file per rule with its sources and a
check; `DOS-AND-DONTS.md` is the one-page version; `checks.json` lists the ones a script tests. `VERIFIED.md` there
grades all 92 against their sources (17 Oct: 71 verified, 17 leads with one source, 4 out). Follow the verified ones;
a lead is a hint, never a reason to fail a build; never use an "out" rule.

The craft floor every screen meets (verified, and the checks below test most of it):
- Text contrast 4.5:1 (3:1 for large text and icons); over video, measure the composed contrast through the scrim, not
  the text colour alone.
- Every control has default, hover, focus-visible, pressed, disabled and loading; focus is never hidden under an overlay.
- Tap targets at least 24 px (44 px on a phone); phone inputs 16 px so iOS does not zoom; safe-area insets on a phone.
- Animate only transform and opacity, 150-250 ms, and honour reduced motion; pulse only for something live.
- Pop-ups and menus are drawn on the page (a portal), never clipped by an `overflow: hidden` parent.
- None of: gradient text, coloured side stripes on cards, cards inside cards, small uppercase kickers above headings,
  glass as decoration, emoji as icons.

## Borrowed checks

- **impeccable's detector** (pbakaus/impeccable, Apache-2.0): `DO_NOT_TRACK=1 IMPECCABLE_NO_TELEMETRY=1 npx impeccable
  detect --json <changed dir>`. Exit 0 clean, 2 findings, 1 scan failure. A path scan is static; pass the dev URL too
  (`npx impeccable detect --json http://...`) for the checks that need a rendered page. Its low-contrast check cannot
  see text over video, so measure that yourself. Ignore a finding that is the brand's own choice (HALO's Montserrat).
- **UI UX Pro Max** (nextlevelbuilder/ui-ux-pro-max-skill, MIT): lookup only, for a named problem (`search.py "<problem>"
  --domain ux --stack react`). Never use its design-system generator: it proposes looks that break the house rules.
- **design.md lint** (google-labs-code/design.md, Apache-2.0): only where a project keeps a DESIGN.md generated from its
  tokens; `npx @google/design.md lint --format json DESIGN.md`. The tokens file stays the one source.

## Never

- Judge your own UI from a screenshot and call it done.
- Add a library, a font or a colour that is not in the project's tokens or the hub.
- Restyle a screen Shaan is hand-rolling with a seat unless that seat asked for it.
- Copy HALO CRM code (Cam's repo) anywhere; read it, change it only by branch and PR in his repo.
