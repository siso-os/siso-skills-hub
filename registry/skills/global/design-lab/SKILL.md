---
name: design-lab
description: Build a live, hosted, side-by-side comparison page so a human picks a UI/design direction by LOOKING at rendered options instead of reading names or prose. Use whenever there is a choice between UI options, layouts, components, shells, themes or variants; whenever asked to "redesign"/"improve"/"clean up" a page; whenever about to describe a design change in words or build one version and hope; and whenever offering components from a scraped corpus. Renders real component source live (server-side Sucrase, no build step), uses the real app's data, shows honest failure cards for whatever cannot render, and ends with a URL that has been verified in a headless browser.
---

# Design Lab — let them pick by looking

The output is **one hosted URL** showing every option rendered live, side by side,
from the real component source, with the real app's numbers in it. Not screenshots,
not mockups, not a prose list of recommendations. The human opens the link and points.

Worked example (HALO CRM, 2026-09-16): <https://halo-dashlab.dtc-storefront.workers.dev>
— 16 demos, all rendering. Source: `docs/dashboard-lab/` on branch `siso-ui` of the
halocrm `ui-21st` worktree (commit `805fb69`). A sibling picker rendered 75 candidates,
63 as real screenshots and 12 as honest failure cards (`docs/ui-bank/21st-picker.html`,
commit `431c902`). HALO paths below are **worked examples, not assumptions** — every
project has its own equivalents.

---

## When to use it

- The user has to choose between UI options — shells, layouts, components, themes.
- You are about to write "I recommend component X" or "we could do A, B or C".
- You are about to build one version and hope it is the one they wanted.
- You are offering components from a scraped corpus or a component bank.
- Someone says "redesign this page", "make this better", "clean this up".

## When NOT to use it

- One obvious change, already agreed. Just make it.
- The blocker is data or backend, not appearance. Say that instead (and see
  **Honesty rule 5**) — a lab that dodges the real blocker is worse than no lab.
- A pure copy/content change with no visual decision in it.
- There is genuinely only one option. Do not manufacture variants to fill a grid.

---

## The recipe, in order

### 1. Get the brief in their own words
Collect verbatim quotes — from the transcript, a voice memo, a review doc.
Put them **on the page** next to the options they refer to. It proves you listened
and it anchors each choice to the thing they actually complained about.

> HALO: `"it shouldn't say dashboard up here on the title, it's a waste of space,
> like you know the primitives, like you'd have breadcrumbs."` — rendered as a
> `.quote` block at the head of the shell section.

### 2. Measure the problem before proposing a fix
Reproduce the current state as **demo zero**, from the actual source, and put a number
on what is wrong. Options are then measured against it, not against a vibe.

> HALO: "Dashboard" appears 3× (`ProtectedRoute.tsx:130` topbar H1, `Dashboard.tsx:59`
> page H1, sidebar active item); ~177px consumed before any data. Breadcrumb shells
> reclaim 82–121px. That `177px` is why the page is persuasive.

Include the current state as a card, styled as a loser (`.card.dead`). The contrast
does the arguing for you.

### 3. Open every candidate's source before you promise it
**Never offer a component you have not read.** A directory name, a rating, a
`source-meta.json` and an `upstreamUrl` are all *claims*. The file is the evidence.

> HALO: **206 of 5,210** `.tsx` entries in `siso-component-bank/source` are
> byte-identical 17-line placeholder stubs — 21st.dev's default "Component Example"
> counter, saved when the scrape 404'd instead of failing loudly. Two of Shaan's own
> curated picks (`area-charts-1`, `statistics-card-7`) were dead this way.
> See `docs/ui-bank/CORPUS-HEALTH.md` + `dead-corpus-entries.json`.

```bash
# dead-stub check: 17 lines containing setCount means dead
wc -l <dir>/code.tsx && grep -c setCount <dir>/code.tsx
```

Also check the component does what its *name* says: `line-charts-1` is 290 real lines
but is a copy of shadcn's `chart.tsx` wrapper — it exports `ChartContainer` and draws
no chart at all. Real code, wrong thing.

### 4. Stage sources read-only
Copy candidates into the lab directory. **Touch nothing under `src/`.** State this on
the page and in the commit: *this is a proposal, not an implementation*.

```
docs/design-lab/
  server.mjs          # the renderer
  public/index.html   # the comparison page
  demos/*.tsx         # one entry point per option — mounts the component with REAL data
  comps/*.tsx         # read-only copies of candidate sources
  ui/*.tsx            # read-only copies of the project's own primitives
  vendor/sucrase.mjs  # ~207KB, gitignored — see §Rendering
```

### 5. Write one demo per option, with the real app's numbers
This is the step that separates a design lab from a component gallery. Never lorem
ipsum. Query the actual database or read the actual API.

```tsx
/* demos/stats-card.tsx — REAL HALO numbers */
<ActivityStatsCard title="Total Creators" mainValue="16" changeValue={14.3}
  chartData={weeks([11,12,13,14,15,16],[9,10,11,12,13,14])} />
<ActivityStatsCard title="A Team" mainValue="4" changeValue={33.3} ... />
```

16 creators and 4 on A Team are the real counts. Seeing their own numbers is what
makes someone able to judge whether a layout works.

### 6. Group by decision, not by component
Sections are the questions being asked — "1 · Topbar & shell", "2 · Search",
"3 · Stat pills", "4 · Graphs", "5 · Recent activity" — each with 2–3 options and a
sticky table of contents. One decision per section.

### 7. Host it and verify through the public URL (§Hosting, §Verification)

### 8. Close with what is NOT real
A final section listing every gap, its real blocker, and what it would actually take.
See **Honesty rules**.

---

## The rendering pipeline

Real `.tsx` sources → browser ESM, **no npm install, no build step, no bundler**.

### Transpile SERVER-SIDE with vendored Sucrase

**This is the load-bearing discovery. Browser-side Babel cannot parse the TypeScript
annotations in these sources** — it fails on the type syntax and you get a blank
frame with an unhelpful error. Do not spend an afternoon rediscovering this.

Vendor one file, ~207KB, committed nowhere or gitignored:

```bash
# from an existing lab
scp halo-vps:~/halo/portal/vendor/sucrase.mjs vendor/
# or build one fresh
npx esbuild sucrase --bundle --format=esm --platform=neutral --outfile=vendor/sucrase.mjs
```

```js
import { transform } from './vendor/sucrase.mjs';
const code = transform(raw, {
  transforms: ['typescript', 'jsx'],
  jsxRuntime: 'automatic',
  filePath: `${name}.tsx`,
  production: true,
}).code;
```

### Bare specifiers → esm.sh on ONE pinned React

Mismatched React copies break hooks with `Invalid hook call` / `null is not an object
(reading 'useState')`. Every dep gets `?external=react,react-dom` so it borrows the
single React from the importmap.

```js
const REACT = 'https://esm.sh/react@18.3.1';
const imports = {
  react: REACT,
  'react/jsx-runtime': `${REACT}/jsx-runtime`,
  'react-dom': 'https://esm.sh/react-dom@18.3.1?external=react',
  'react-dom/client': 'https://esm.sh/react-dom@18.3.1?external=react&path=/client',
};
```

**Scan the real `import` statements — never trust a manifest's `dependencies`.**
shadcn's `button.json` lists only `react-slot` while its source also imports
`class-variance-authority`. Build the importmap from what the file actually imports,
including every transitive staged file, or the page dies on a bare specifier.

### Pins that are known to be needed

| Specifier | Pin | Why |
|---|---|---|
| `lucide-react` | `0.446.0` | corpus components use legacy icon names dropped in later releases |
| `@tanstack/react-table` | `8.20.5?bundle` | **needs `?bundle`** or its internal imports fail to resolve |
| `recharts` | `2.15.4` | v3 changed the API the sources are written against |
| `react-resizable-panels` | `2.1.7` | sources use v2 `PanelGroup`/`PanelResizeHandle`; esm.sh latest is v3 `Group`/`Separator` |
| `framer-motion` | `11.11.17` | also serves `motion/react` + `motion/react-client` |
| `@iconify/react` | `5.0.2` | network icon fetch — flag the cost on the card |

Unresolvable, shim or exclude: `next/image`, `next/link`, `next/router`,
`next/navigation`, `@shadcn/react`.

### Shim project-local imports — BOTH forms

Components reference project paths that do not exist in the lab. You must handle
**the alias form AND the relative form** — missing the relative one is a common
half-fix that leaves a subset of components broken:

```js
code = code.replace(/@\/components\/ui\//g, '/mod/ui/');
code = code.replace(/@\/lib\/utils/g,       '/mod/lib/utils.js');
code = code.replace(/(from\s*["'])cn(["'])/g, '$1/mod/lib/utils.js$2'); // bare "cn" specifier
code = code.replace(/@\/hooks\//g,          '/mod/hooks/');
// AND the relative form — ../../lib/utils, ./components/ui/button, etc.
code = code.replace(/(from\s*["'])(\.{1,2}\/[^"']+)(["'])/g,
  (m,a,spec,z) => `${a}/shim?spec=${encodeURIComponent(spec)}${z}`);
```

Two shim strategies, pick per situation:

1. **Real primitives** (preferred when the project has them) — serve the project's own
   `ui/*.tsx` through the same transpile route. The preview then looks like the real app.
2. **Proxy stub** (for a wide corpus sweep) — a generated module exporting a
   passthrough component for every identifier the importer asked for. Named exports
   cannot come from a Proxy, so **generate a concrete module per request** listing
   exactly the names in that file's import clause. Say so on the card: *"previewed
   with stubbed primitives, so the real thing will look closer to the app's own styling."*

Ship a real `cn()` rather than an npm round-trip (clsx + a naive tailwind-merge where
the last conflicting utility on a prefix wins). A 6-line alias file fixes a whole
category of misses:

```tsx
/* ui/modal.tsx — SHIM: component imports "@/components/ui/modal"; the app has "dialog" */
export { Dialog as Modal, DialogContent as ModalContent, DialogTitle as ModalTitle,
         DialogTrigger as ModalTrigger, DialogHeader as ModalHeader,
         DialogFooter as ModalFooter } from '@/components/ui/dialog';
```

### Props for components that ship no data
Many corpus components require a `transactions`/`items` array and ship none — mounting
with `{}` throws on `.map()`. Infer prop names from the destructured signature and
synthesise plausible rows. **Label it on the card** — that preview shows layout and
behaviour, not your data.

### Serve it
Routes: `/` the page · `/demo/<name>` an iframe harness · `/demo/<name>.js` the
transpiled demo · `/mod/comp/<slug>` a candidate · `/mod/ui/<name>` a primitive ·
`/mod/lib/utils.js` the `cn` shim · `/api/health` for verification.

Each harness page carries Tailwind from `cdn.tailwindcss.com` with the project's real
theme tokens, the importmap, and a **visible error bar**:

```html
<div id="err"></div>
<script>
function fail(m){var d=document.getElementById('err');d.style.display='block';
  d.textContent='LIVE RENDER FAILED: '+m;}
window.addEventListener('error',e=>fail(e.message||String(e.error)));
window.addEventListener('unhandledrejection',e=>fail((e.reason&&e.reason.message)||String(e.reason)));
</script>
```

A failure must be **loud and on-screen**, never a silently blank frame.

---

## Hosting

### Route A — plain local (default; start here)
```bash
LAB_PORT=8844 node server.mjs      # http://127.0.0.1:8844
```
Good enough when the user is at the same machine. Everything below is only needed
for a URL that survives the session.

### Route B — persistent public URL, rootless box, no ports 80/443

The trick, generalised from `~/.claude/skills/halocrm/SKILL.md`:

- Ports 80/443 cannot be bound (`ip_unprivileged_port_start=1024`) and ACME needs
  them — so no Let's Encrypt, no Caddy TLS.
- **High ports are externally open.**
- A **Cloudflare Worker terminates TLS** and proxies to the high port.
- Workers **reject raw IPs** but accept hostnames — **`sslip.io` resolves any
  IP-shaped hostname** (`62-171-132-124.sslip.io` → `62.171.132.124`), no DNS to set up.

```js
// worker.js
const ORIGIN = "http://62-171-132-124.sslip.io:8844";   // dashes, not dots
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const req = new Request(ORIGIN + url.pathname + url.search, request);
    req.headers.set("X-Forwarded-Proto", "https");
    req.headers.set("X-Forwarded-Host", url.host);
    return fetch(req, { redirect: "manual" });
  },
};
```
```toml
# wrangler.toml
name = "halo-dashlab"
main = "worker.js"
compatibility_date = "2026-09-01"
workers_dev = true
```
```bash
npx wrangler deploy      # -> https://<name>.<subdomain>.workers.dev
```

**Rootless service — systemd *user* unit, no Docker, no sudo:**

```ini
# ~/.config/systemd/user/design-lab.service
[Unit]
Description=Design Lab (comparison page)
After=network.target
[Service]
Type=simple
WorkingDirectory=%h/lab
Environment=LAB_PORT=8844
Environment=LAB_HOST=0.0.0.0
Environment=PATH=%h/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=%h/.local/bin/node %h/lab/server.mjs
Restart=always
RestartSec=3
[Install]
WantedBy=default.target
```
```bash
rsync -az ./ box:~/lab/
ssh box 'systemctl --user daemon-reload && systemctl --user enable --now design-lab'
ssh box 'systemctl --user restart design-lab'
```

`LAB_HOST=0.0.0.0` matters — bound to `127.0.0.1` the Worker gets a connection refused
and the page is a Cloudflare error, not your lab.

### Route C — static screenshots
When options cannot be served live (assets on another machine, heavy deps), screenshot
each one with Playwright at 1440×900 and build a static HTML picker
(`docs/ui-bank/21st-picker.html`). Still real components actually running — just
captured. **Failure cards still carry the real reason.**

---

## Honesty rules — these are what made it good

1. **Show, don't describe.** They pick from rendered options, never from names or
   prose. If you find yourself writing a paragraph explaining what a component looks
   like, render it instead.
2. **Real data, not lorem ipsum.** Their actual counts, names, numbers. Seeing "16
   Total Creators" is what makes a layout judgeable.
3. **Honest failure cards.** Anything that will not render gets a card stating the
   **real reason and the missing dep** — `Failed to fetch dynamically imported module:
   .../resizable-table.js`, `render: data is not iterable`,
   `Not in package.json: @tanstack/react-table`. 12 of 75 failed on the picker and all
   12 were shown. **A smaller honest set beats a padded one.** Never quietly drop a
   candidate to make the grid look full.
4. **Surface findings that contradict the brief.** Two of Shaan's own picks were dead
   stubs. The page said so plainly, in the section where they would have appeared,
   rather than quietly substituting something else and hoping he would not notice.
   Contradicting the brief with evidence is the job.
5. **State what a UI change cannot fix.** "Recent Activities" is empty because
   `ActivityContext.tsx` stores activities in `localStorage` (`creator_activities`),
   per-browser — **there is no activities table in Postgres.** A prettier list
   component does not fix that. So: render the options to settle the *look*, and say
   in the same breath that the data layer is separate, larger work. Do the same for
   notifications and tasks — neither table exists either.
6. **Disclose every substitution.** When you replace a dead component, label the card
   with what was replaced and why: *"Neither is faked here. The working substitute is
   the card above — same building blocks, actual charts, built from what's already in
   the repo."*
7. **Declare the scaffolding.** Stubbed primitives, synthesised props, placeholder
   avatars — each says so on its own card.
8. **Name the cost of each option.** "+ framer-motion, lucide-react", "zero new deps",
   "pulls icons over the network from @iconify/react — swapping to lucide-react drops
   that dependency".
9. **End with a recommendation.** After all the options, one short "shortest path"
   block with a concrete pick per section. They asked you to have an opinion; the lab
   earns you the right to one.
10. **Say it is a proposal.** On the page, in the README, in the commit: no file under
    `src/` was modified.

---

## Verification checklist — before you hand over the URL

Never send a link you have not loaded yourself. Run these in order.

```bash
# 1. service is up and is YOUR build
ssh box 'systemctl --user status design-lab --no-pager | head -5'
curl -s https://<url>/api/health          # {"ok":true,...,"uptime_s":817}

# 2. the page itself
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" https://<url>/   # 200, non-trivial size

# 3. count the demos the page actually links
curl -s https://<url>/ | grep -c 'iframe src="/demo/'
```

Then in a **headless browser, through the PUBLIC URL** (not localhost — the Worker,
the sslip.io hop and mixed-content rules only fail in the real path):

```js
const names = await p.evaluate(() =>
  [...document.querySelectorAll('iframe[src^="/demo/"]')].map(f => f.getAttribute('src').slice(6)));
for (const n of names) {
  const q = await ctx.newPage();
  q.on('pageerror', e => errs.push(e.message));
  await q.goto(`${BASE}/demo/${n}`, { waitUntil: 'load' });
  await q.waitForTimeout(2500);                    // esm.sh is a network fetch
  const r = await q.evaluate(() => {
    const root = document.getElementById('root'), err = document.getElementById('err');
    return { nodes: root.querySelectorAll('*').length,
             err: err && getComputedStyle(err).display !== 'none' ? err.textContent : null };
  });
}
```

**A node-count heuristic is not sufficient.** Trigger-only demos (a search button, an
avatar) legitimately have 3–6 nodes at rest and a naive check calls them failures.
For anything with a trigger, **click it with a real pointer and assert the panel opens**:

```js
const t = await p.$('button, [role="button"], [aria-expanded], [aria-haspopup]');
await t.click();                                   // Playwright pointer click, NOT el.click()
await p.waitForTimeout(1000);
await p.evaluate(() => document.querySelectorAll('[role="dialog"],[role="menu"],[data-state="open"]').length);
```

**Radix requires a real pointer event.** Measured on the live lab:

```
trigger before:                  {"tag":"SPAN","exp":"false"}
after programmatic .click():     false     <- does NOT open
after REAL pointer click:        true      <- opens, 130 body nodes, full menu
```

Radix listens for `pointerdown` with pointer-type detail; a synthetic `el.click()`
dispatches a bare MouseEvent and the menu never opens. If you verify with `.click()`
you will report a working component as broken, or worse, ship an "it opens" claim you
never tested.

Pass criteria before handing over the URL:
- [ ] every demo either paints or has a visible, accurate failure card
- [ ] every interactive demo opens under a real pointer click
- [ ] zero unexplained `pageerror`s
- [ ] the numbers on the page are the app's real numbers
- [ ] the counts in the header (`N rendered`, `M failed`) match what you measured
- [ ] checked through the public URL, not localhost
- [ ] nothing under `src/` changed (`git status`)

Put the evidence in the page footer: *"Verified in a headless browser: 16 demos
rendered, 0 failed."* A claim on the page is a promise; make it one you measured.

---

## Known traps, by symptom

| Symptom | Cause | Fix |
|---|---|---|
| Blank frame, parse error on a type annotation | browser-side Babel cannot parse TS | transpile **server-side** with vendored Sucrase |
| `Invalid hook call` / `useState` of null | two React copies loaded | one pinned React; `?external=react,react-dom` on every dep |
| `Failed to resolve module specifier "x"` | importmap built from a manifest | scan real `import` statements across **all** staged files |
| Icon import is `undefined` | lucide renamed/dropped it | pin `lucide-react@0.446.0` |
| `@tanstack/react-table` internals fail | subpath imports unresolved | add `?bundle` |
| Chart renders nothing / wrong API | recharts v3 vs v2-written source | pin `recharts@2.15.4` |
| `PanelGroup is not a function` | react-resizable-panels v3 | pin `2.1.7` |
| Some components break on local imports, others fine | only the `@/` alias was rewritten | rewrite the **relative** form too |
| `Cannot read properties of undefined (.map)` | component requires props, ships none | infer prop names, synthesise rows, label the card |
| Component named `*-chart` draws no chart | it is a wrapper (shadcn `chart.tsx` copy) | read the source; say so on the card |
| Component is a 17-line counter | dead corpus stub (206/5,210 in HALO's bank) | `wc -l` + `grep setCount` before offering it |
| Dropdown "does not open" in tests | Radix ignores synthetic `.click()` | real pointer click; assert `aria-expanded` |
| Demo flagged failed but is fine | trigger-only, few nodes at rest | click before judging |
| Cloudflare error instead of the lab | server bound to `127.0.0.1` | `LAB_HOST=0.0.0.0` |
| Worker will not accept the origin | Workers reject raw IPs | `<ip-with-dashes>.sslip.io:<port>` |
| Cannot get TLS on the box | 80/443 unbindable, ACME needs them | Worker terminates TLS; high port origin |
| Service dies on logout | system unit / Docker assumed | systemd **user** unit, `Restart=always` |
| Missing primitive (`@/components/ui/modal`) | project has `dialog` not `modal` | 6-line alias re-export shim |

---

## Deliver it

1. Commit the lab under `docs/` — gitignore `vendor/sucrase.mjs` (207KB) and note in
   the README where to copy it from.
2. Commit message carries the live URL, the counts, and the findings that contradict
   the brief.
3. Post the URL through the `console` skill (Shaan: **no Claude artifacts** — deploy
   public, per [[no-claude-artifacts-deploy-public]]).
4. Say in one line: what to look at, what you recommend, and what a UI change cannot fix.
