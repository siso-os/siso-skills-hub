#!/usr/bin/env node
/**
 * apply-tokens.mjs — codemod that rewrites hardcoded colors to token references.
 *
 * Consumes TOKEN-BYPASS-MAP.json (from token-bypass.mjs) and rewrites the SAFE
 * bucket: hex values whose nearest token is perceptually identical (OKLab
 * distance < threshold). Rewrites in place, preserving the exact rendered color
 * (var resolves to the same value) while routing it through the token — so the
 * design system regains control.
 *
 * SAFETY (learned: classify-by-reading, don't blind-sweep):
 *   - DEFAULT is dry-run. --apply writes.
 *   - Only rewrites d < --threshold (default 0.012 — visually indistinguishable).
 *   - Only rewrites the TWO mechanically-safe syntaxes:
 *       Tailwind arbitrary:  bg-[#18181b]  →  bg-[var(--siso-chrome)]
 *       inline style hex:    '#18181b'     →  'var(--siso-chrome)'
 *   - NEVER touches FOREIGN or MAP-bucket colors, or #fff/#000 (semantic ambiguity).
 *   - Skips a hex if it maps to a token whose role is ambiguous (white/black).
 *
 * Usage:
 *   node apply-tokens.mjs --map <TOKEN-BYPASS-MAP.json> --src <dir> [--apply] [--threshold 0.012]
 * Exit: 0 nothing to do · 1 changes pending (dry-run) · 2 changes applied.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const mapPath = opt("--map");
const srcDir = opt("--src");
const apply = argv.includes("--apply");
const threshold = +(opt("--threshold", "0.012"));
if (!mapPath || !srcDir) { console.error("usage: node apply-tokens.mjs --map <json> --src <dir> [--apply] [--threshold 0.012]"); process.exit(3); }

const map = JSON.parse(readFileSync(mapPath, "utf8"));

// Build the rewrite table: hex → token, only the safe bucket.
// Exclude pure white/black (semantic ambiguity — value identical but role varies).
const AMBIGUOUS = new Set(["#fff", "#ffffff", "#000", "#000000", "#f9fafb", "#f9f9f9", "#fefbf6", "#f5f5f5", "#e5e5e5"]);
const rewrites = {};
for (const b of map.banMap) {
  if (b.perceptualDistance >= threshold) continue;
  if (AMBIGUOUS.has(b.hex)) continue;
  rewrites[b.hex.toLowerCase()] = b.nearestToken;
}
const rewriteHexes = Object.keys(rewrites);
if (!rewriteHexes.length) { console.log("no colors qualify for safe auto-rewrite at this threshold."); process.exit(0); }

// ── collect source files ──
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

// escape for regex
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let filesChanged = 0, totalRewrites = 0;
const changeLog = [];

for (const file of collect(srcDir)) {
  let text = readFileSync(file, "utf8");
  const before = text;
  let fileRewrites = 0;

  for (const hex of rewriteHexes) {
    const token = rewrites[hex];
    // 1. Tailwind arbitrary value:  [#18181b]  →  [var(--siso-chrome)]
    //    (may carry an opacity suffix like [#18181b]/80 — preserve it)
    const twRe = new RegExp(`\\[${esc(hex)}\\]`, "gi");
    text = text.replace(twRe, () => { fileRewrites++; return `[var(${token})]`; });

    // 2. quoted hex string in style/props:  '#18181b' or "#18181b"  →  'var(--siso-chrome)'
    //    Only when the ENTIRE quoted value is the hex (avoid touching gradients/arrays casually).
    const strRe = new RegExp(`(['"\`])${esc(hex)}\\1`, "gi");
    text = text.replace(strRe, (_m, q) => { fileRewrites++; return `${q}var(${token})${q}`; });
  }

  if (text !== before) {
    filesChanged++; totalRewrites += fileRewrites;
    changeLog.push({ file: file.replace(srcDir, ""), rewrites: fileRewrites });
    if (apply) writeFileSync(file, text);
  }
}

// ── report ──
console.log(`\n=== TOKEN CODEMOD ${apply ? "(APPLIED)" : "(DRY-RUN — no files written)"} ===`);
console.log(`threshold: OKLab d < ${threshold} (visually indistinguishable)`);
console.log(`safe rewrite table (${rewriteHexes.length} colors, excludes white/black/foreign):`);
for (const hex of rewriteHexes.slice(0, 20)) console.log(`  ${hex.padEnd(10)} → ${rewrites[hex]}`);
if (rewriteHexes.length > 20) console.log(`  ... +${rewriteHexes.length - 20} more`);
console.log(`\nfiles ${apply ? "changed" : "would change"}: ${filesChanged} | rewrites: ${totalRewrites}`);
for (const c of changeLog.slice(0, 15)) console.log(`  ${c.rewrites}×  ${c.file}`);
if (changeLog.length > 15) console.log(`  ... +${changeLog.length - 15} more files`);
if (!apply && totalRewrites) console.log(`\nrun again with --apply to write these changes.`);

process.exit(totalRewrites ? (apply ? 2 : 1) : 0);
