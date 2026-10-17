---
name: show-shots
description: Put screenshots straight into Shaan's chat in SISO Code (T3) - before/after, every state, laptop and phone - as one page above your reply, so he reviews by looking, not by opening links. Use whenever you change a screen, component, chart or page and want his eyes on it, for every UI round, and whenever you would otherwise paste a screenshot path or a localhost link.
version: 1.0.0
tags: [ui, screenshots, review, t3, html_render]
---

# Show shots in the chat

Shaan, 17 Oct, about the HALO Operator seat: "he's outputting screenshots to me literally in the chat ... that should be a
skill that agents can do easily because that's so nice that's so clean". This is how that seat does it.

The trick is one SISO Code (T3) tool, `html_render`: you write a small HTML page with `<img src="/abs/path.png">`, T3 inlines
every local image into the page, and the page shows above your reply. Nothing to host, no link to click, and it still
shows later because the images are embedded, not linked.

## The four steps

1. **Shoot.** Use the project's own shot script if it has one (it holds the clock, data and fonts still); otherwise
   Playwright or Puppeteer against the dev server. Write the PNGs to one folder per round, e.g.
   `/tmp/<surface>-shots/<round>/before/` and `after/`. Shoot:
   - his laptop (1440x900, or 2000x1250 when he is judging layout) and a phone (390x844) when the screen is used on one;
   - every state that changes the look (open, empty, loading, error, hover/focus, long text), not only the resting one;
   - one element shot per component as well as the full page when he is judging components.
2. **Look yourself first.** `Read` each PNG at full size. If one got worse, fix it or roll it back before he sees it. A
   shot he sees is a claim that it is good.
3. **Render the page.** Check it with `html_preview` (it returns the height), then `html_render` with that height
   (2000 max; longer pages scroll inside the frame). Keep the page plain:
   ```html
   <!doctype html><html><head><style>
   body{font-family:var(--font-sans);margin:0}
   h3{margin:22px 0 6px;font-size:15px}
   h4{margin:12px 0 6px;font-size:12px;color:var(--muted-foreground)}
   .g{display:grid;grid-template-columns:1fr 1fr;gap:10px}
   img{width:100%;border-radius:var(--radius);border:1px solid var(--border);display:block}
   </style></head><body>
   <h3>1. Models: list</h3>
   <div class="g"><div><h4>Before</h4><img src="/tmp/x/before/models.png"></div>
                  <div><h4>After</h4><img src="/tmp/x/after/models.png"></div></div>
   </body></html>
   ```
   - No page background, no outer card or banner title: the page sits in his chat. Use T3's theme variables
     (`--border`, `--muted-foreground`, `--radius`, `--font-sans`).
   - Number every section (1, 2, 3; states as 2a, 2b) so he can answer "3 is worse, keep 2b".
   - Before | After side by side; a phone shot beside its laptop shot. Under each pair, at most three bullets: added,
     changed, kept (what he picked stays).
   - The reply column is 728 px wide, so two laptop shots side by side are small: for detail, give a shot its own row
     or crop to the component.
   - Keep the HTML under 512 KB (the images do not count; they are inlined after). Six to ten shots per page reads
     well; split a big round into one page per screen.
4. **Reply with only what the page doesn't say.** It is already above your reply: don't announce or describe it. One or
   two lines: what you'd keep, what you are doing next, and where it runs (the dev URL).

## When he answers

- Save his words verbatim in the project's reviews folder, next to the round's shots.
- Act on each numbered item. Next round, re-shoot the same names so before/after line up.
- A shot he approved is the golden for that state: keep it under the project's goldens folder and diff against it
  before the next change, so nothing he liked regresses.

## Never

- Paste a bare screenshot path or a localhost link and call that showing him.
- Show a shot you have not looked at yourself.
- Judge a UI as good from your own screenshot alone: the screenshot is for him; the checks in `siso-ui` say pass or fail.
