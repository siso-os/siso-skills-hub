#!/usr/bin/env node
/**
 * audit-system.mjs — SYSTEM-LEVEL design-system auditor.
 *
 * Not a component nitpicker. Ingests (a) a token source of truth (tokens.css)
 * and (b) a compiled CSS bundle (the real shipped truth) and reports the health
 * of the whole system, as actionable intel downstream agents can consume:
 *
 *   1. TOKEN SPRAWL   — unique colors/spacings in the bundle vs. defined tokens.
 *                       The "is the token LAW enforced?" metric.
 *   2. FOREIGN PALETTE — the most-frequent hex values that are NOT brand tokens
 *                       (copy-pasted shadcn/iOS/Lovable colors leaking in).
 *   3. PALETTE UNIFORMITY — is color defined perceptually (oklch) or ad-hoc hex?
 *   4. SPACING SCALE  — do bundle spacings snap to the token scale or drift?
 *   5. ACCENT CONTRAST MATRIX — every semantic accent vs every surface (WCAG).
 *   6. TYPE / FONT    — the type ramp + font tells.
 *
 * Usage:  node audit-system.mjs --tokens <tokens.css> --bundle <bundle.css> [--json|--html <out>]
 * Exit:   0 healthy · 1 drift warnings · 2 system-level violations.
 */

import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseColor, contrastRatio, rampUniformity, perceptualLightness } from "./color.mjs";

// ── args ──
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const tokensPath = opt("--tokens");
const bundlePath = opt("--bundle");
const jsonOut = argv.includes("--json");
const htmlOut = opt("--html");
if (!tokensPath || !bundlePath) {
  console.error("usage: node audit-system.mjs --tokens <tokens.css> --bundle <bundle.css> [--json|--html <out>]");
  process.exit(3);
}
const tokensSrc = readFileSync(tokensPath, "utf8");
const bundleSrc = readFileSync(bundlePath, "utf8");

// ── extract defined tokens (name → value) ──
function extractTokens(css) {
  const map = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(css))) map[m[1]] = m[2].trim();
  return map;
}
const tokens = extractTokens(tokensSrc);

// normalize a hex to lowercase #rrggbb (expand #rgb)
function normHex(h) {
  let v = h.replace("#", "").toLowerCase();
  if (v.length === 3) v = v.split("").map((c) => c + c).join("");
  return "#" + v;
}

// token colors as a normalized set (hex + rgb-triple tokens)
const tokenHexes = new Set();
for (const val of Object.values(tokens)) {
  const hx = val.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
  hx.forEach((h) => tokenHexes.add(normHex(h)));
}

// ── 1 + 2. bundle color inventory ──
const bundleHexList = (bundleSrc.match(/#[0-9a-fA-F]{6}\b/g) || []).map(normHex);
const hexFreq = {};
for (const h of bundleHexList) hexFreq[h] = (hexFreq[h] || 0) + 1;
const uniqueBundleHex = Object.keys(hexFreq);
const oklchCount = (bundleSrc.match(/oklch\(/g) || []).length;
const rgbaCount = new Set(bundleSrc.match(/rgba?\([^)]*\)/g) || []).size;

// foreign = frequent hexes not in token set (and not pure black/white)
const foreign = uniqueBundleHex
  .filter((h) => !tokenHexes.has(h) && h !== "#000000" && h !== "#ffffff")
  .map((h) => ({ hex: h, count: hexFreq[h] }))
  .sort((a, b) => b.count - a.count);

// ── 4. spacing scale drift ──
const tokenSpacePx = new Set();
for (const [k, v] of Object.entries(tokens)) {
  if (/space|control-h|radius/.test(k)) {
    const px = /(\d+)px/.exec(v);
    if (px) tokenSpacePx.add(+px[1]);
  }
}
const bundleRems = [...new Set(bundleSrc.match(/[0-9.]+rem/g) || [])]
  .map((r) => Math.round(parseFloat(r) * 16 * 100) / 100);
const onScale = bundleRems.filter((px) => tokenSpacePx.has(px) || px % 4 === 0);
const offScale = bundleRems.filter((px) => !(tokenSpacePx.has(px) || px % 4 === 0)).sort((a, b) => a - b);

// ── 5. accent × surface contrast matrix ──
const accents = Object.entries(tokens).filter(([k, v]) => (/^--accent-/.test(k) || k === "--siso-orange" || k === "--siso-text" || k === "--siso-text-muted") && /#[0-9a-fA-F]{3,6}/.test(v));
const surfaces = Object.entries(tokens).filter(([k, v]) => /^--siso-(bg|canvas|chrome)/.test(k) && /#[0-9a-fA-F]{3,6}/.test(v));
const matrix = [];
for (const [an, av] of accents) {
  const ac = parseColor(av.match(/#[0-9a-fA-F]{3,6}/)?.[0]);
  if (!ac) continue;
  for (const [sn, sv] of surfaces) {
    const sc = parseColor(sv.match(/#[0-9a-fA-F]{3,6}/)?.[0]);
    if (!sc) continue;
    const ratio = contrastRatio(ac, sc);
    matrix.push({ accent: an, surface: sn, ratio: +ratio.toFixed(2), aa: ratio >= 4.5, aaLarge: ratio >= 3 });
  }
}
const failingPairs = matrix.filter((m) => !m.aaLarge); // below even large-text threshold

// ── 6. type ramp + font ──
const fontStacks = Object.entries(tokens).filter(([k]) => /font/.test(k)).map(([k, v]) => ({ token: k, value: v }));
const usesInter = /inter/i.test(tokensSrc);
const typeSizes = [...new Set((bundleSrc.match(/font-size:\s*([0-9.]+rem)/g) || []).map((s) => parseFloat(s.match(/[0-9.]+/)[0]) * 16))].sort((a, b) => a - b);

// ── verdicts ──
const sprawlRatio = uniqueBundleHex.length / Math.max(1, tokenHexes.size);
const findings = [];
if (sprawlRatio > 3) findings.push({ sev: "error", area: "token-sprawl", msg: `${uniqueBundleHex.length} unique hex colors in bundle vs ${tokenHexes.size} defined token colors (${sprawlRatio.toFixed(0)}× sprawl). The token LAW ("no app hardcodes a color") is not enforced.` });
if (oklchCount < 10 && uniqueBundleHex.length > 50) findings.push({ sev: "warn", area: "palette-uniformity", msg: `only ${oklchCount} oklch() vs ${uniqueBundleHex.length} hex — palette is defined in perceptually non-uniform space [MacAdam 1942]. Ramps built by even hex/HSL steps will look uneven.` });
if (offScale.length > tokenSpacePx.size) findings.push({ sev: "warn", area: "spacing-drift", msg: `${offScale.length} off-scale spacing values (not on the ${[...tokenSpacePx].sort((a,b)=>a-b).join("/")}px token scale or a 4px grid). Sample off-scale: ${offScale.slice(0, 8).join(", ")}px.` });
if (failingPairs.length) findings.push({ sev: "error", area: "accent-contrast", msg: `${failingPairs.length} accent×surface pairs below 3:1 (fail even large-text AA): ${failingPairs.slice(0,4).map(p=>`${p.accent} on ${p.surface} ${p.ratio}:1`).join("; ")}` });
if (usesInter) findings.push({ sev: "suggest", area: "font-tell", msg: `token --font-sans leads with 'Inter' — the #1 AI-generated-UI font tell. Deliberate choice or default? [impeccable]` });

const report = {
  tokens: tokensPath, bundle: bundlePath,
  system: {
    definedTokenColors: tokenHexes.size,
    definedSpacingSteps: [...tokenSpacePx].sort((a, b) => a - b),
    fontStacks,
  },
  bundle: {
    uniqueHex: uniqueBundleHex.length,
    oklchCount, uniqueRgba: rgbaCount,
    uniqueSpacingValues: bundleRems.length,
    typeSizesPx: typeSizes,
  },
  sprawl: { colorRatio: +sprawlRatio.toFixed(1), offScaleSpacings: offScale },
  foreignPalette: foreign.slice(0, 25),
  accentContrastMatrix: matrix,
  failingContrastPairs: failingPairs,
  findings,
};

// ── output ──
const exit = findings.some((f) => f.sev === "error") ? 2 : findings.some((f) => f.sev === "warn") ? 1 : 0;

if (jsonOut) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else if (htmlOut) {
  writeFileSync(htmlOut, renderHtml(report));
  console.log(`wrote ${htmlOut}`);
} else {
  console.log(`\n=== DESIGN-SYSTEM AUDIT ===`);
  console.log(`tokens: ${tokensPath}`);
  console.log(`bundle: ${bundlePath}\n`);
  console.log(`defined token colors: ${tokenHexes.size} | bundle unique hex: ${uniqueBundleHex.length} | oklch: ${oklchCount} | rgba: ${rgbaCount}`);
  console.log(`spacing: ${[...tokenSpacePx].sort((a,b)=>a-b).join("/")}px defined | ${bundleRems.length} distinct in bundle (${offScale.length} off-scale)\n`);
  for (const f of findings) console.log(`[${f.sev.toUpperCase()}] ${f.area}: ${f.msg}\n`);
  console.log(`TOP FOREIGN COLORS (not brand tokens, most frequent):`);
  for (const f of foreign.slice(0, 12)) console.log(`  ${f.hex}  ×${f.count}`);
}
import { writeFileSync } from "node:fs";
function renderHtml(r) {
  const row = (f) => `<tr class="${f.aa?'ok':f.aaLarge?'warn':'err'}"><td>${f.accent}</td><td>${f.surface}</td><td>${f.ratio}:1</td><td>${f.aa?'AA':f.aaLarge?'AA-large':'FAIL'}</td></tr>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Design-System Audit</title>
<meta name="generator" content="ui-science/audit-system"><meta name="generated" content="${r.tokens}">
<style>body{font:13px/1.5 ui-monospace,monospace;background:#141514;color:#e0e0e0;max-width:70rem;margin:2rem auto;padding:0 1rem}
h1,h2{color:#ffa726}table{border-collapse:collapse;width:100%;margin:.5rem 0}td,th{border:1px solid #333;padding:3px 8px;text-align:left}
.err{color:#fb7185}.warn{color:#fbbf24}.ok{color:#34d399}.chip{display:inline-block;width:12px;height:12px;vertical-align:middle;border:1px solid #555;margin-right:4px}
.finding{border-left:3px solid #666;padding:.4rem .8rem;margin:.5rem 0;background:#1a1a1a}.finding.error{border-color:#fb7185}.finding.warn{border-color:#fbbf24}</style></head><body>
<h1>Design-System Audit</h1>
<dl><dt>Defined token colors</dt><dd>${r.system.definedTokenColors}</dd>
<dt>Bundle unique hex</dt><dd>${r.bundle.uniqueHex} (<b>${r.sprawl.colorRatio}× sprawl</b>)</dd>
<dt>oklch() usages</dt><dd>${r.bundle.oklchCount}</dd><dt>unique rgba()</dt><dd>${r.bundle.uniqueRgba}</dd>
<dt>Spacing</dt><dd>${r.system.definedSpacingSteps.join("/")}px defined · ${r.bundle.uniqueSpacingValues} distinct in bundle · ${r.sprawl.offScaleSpacings.length} off-scale</dd></dl>
<h2>Findings</h2>${r.findings.map(f=>`<div class="finding ${f.sev}"><b>${f.area}</b> — ${f.msg}</div>`).join("")}
<h2>Foreign palette (top polluters — not brand tokens)</h2><table><tr><th>hex</th><th>uses</th></tr>${r.foreignPalette.map(f=>`<tr><td><span class="chip" style="background:${f.hex}"></span>${f.hex}</td><td>${f.count}</td></tr>`).join("")}</table>
<h2>Accent × Surface contrast [WCAG 2.1]</h2><table><tr><th>accent</th><th>surface</th><th>ratio</th><th>verdict</th></tr>${r.accentContrastMatrix.map(row).join("")}</table>
</body></html>`;
}
process.exit(exit);
