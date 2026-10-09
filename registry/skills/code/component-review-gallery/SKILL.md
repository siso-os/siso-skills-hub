---
name: component-review-gallery
description: Build a client-facing web gallery that shows several design options for one component (footer, hero, pricing block, card) using the client's real brand assets, and publish it to a URL they can open on their phone. Use when someone wants to stop design back-and-forth with options a client can compare and screenshot, or asks for a variant or comparison page for a component.
metadata:
  short-description: Client-facing component option galleries
---

# Component review gallery

Give a client one link that shows the same component built several different ways, with
their own logo, copy, links and artwork, and a Desktop/Mobile switch. They scroll it on a
phone and reply with a number. The point is to replace guessing and long threads with a
side-by-side the client can actually see.

## What you are building

Scaffold from `assets/template/` and write one component data file. The harness already
provides:

- `site/index.html` listing components under review
- `site/review.html` the gallery: option tabs, Desktop/Mobile switch, live thumbnails
- `site/render.html` renders one option alone, which is also the shareable deep link
- `site/styles/review.css` neutral grey chrome, never the client's design
- `scripts/check.mjs` gate: variant fields, stable ids, every referenced asset present
- `scripts/shots.mjs` renders every option at 1440x900 and 390x844 and reports failures
- `deploy.sh` publishes `site/` to its own Cloudflare Pages project

A finished component has six variants, each carrying the same real content, differing only in
arrangement, weight and how much artwork shows. (Our worked example came from a client job, so it
stays out of this public repo; `references/writing-variants.md` has the method.)

## Workflow

1. Scaffold next to the client's project (not inside their repo):

   ```bash
   node scripts/new-gallery.mjs <client-folder>/component-review \
     --client "Client Name" --project <client-slug>-variants
   ```

2. Collect the real assets from the client's repo before designing anything: the approved
   logo, the social links in use, the live navigation labels, the real tagline, and their
   background plates. Copy them into `site/assets/` rather than hotlinking the live site,
   so the gallery keeps working when the site redeploys. Downscale large plates with
   `sips -Z 1800 -s format jpeg -s formatOptions 74 <in> --out <out>`.

3. Write the component file as data: `id`, `label`, `status`, `summary`, `brief`, a shared
   `baseCss`, and a `variants` array. Read `references/writing-variants.md` before the
   first draft of a new component type.

4. `node scripts/check.mjs` until clean. The usual first failure is an asset path that
   does not exist yet, which is the check doing its job.

5. Serve `site/` locally and run `node scripts/shots.mjs`, then look at the PNGs. Judge
   the mobile renders first: that is where the client will actually read it.

6. `./deploy.sh`, then re-run `node scripts/shots.mjs https://<project>.pages.dev` so the
   live render is verified rather than assumed.

## Rules that keep the comparison honest

- Every variant carries the same real content: same links, same copy, same socials, same
  sign-up. Variants differ in arrangement, weight and how much of the artwork shows.
- Set `defaultVariantId` to the client's current design when there is one, so their own
  version opens first and the new directions sit beside it.
- Variant ids are stable once the client has seen them: option 3 stays option 3.
- Never let the gallery chrome borrow the client's palette or type. It must read as a
  tool, not as another design to review.
- Deploy to a Pages project separate from the client's live site, and keep
  `X-Robots-Tag: noindex` in `site/_headers`.
- Put the review in the client's own account when they have Cloudflare credentials;
  otherwise use whichever account owns the site being reviewed.

## Reporting back

What the person sending the link needs is: the URL, what each option is called, and which
one you would pick. Screenshots land in `shots/` and can go straight to the client.

If the gallery is being shown to a client, hand over the deep link for their current
design alongside the new options, for example
`https://<project>.pages.dev/review.html?c=footer&v=6`, rather than the bare gallery URL.
