---
name: bykonz-ui-bank-review
description: Design and review BykonzYard cards, heroes, community sections, and footers using the local SISO UI Base/21st.dev bank before changing production UI. Use when replacing hand-rolled comps, adapting new images, or building a component review preview for the BykonzYard React/Vite site.
---

# BykonzYard UI bank review

Use this workflow for the BykonzYard site at:

`~/SISO_Workspace/SISO_Agency/clients/fahmy-2026-08/bykonzyard`

## Source of truth

- The real component bank is `~/SISO_Workspace/_data/worktrees/siso/main/library/banks/siso-ui-base` (sisodias/siso; the BYKONZ tenant is in `SISO_Agency/partners/fahmy/ui-base-tenant`).
- Use `~/SISO_Workspace/.agents/skills/ui-bank/SKILL.md` for bank-query rules.
- Do not confuse it with the older `ecosystem-laptop-import/SISO-ECOSYSTEM/SISO-UI-Library` snapshot.
- Search the curated bank first with `registry/curated/query.mjs`; search the full corpus with `registry/21st/find.mjs` when the curated results do not cover the need.
- Read the candidate's feedback/notes and inspect its preview plus bundle/source. Adapt the structure and interaction; do not paste generic styles or replace the Yard's copy, photography, fonts, or palette.

## Bykonz implementation constraints

- The client preview is React 19 + Vite with global CSS tokens. It is not a Tailwind/shadcn application. Do not add a framework migration just to use one 21st.dev component.
- Keep the existing Yard tokens and fonts from `react-preview/src/site/tokens.ts`.
- Prefer a shared component family over page-specific CSS forks. A card should have stable slots for media, eyebrow, metadata/date, title, description, and actions.
- A page may change the composition around a card, but should not duplicate the card's internal spacing, button alignment, image fitting, or responsive rules.
- Use real Bykonz copy and existing assets. Keep flyers as `contain` only when the artwork needs its full poster visible; use `cover` for photographic cards.

## Review workflow

1. Find two to four relevant bank candidates and inspect their local previews/bundles.
2. Choose a small set of primitives: card shell, media frame, metadata rail, action row, badge, pagination, and responsive rules.
3. Build a safe review route or component gallery using Bykonz content and assets. Do not replace production cards before the direction is visible.
4. Check desktop and narrow mobile states, especially title wrapping, image crop, button alignment, and card height.
5. Once a direction is chosen, extract one reusable React component and use it across the relevant pages. Keep page-specific styles limited to layout wrappers.
6. Run the React preview build and `git diff --check` before claiming the change is ready.

## Current preferred patterns

- Card 22 (`ravikatiyar162/card-22`) is the starting point for image-first mobile Up Next/event cards: image, concise metadata, title, short copy, and a bottom-anchored CTA.
- The curated blog-post card is a good community/story card when the image and short editorial copy are the focus.
- A compact event/schedule card is better for past-event lists and smaller event rails than the large poster card.
- A curated bento/feature card is better for landing-page and community feature sections.

## New image discovery

When the user says images were generated today:

- Check the Bykonz project source assets and generated folders first, excluding build output.
- Check `~/Downloads` for files named `ChatGPT Image <date>` and verify their filesystem timestamp and dimensions.
- Inspect the images before copying or cropping. Composite moodboards are references, not automatically production-ready individual assets.
- Preserve the originals; create clearly named derived assets inside the project's existing asset structure only after selecting the crops needed by the design.

## Deliverable language

Report which bank patterns were used, which local assets were selected, what is preview-only versus production, and the exact build/check result. If the user has not chosen a direction, show the review board and wait for the design choice instead of silently swapping every page.
