---
name: ui-science
description: "ui-science \u2014 measured UI science, as a checkable contract"

argument-hint: "[check <path> | explain <rule-id> | cite <topic> | build]"
user-invocable: true
---

# ui-science — measured UI science, as a checkable contract

Most UI advice is folklore or influential opinion. The real science bottoms out in a
**measurement of a human** — a reaction time (Fitts), a color-discrimination ellipse
(MacAdam), a recall rate (Bateman), an eye-track (NN/g). This skill turns that verified
subset into a contract you can CHECK, and every finding cites the measurement it rests on.

**The tell that sorts real from fake:** if a claim can't be traced to "someone measured a
person doing this," it's craft or folklore — hold it loosely. See `references/evidence.html`
for the verified receipts (each checked at its primary venue).

## Modes

### `check <path>` — run the deterministic checker
```
node scripts/check-ui.mjs <file-or-dir>          # human-readable
node scripts/check-ui.mjs <file-or-dir> --json    # structured contract for agents/CI
```
Scans `.css/.scss/.html/.tsx/.jsx/.vue/.svelte/.md/.txt`. Emits findings + exit code
(**0** clean / **1** warn / **2** error). Each finding: `id, tier, severity, receipt, fix`.
Deterministic rules run here; judgment rules are listed under `llmRules` for you to evaluate.

Run it and READ the receipts back to the user — the citation is the point, not just the flag.

### `explain <rule-id>` — show the science behind one rule
Read `scripts/rules.json`, find the rule, and explain its `claim` + `receipt` + `fix` in
plain language. E.g. `explain color.oklch-ramp-uniformity` → the MacAdam→OKLCH chain.

### `cite <topic>` — return verified primary sources
Point at `references/evidence.html`. Give the user the real papers (author/year/venue),
separating EVIDENCE (measured) from OPINION (Tufte/Few) from FOLKLORE (debunked).

### `build` — generate UI that obeys the contract
Load these always-on principles into context and follow them while writing UI code:

<principles>
COLOR: Build color ramps with EVEN OKLab-lightness steps (use `oklch()`), never even HSL
lightness — HSL steps are perceptually uneven [MacAdam 1942]. Meet WCAG AA contrast
(>=4.5:1 body). Never gray text on colored backgrounds; tint toward the background hue.

MOTOR: Interactive targets >= 44px (extend hit area with padding if the visual is smaller)
[Fitts 1954]. Put frequent targets near the pointer or at screen edges to cut travel.

MEMORY: Never make the user hold a value in mind across steps; carry it forward on-screen.
Working memory is ~4 chunks [Cowan 2001], not 7 — there is no "max 7 widgets" law.

DATAVIZ: Encode the primary comparison as position/length (bar/dot/line), not angle/area
(pie/bubble) [Cleveland-McGill 1984]. For small samples, show the distribution, not a bar
of the mean [Weissgerber 2015].

DON'T cite folklore as justification: Miller's 7±2 (it's ~4, and about serial recall, not
layout), "design for the F-pattern" (NN/g says counteract it), "always maximize data-ink"
(Bateman 2010 refuted the strong form). These get flagged by `check`.
</principles>

Then run `check` on what you built and fix any findings before shipping.

## What this is / isn't
- **Is:** a review-moment gate + build-time principles, grounded in verified measurement,
  citing sources. Deterministic where a formula exists; the rest surfaced for agent judgment.
- **Isn't:** a taste engine or a replacement for a designer. It catches *violations of
  measured science* and *folklore*, not everything that makes UI good. Tier-3/craft rules
  are flagged honestly as opinion, not law.

## Files
- `scripts/check-ui.mjs` — the checker (Node, no deps)
- `scripts/rules.json` — the contract (each rule carries a receipt)
- `scripts/color.mjs` — OKLab/OKLCH + WCAG contrast math
- `references/evidence.html` — verified primary sources (the receipts)
