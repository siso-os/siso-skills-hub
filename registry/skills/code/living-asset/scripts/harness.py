#!/usr/bin/env python3
"""Build the two pages a living-asset check needs, from the asset's engine files.

  harness.py --js engine.js --css engine.css --cls HaloFace --states standby,thinking,... \
             --opts '{"look":"machined"}' --out DIR

states.html: one 200 px asset per state, each in a cell #c-<state> (for before/after shots).
one.html:    one 250 px asset as window.face, pointer tracking on (for the spring trace).
The engine must take (host, {size, state, stay, track, ...opts}); stay keeps one-shot states held.
"""
import argparse, json, pathlib

ap = argparse.ArgumentParser()
ap.add_argument('--js', required=True); ap.add_argument('--css', required=True)
ap.add_argument('--cls', required=True); ap.add_argument('--states', required=True)
ap.add_argument('--opts', default='{}'); ap.add_argument('--out', required=True)
a = ap.parse_args()
js, css = pathlib.Path(a.js).read_text(), pathlib.Path(a.css).read_text()
states, opts, out = a.states.split(','), json.loads(a.opts), pathlib.Path(a.out)
out.mkdir(parents=True, exist_ok=True)
head = '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#09080d}%s</style></head><body>'
cells = ('.c{width:280px;height:300px;display:inline-flex;align-items:center;justify-content:center;padding-top:20px}', '')
(out / 'states.html').write_text(head % (cells[0] + css) + f"""
<script>{js}</script><script>
for (const s of {json.dumps(states)}) {{
  const c = document.createElement('div'); c.className = 'c'; c.id = 'c-' + s;
  const h = document.createElement('div'); c.appendChild(h); document.body.appendChild(c);
  new {a.cls}(h, Object.assign({{ size: 200, state: s, stay: true }}, {json.dumps(opts)}));
}}
</script></body></html>""")
(out / 'one.html').write_text(head % ('body{display:flex;align-items:center;justify-content:center;height:100vh}' + css) + f"""
<div id="f"></div><script>{js}</script><script>
window.face = new {a.cls}(document.getElementById('f'), Object.assign({{ size: 250, track: true, interactive: true }}, {json.dumps(opts)}));
</script></body></html>""")
print(f'wrote {out}/states.html ({len(states)} states) and {out}/one.html')
