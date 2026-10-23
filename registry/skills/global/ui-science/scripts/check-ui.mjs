#!/usr/bin/env node
/**
 * check-ui.mjs — the ui-science deterministic checker.
 *
 * Reads rules.json, scans CSS/HTML/source text, runs the DETERMINISTIC checks
 * (color, motor, typography, folklore, AI-tells) and emits findings as JSON.
 * LLM-kind rules are not executed here — they are listed under `llmRules` in the
 * output so an agent can evaluate them. Every finding carries its receipt.
 *
 * Usage:
 *   node check-ui.mjs <file-or-dir> [--json]
 * Exit codes:  0 = clean   1 = warn-level findings only   2 = error-level findings
 *
 * One result, many consumers (agent / CI / human): the JSON is the contract.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseColor,
  contrastRatio,
  rampUniformity,
} from "./color.mjs";
import { extractClassLists, readClassList } from "./tailwind.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES = JSON.parse(readFileSync(join(__dirname, "rules.json"), "utf8")).rules;
const rule = (id) => RULES.find((r) => r.id === id);
const RAMP_THRESHOLD = 0.45; // matches color.oklch-ramp-uniformity predicate
const SCAN_EXT = new Set([".css", ".scss", ".html", ".htm", ".tsx", ".jsx", ".vue", ".svelte", ".md", ".txt"]);

// ── collect files ─────────────────────────────────────────────────────────────
function collect(path) {
  const st = statSync(path);
  if (st.isFile()) return [path];
  const out = [];
  for (const e of readdirSync(path)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(path, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...collect(p));
    else if (SCAN_EXT.has(extname(p))) out.push(p);
  }
  return out;
}

// ── finding factory ───────────────────────────────────────────────────────────
function finding(r, file, line, detail) {
  return {
    id: r.id,
    tier: r.tier,
    domain: r.domain,
    severity: r.severity,
    folklore: !!r.folklore,
    file,
    line,
    detail,
    claim: r.claim,
    receipt: r.receipt,
    fix: r.fix,
  };
}

// find 1-based line number of a substring index
function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// ── deterministic checks ──────────────────────────────────────────────────────
function checkFile(file) {
  const text = readFileSync(file, "utf8");
  const findings = [];
  const ext = extname(file);
  const isStyle = [".css", ".scss", ".html", ".htm", ".tsx", ".jsx", ".vue", ".svelte"].includes(ext);

  // ---- color.oklch-ramp-uniformity ----
  // Heuristic ramp detection: a CSS custom-property group like --x-50..--x-900,
  // OR >=4 color values sharing a property prefix. We scan var groups.
  if (isStyle) {
    const rRamp = rule("color.oklch-ramp-uniformity");
    // group `--name-<step>: <color>;` by name prefix
    const declRe = /--([a-z0-9]+(?:-[a-z0-9]+)*?)-(\d{2,3})\s*:\s*([^;]+);/gi;
    const groups = {};
    let m;
    while ((m = declRe.exec(text))) {
      const [, name, step, val] = m;
      const c = parseColor(val.trim());
      if (!c) continue;
      (groups[name] ||= []).push({ step: +step, val: val.trim(), index: m.index });
    }
    for (const [name, steps] of Object.entries(groups)) {
      if (steps.length < 4) continue;
      steps.sort((a, b) => a.step - b.step);
      const u = rampUniformity(steps.map((s) => s.val));
      if (u && u.unevenness > RAMP_THRESHOLD) {
        findings.push(
          finding(
            rRamp,
            file,
            lineOf(text, steps[0].index),
            `ramp --${name}-* has perceptual-lightness unevenness ${u.unevenness.toFixed(2)} (> ${RAMP_THRESHOLD}); OKLab-L deltas range ${u.minDelta.toFixed(3)}..${u.maxDelta.toFixed(3)}. Steps even in HSL/RGB are perceptually uneven.`
          )
        );
      }
    }
  }

  // ---- color.wcag-contrast-aa ----
  // Detect the classic failure: a `color:` and `background`/`background-color:`
  // declared in the same rule block. We split on `}` to get blocks.
  if (isStyle) {
    const rC = rule("color.wcag-contrast-aa");
    const blocks = text.split("}");
    let cursor = 0;
    for (const block of blocks) {
      const fg = /(?:^|[^-])color\s*:\s*([^;]+);/i.exec(block);
      const bg = /background(?:-color)?\s*:\s*([^;]+);/i.exec(block);
      if (fg && bg) {
        const fgc = parseColor(fg[1].trim());
        const bgc = parseColor(bg[1].trim());
        if (fgc && bgc) {
          const ratio = contrastRatio(fgc, bgc);
          if (ratio < 4.5) {
            findings.push(
              finding(
                rC,
                file,
                lineOf(text, cursor + block.indexOf(fg[0])),
                `foreground ${fg[1].trim()} on background ${bg[1].trim()} = ${ratio.toFixed(2)}:1 (< 4.5 AA).`
              )
            );
          }
        }
      }
      cursor += block.length + 1;
    }
  }

  // ---- motor.fitts-target-size ----
  // Look for buttons/links with an explicit small height or width in px.
  if (isStyle) {
    const rF = rule("motor.fitts-target-size");
    // crude: any `height: <n>px` or `width: <n>px` under a selector mentioning button/btn/link/nav-item
    const blocks = text.split("}");
    let cursor = 0;
    for (const block of blocks) {
      const selectorMatch = /([^{]*)\{/.exec(block);
      const sel = selectorMatch ? selectorMatch[1].toLowerCase() : "";
      const interactive = /button|\.btn|\ba\b|link|nav-item|tab|chip|icon-btn|\[role="button"\]/.test(sel);
      if (!interactive) { cursor += block.length + 1; continue; }
      const hm = /height\s*:\s*(\d+)px/i.exec(block);
      const wm = /width\s*:\s*(\d+)px/i.exec(block);
      const h = hm ? +hm[1] : null;
      const w = wm ? +wm[1] : null;
      const dim = [h, w].filter((x) => x !== null);
      if (dim.length && Math.min(...dim) < 44) {
        findings.push(
          finding(
            rF,
            file,
            lineOf(text, cursor + (selectorMatch ? selectorMatch.index : 0)),
            `interactive target "${selectorMatch[1].trim()}" has min dimension ${Math.min(...dim)}px (< 44px). Fitts's Law: smaller W raises acquisition time & error.`
          )
        );
      }
      cursor += block.length + 1;
    }
  }

  // ---- tell.side-stripe-border ----
  {
    const rS = rule("tell.side-stripe-border");
    const re = /border-(?:left|right)\s*:\s*(\d+)px/gi;
    let mm;
    while ((mm = re.exec(text))) {
      if (+mm[1] > 1) {
        findings.push(finding(rS, file, lineOf(text, mm.index), `${mm[0]} — thick side border (AI-design tell).`));
      }
    }
  }

  // ---- tell.gradient-text ----
  {
    const rG = rule("tell.gradient-text");
    const hasClip = /(?:-webkit-)?background-clip\s*:\s*text/i.test(text);
    const hasGrad = /background(?:-image)?\s*:[^;]*gradient\(/i.test(text);
    if (hasClip && hasGrad) {
      const idx = text.search(/(?:-webkit-)?background-clip\s*:\s*text/i);
      findings.push(finding(rG, file, lineOf(text, idx), `background-clip:text + gradient background (gradient text tell).`));
    }
  }

  // ---- folklore string flags (magical-seven, f-pattern, data-ink) ----
  const folkloreChecks = [
    { id: "folklore.magical-seven", re: /magical number seven|7\s*(?:\+\/-|±|plus or minus)\s*2|max(?:imum)?\s+7\s+(?:items|elements|widgets)|rule of seven/i },
    { id: "folklore.design-for-f-pattern", re: /design(?:ing)?\s+(?:for|around)\s+the\s+f-pattern|follow\s+the\s+f-pattern|f-pattern\s+layout/i },
    { id: "folklore.maximize-data-ink", re: /maximize\s+(?:the\s+)?data-ink|remove\s+all\s+chart\s*junk|erase\s+non-data\s+ink/i },
  ];
  for (const fc of folkloreChecks) {
    const r = rule(fc.id);
    const mm = fc.re.exec(text);
    if (mm) findings.push(finding(r, file, lineOf(text, mm.index), `text invokes debunked/overstated claim: "${mm[0]}"`));
  }

  // ---- Tailwind pass: className-based contrast + Fitts (TSX/JSX/HTML) ----
  // v1 was blind to utility classes; this makes the checker see the product's
  // actual styling paradigm. text-<c> + bg-<c> in the SAME element are a real
  // contrast pair; h-/w- spacing on an interactive element is a Fitts signal.
  if ([".tsx", ".jsx", ".html", ".htm", ".vue", ".svelte"].includes(ext)) {
    const rC = rule("color.wcag-contrast-aa");
    const rF = rule("motor.fitts-target-size");
    for (const { line, classes, raw } of extractClassLists(text)) {
      const { textHex, bgHex, minPx } = readClassList(classes);
      if (textHex && bgHex) {
        const ratio = contrastRatio(parseColor(textHex), parseColor(bgHex));
        if (ratio < 4.5) {
          findings.push(finding(rC, file, line, `Tailwind text/bg pair ${textHex} on ${bgHex} = ${ratio.toFixed(2)}:1 (< 4.5 AA). classes: ${classes.filter((c) => /^(text|bg)-/.test(c)).join(" ")}`));
        }
      }
      // Fitts: only when the element looks interactive (has a click-ish class or button-ish name nearby)
      const interactive = /\b(button|btn|cursor-pointer|onClick|role="button")\b/i.test(raw) || classes.some((c) => c === "cursor-pointer");
      if (interactive && minPx !== null && minPx < 44) {
        findings.push(finding(rF, file, line, `interactive Tailwind element has min dimension ${minPx}px (< 44px). Fitts's Law: smaller target raises acquisition time & error. classes: ${classes.join(" ")}`));
      }
    }
  }

  // ---- font tell: Inter / system default as brand font (impeccable's #1 tell) ----
  {
    const rInter = rule("tell.overused-font");
    if (rInter) {
      const fm = /font-(?:family)?[^;{]*['"\s:]?(Inter)\b/i.exec(text) || /["'`]Inter["'`,)]/.exec(text) || /font-inter\b/i.exec(text);
      if (fm) findings.push(finding(rInter, file, lineOf(text, fm.index), `uses "Inter" — the single most recognizable AI-generated-UI font tell. Choose deliberately, don't default.`));
    }
  }

  return findings;
}

// ── main ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
  console.error("usage: node check-ui.mjs <file-or-dir> [--json]");
  process.exit(3);
}

let files;
try {
  files = collect(target);
} catch (e) {
  console.error(`cannot read ${target}: ${e.message}`);
  process.exit(3);
}

let allFindings = [];
for (const f of files) {
  try {
    allFindings.push(...checkFile(f));
  } catch (e) {
    // a parse failure on one file must not sink the run
    console.error(`warn: skipped ${f}: ${e.message}`);
  }
}

const errors = allFindings.filter((f) => f.severity === "error");
const warns = allFindings.filter((f) => f.severity === "warn");
const llmRules = RULES.filter((r) => r.check.kind === "llm").map((r) => ({
  id: r.id, tier: r.tier, domain: r.domain, claim: r.claim, receipt: r.receipt,
  evaluate: r.check.predicate, fix: r.fix,
}));

const report = {
  target,
  filesScanned: files.length,
  summary: { total: allFindings.length, error: errors.length, warn: warns.length, suggest: allFindings.length - errors.length - warns.length },
  findings: allFindings,
  llmRules: { note: "Rules requiring judgment — an agent should evaluate these against the UI; the checker cannot.", rules: llmRules },
};

if (jsonOut) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else {
  console.log(`ui-science: scanned ${files.length} file(s) → ${allFindings.length} finding(s) [${errors.length} error, ${warns.length} warn]`);
  for (const f of allFindings) {
    const tag = f.folklore ? "FOLKLORE" : f.severity.toUpperCase();
    console.log(`\n[${tag}] ${f.id}  (${f.file}:${f.line})`);
    console.log(`  ${f.detail}`);
    console.log(`  receipt: ${f.receipt.source} (${f.receipt.year}, ${f.receipt.venue})`);
    console.log(`  fix: ${f.fix}`);
  }
  if (llmRules.length) console.log(`\n${llmRules.length} judgment rule(s) an agent should evaluate — run with --json to get them.`);
}

process.exit(errors.length ? 2 : warns.length ? 1 : 0);
