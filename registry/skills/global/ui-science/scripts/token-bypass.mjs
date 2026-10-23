#!/usr/bin/env node
/**
 * token-bypass.mjs — find hardcoded colors that bypass the token system and
 * auto-generate a ban→token migration map by PERCEPTUAL (OKLab) nearest-match.
 *
 * The system-level fix for color sprawl: the token package is canonical and
 * clean; the rot is components hardcoding hex / Tailwind arbitrary [#...] values
 * instead of reading tokens. This scans a source tree, ranks every bypassing
 * color by frequency, and maps each to its nearest defined token so an agent can
 * migrate deterministically.
 *
 * Nearest-token uses OKLab distance [MacAdam 1942 → perceptual uniformity], so
 * "#ff5722 → --siso-red" is a PERCEPTUAL match, not a string match.
 *
 * Usage:  node token-bypass.mjs --tokens <tokens.css> --src <dir> [--json] [--min <n>]
 * Exit:   0 none · 2 bypasses found.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { rgbToOklab, parseColor } from "./color.mjs";

const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const tokensPath = opt("--tokens");
const srcDir = opt("--src");
const jsonOut = argv.includes("--json");
const minN = +(opt("--min", "1"));
if (!tokensPath || !srcDir) { console.error("usage: node token-bypass.mjs --tokens <tokens.css> --src <dir> [--json] [--min <n>]"); process.exit(3); }

// ── build the token color palette (name → hex) ──
const tokensSrc = readFileSync(tokensPath, "utf8");
const tokenColors = [];
{
  const re = /(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\b/g;
  let m; while ((m = re.exec(tokensSrc))) tokenColors.push({ name: m[1], hex: m[2].toLowerCase(), lab: rgbToOklab(parseColor(m[2])) });
}
const tokenHexSet = new Set(tokenColors.map((t) => t.hex));

// ── OKLab distance ──
function labDist(a, b) { return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b); }
function nearestToken(hex) {
  const lab = rgbToOklab(parseColor(hex));
  let best = null, bd = Infinity;
  for (const t of tokenColors) { const d = labDist(lab, t.lab); if (d < bd) { bd = d; best = t; } }
  return { token: best.name, tokenHex: best.hex, distance: +bd.toFixed(3) };
}

// ── scan source ──
function collect(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e); const s = statSync(p);
    if (s.isDirectory()) out.push(...collect(p));
    else if ([".tsx", ".jsx", ".ts", ".css", ".scss"].includes(extname(p))) out.push(p);
  }
  return out;
}
const files = collect(srcDir);
const freq = {};       // hex → count
const locations = {};   // hex → [file:line ...] (first few)
for (const f of files) {
  const text = readFileSync(f, "utf8");
  const re = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
  let m;
  while ((m = re.exec(text))) {
    const hex = m[0].toLowerCase();
    freq[hex] = (freq[hex] || 0) + 1;
    const line = text.slice(0, m.index).split("\n").length;
    (locations[hex] ||= []).push(`${f.replace(srcDir, "")}:${line}`);
  }
}

// ── build the ban→map (only colors NOT already a token) ──
const bypasses = Object.entries(freq)
  .filter(([hex]) => !tokenHexSet.has(hex))
  .filter(([, n]) => n >= minN)
  .map(([hex, count]) => {
    const near = nearestToken(hex);
    return {
      hex, count,
      nearestToken: near.token,
      nearestTokenHex: near.tokenHex,
      perceptualDistance: near.distance,
      // exact = the hardcoded color IS a brand token, just not referenced as one
      verdict: near.distance < 0.02 ? "USE-TOKEN (exact match)" : near.distance < 0.10 ? "MAP-TO-TOKEN (close)" : "FOREIGN (no close token — review)",
      sampleLocations: locations[hex].slice(0, 3),
    };
  })
  .sort((a, b) => b.count - a.count);

const totalBypass = bypasses.reduce((s, b) => s + b.count, 0);
const report = {
  tokens: tokensPath, src: srcDir, filesScanned: files.length,
  definedTokenColors: tokenColors.length,
  bypassColors: bypasses.length,
  totalBypassOccurrences: totalBypass,
  banMap: bypasses,
};

if (jsonOut) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else {
  console.log(`\n=== TOKEN-BYPASS AUDIT ===`);
  console.log(`src: ${srcDir}  (${files.length} files)`);
  console.log(`defined token colors: ${tokenColors.length} | bypassing colors: ${bypasses.length} | total bypass occurrences: ${totalBypass}\n`);
  console.log(`BAN → MAP (hardcoded color → nearest token by OKLab distance):`);
  console.log(`${"hex".padEnd(10)}${"uses".padEnd(6)}${"→ token".padEnd(24)}verdict`);
  for (const b of bypasses.slice(0, 30)) {
    console.log(`${b.hex.padEnd(10)}${String(b.count).padEnd(6)}${("→ " + b.nearestToken).padEnd(24)}${b.verdict}  (d=${b.perceptualDistance})`);
  }
  if (bypasses.length > 30) console.log(`... and ${bypasses.length - 30} more (use --json for the full map)`);
}
process.exit(bypasses.length ? 2 : 0);
