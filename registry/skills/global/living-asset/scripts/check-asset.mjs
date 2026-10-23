// Headless check for a living asset. Run with `shot` (estate) or plain node with playwright resolvable.
//   node check-asset.mjs <dir-with-harness-pages> <out-dir> [states,comma,list]
// Writes <out>/<state>.png (2x, one per state) and prints JSON: page errors, and the eye spring trace
// (max overshoot vs target, settle) from one.html. Exit 1 on any page error or a missing state cell.
// If playwright's bundled browser is missing, set HF_CHROME to a chrome-headless-shell binary.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const [,, dir, out, list] = process.argv;
const b = await chromium.launch(process.env.HF_CHROME ? { executablePath: process.env.HF_CHROME } : {});
const errs = [];
const p = await (await b.newContext({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 2 })).newPage();
p.on('pageerror', (e) => errs.push('states: ' + e.message));
await p.goto(pathToFileURL(path.resolve(dir, 'states.html')).href); await p.waitForTimeout(700);
const states = list ? list.split(',') : await p.evaluate(() => [...document.querySelectorAll('[id^=c-]')].map((e) => e.id.slice(2)));
const missing = [];
for (const s of states) {
  const loc = p.locator('#c-' + s);
  if (!(await loc.count())) { missing.push(s); continue; }
  await loc.screenshot({ path: path.join(out, s + '.png') });
}
const q = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
q.on('pageerror', (e) => errs.push('one: ' + e.message));
await q.goto(pathToFileURL(path.resolve(dir, 'one.html')).href); await q.waitForTimeout(900);
// sample per animation frame on a light page: on a page with 100+ animated assets, sampling lies (2 frames/s)
const spring = await q.evaluate(() => new Promise((res) => {
  const f = window.face; if (!f || f.ex == null) return res(null);
  const r = f.el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const fire = (x) => window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: cy }));
  fire(cx - 400);
  setTimeout(() => {
    const xs = []; const t0 = performance.now();
    (function step() { fire(cx + 400); xs.push(f.ex); if (performance.now() - t0 < 1000) requestAnimationFrame(step); else res({ frames: xs.length, target: f.tx, max: +Math.max(...xs).toFixed(2), final: +xs.at(-1).toFixed(2) }); })();
  }, 1200);
}));
console.log(JSON.stringify({ shots: states.length - missing.length, missing, errs, spring }));
await b.close();
process.exit(errs.length || missing.length ? 1 : 0);
