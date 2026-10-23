# adversary — lens catalog

Six lenses. Each runs inside the **god frame** ("perfect already exists; measure the gap"), driven by one or both personas, and is always paired with an independent default-refuted confirm stage. Source of truth: `premises.json`. This file is the human "when do I reach for which" guide.

---

## `bugs` — the 3am-page hunter
**Persona:** BAD-DAY SKEPTIC.
**Reach for it when:** you have a diff or file and want correctness hardened — before a PR merges, before a soak window, after any logic change.
**What it catches:** edge cases, nulls, off-by-ones, races, partial-failure/rollback gaps, resource leaks, silent data corruption, time/locale/encoding traps.
**Example multiplied premises:**
- mid → "There are at least 20 real bugs here and you've been finding only the easy ones. For each, name the input that triggers it."
- god → "There are 1000 bugs. Find the 20% that cause 80% of the 3am pages — data-loss paths, silent corruptions, races that only fire under load. The perfect version has ZERO of these. Every one comes with the exact triggering path."

## `architecture` — the won't-survive-scale lens
**Personas:** GOD + BAD-DAY SKEPTIC (top-down vision + bottom-up paranoia).
**Reach for it when:** a subsystem is about to be extended, or you suspect a decision will force a rewrite (e.g. adding platform connector #6, scaling to 40 models).
**What it catches:** coupling, bottlenecks, snowflake-per-case code, leaky abstractions, missing seams, unenforced implicit contracts.
**Example multiplied premises:**
- mid → "This won't survive 40 models x 10 platforms. Find every place it breaks under that load."
- god → "The perfect version is 10x better, not 2x. Name the ONE structural change that closes the most distance, and prove the current shape fails without it."

## `efficiency` — the prove-it-and-cut-it lens
**Personas:** BAD-DAY SKEPTIC + GOD.
**Reach for it when:** a path is hot, a function is large, or code smells bloated; pairs well after `bugs` on the same diff.
**What it catches:** redundant computation, repeated passes, quadratic loops, N+1s, read-all-replace-all, needless allocation, layers that exist for nothing.
**Example multiplied premises:**
- mid → "Find every redundant computation, repeated pass, quadratic loop, over-abstraction. Give the cheaper equivalent for each."
- god → "This is 10x slower and 10x more complex than the perfect version. Prove the waste with the actual hot path and write the cut."

## `not-magical` — the god-tier elegance lens
**Persona:** GOD only (this is a vision lens, not a paranoia lens).
**Reach for it when:** code is correct but you want it *great* — keystone modules, public APIs, anything a future agent will read often.
**What it catches:** clumsy naming, ceremony, indirection that hides intent, habitual patterns a superintelligence would dissolve, comments that exist because the code isn't clear enough.
**Example multiplied premises:**
- mid → "This does not feel magical. Find where it is merely correct instead of beautiful."
- god → "The perfect version makes a reader GASP — every line inevitable, nothing removable. Measure exactly how far below that this sits, line by line, and show the magical version."

## `ai-legibility` — the agent-context lens (bridges to `siso-codex`)
**Personas:** GOD + BAD-DAY SKEPTIC.
**Reach for it when:** an AI agent works in this repo repeatedly and keeps re-deriving where things are; at the start of bringing a new repo under agent control.
**Special behavior:** this lens ALSO **checks whether a `.siso-wiki/` map exists and is fresh** (mtime vs the code it indexes) and proposes the specific context to bake in. If the wiki is missing or stale, that is the **top finding** and the fix is to run **`siso-codex`**.
**What it catches:** missing index, unmapped module boundaries, undocumented contracts, conventions knowable only by reading 10 files — i.e. recurring orientation/token costs.
**Example multiplied premises:**
- mid → "An agent burns thousands of tokens orienting here. Find every place context is implicit and should be baked in. Does `.siso-wiki/` exist and is it fresh?"
- god → "In the perfect repo an agent reads ~500 tokens of baked-in map and instantly knows where everything is. Measure the gap; design the minimal `.siso-wiki` + inline-contract layer that collapses it. No fresh wiki = top finding → run siso-codex."

## `ui-soul` — the would-she-gasp lens (taste; Claude may arbitrate)
**Persona:** GOD. **The one lens where FIND or arbitration may be Claude**, because UI judgment is taste, not mechanics.
**Reach for it when:** any model-facing UI/cockpit work — GENERATIVE mode to build an improvement pool, or CRITIQUE on a built screen.
**What it catches:** generic-dashboard feel, operator-ish coldness, missing delight/celebration, language that talks like a tool not a hype-person, default-not-chosen visual decisions, flatness where there should be a peak.
**Confirm anchors to the locked UI bible:** performer-not-operator, white-clean + glossy-candy playful, `#ff0069`, never "dashboard," child-being-cheered-on persona, the 8h emotional arc.
**Example multiplied premises:**
- mid → "This reads as operator software — utilitarian, cold. Find everywhere it fails the performer."
- god → "The perfect version makes HER GASP the first time she sees it — made for her, celebrates her, has soul. Measure the gap, and say exactly what would make her fall in love with it."

---

### Picking persona count
- One persona when the failure class is single-axis (`bugs` = paranoia only; `not-magical`/`ui-soul` = vision only).
- Both when the lens spans vision *and* paranoia (`architecture`, `efficiency`, `ai-legibility`) — they catch genuinely different things, so the extra Codex call is worth it.
