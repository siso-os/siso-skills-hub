#!/usr/bin/env node
/**
 * structure-score.mjs — SCORE THE STRUCTURE (the legibility KPI)
 * ============================================================================
 * ENFORCES: P18 (emit a deterministic, calibrated 0-100 legibility number from
 *           measurable signals, trended across commits). This turns "is the
 *           layout getting better or worse" from a vibe into a KPI — the exact
 *           measurement the architecture answer flagged as the gate to "A".
 *           Live reference: oracle-streaming reads 71/100 (baseline 38, target 90).
 *
 * THE DETERMINISM CONTRACT (non-negotiable — a KPI you can't trust is noise):
 *   - NO Date.now(), NO new Date(), NO Math.random(), NO network ANYWHERE in the
 *     scoring core. Same repo state in -> same score out, on any machine, forever.
 *   - generatedAt is INJECTED (--at=<iso> > STRUCTURE_SCORE_AT env > null), never
 *     read from the clock, so the committed artifact is reproducible.
 *   - scoreFrom() is a PURE function of six raw numbers. collectLiveMeasurements()
 *     is the only impure part (it reads the filesystem) and is kept separate so
 *     the math is unit-testable against fixed inputs.
 *
 * THE CALIBRATION CONTRACT (what stops the score from drifting into fiction):
 *   - RUBRIC_ANCHOR holds the exact raw inputs from ONE hand-graded snapshot, and
 *     `--calibrate` MUST reproduce that snapshot's hand-graded score (here: 38).
 *     If you retune a penalty curve, the anchor test fails until you re-anchor —
 *     so the 0-100 mapping stays honest, not a number that floats to whatever
 *     looks good this week.
 *
 * THE 5 WEIGHTED DIMENSIONS (sum to EXACTLY 100):
 *     files-over-cap     35   oversized source files (the dominant legibility tax)
 *     css-over-cap       15   oversized style files
 *     god-files          15   files past the god-threshold (>1000 lines)
 *     import-cycles      15   strongly-connected components in the import graph
 *     context-coverage   20   % of load-bearing files carrying a <context> block
 *   Final score = 100 - Σ(penalty points). Each curve is MONOTONIC (more debt =>
 *   more penalty) and CLAMPED at its weight (a single catastrophic dimension can
 *   cost at most its weight, never sink the whole score below another's signal).
 *
 * HOW TO ADAPT:
 *   1. Pick YOUR 5 (or N) measurable signals. They must be: deterministic,
 *      monotonic ("more is worse" or "more is better"), and cheap to compute.
 *   2. Choose weights that SUM TO 100. Put the most legibility-predictive signal
 *      highest (oversized files dominate cold-pickup cost, so it gets 35).
 *   3. Hand-grade ONE real snapshot of your repo (a human reads it, assigns a
 *      0-100). Record its raw inputs as RUBRIC_ANCHOR and tune the curve
 *      constants so scoreFrom(RUBRIC_ANCHOR) === that hand-graded number. Lock
 *      it with `--calibrate`.
 *   4. The score is READ-ONLY by default (the ratchet calls it every commit).
 *      `--write` regenerates the committed STRUCTURE-SCORE.json/.html artifacts;
 *      `--json` prints for the ratchet; `--calibrate` prints the anchor score.
 *
 * USAGE:
 *   node structure-score.mjs              # human line: "structure-score: 71/100"
 *   node structure-score.mjs --json       # machine: full JSON (the ratchet reads this)
 *   node structure-score.mjs --write       # regenerate committed JSON + HTML tile
 *   node structure-score.mjs --calibrate   # print anchorScore() — MUST equal BASELINE
 *
 * NOTE: the live-measurement helpers below (walkFiles, lineCount, import-graph)
 * are sketched as thin local functions so this file is self-contained and
 * copy-pasteable. Swap them for your project's real file/graph utilities.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, resolve, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------- public constants (the spec API a test imports) ----------

export const BASELINE = 38   // ADAPT: your hand-graded starting score
export const TARGET = 90     // ADAPT: the score you're driving toward

// The calibration contract: feeding these EXACT inputs to scoreFrom() MUST
// land on BASELINE. ADAPT to your hand-graded snapshot's raw numbers.
export const RUBRIC_ANCHOR = {
  filesOver: 184,
  cssOver: 16,
  godCount: 4,
  cycles: 6,
  contextPercent: 8,
}

// 5 dimensions, weights sum to EXACTLY 100. (Assert this in a test.)
export const WEIGHTS = {
  'files-over-cap': 35,
  'css-over-cap': 15,
  'god-files': 15,
  'import-cycles': 15,
  'context-coverage': 20,
}

// ---------- per-dimension penalty curves (monotonic; clamp at weight) ----------
// Curve constants are tuned so scoreFrom(RUBRIC_ANCHOR) === BASELINE. If you
// change a constant, `--calibrate` will tell you whether you broke the anchor.

function pointsFilesOverCap(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 0
  // 0.149 is tuned so the full RUBRIC_ANCHOR reproduces BASELINE (38) under this
  // 5-dimension model. If you re-anchor, --calibrate will tell you if you broke it.
  return Math.min(raw * 0.149, WEIGHTS['files-over-cap'])
}
function pointsCssOverCap(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return Math.min(raw * 0.55, WEIGHTS['css-over-cap'])
}
function pointsGodFiles(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return Math.min(raw * 2.4, WEIGHTS['god-files'])
}
function pointsImportCycles(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return Math.min(raw * 1.4, WEIGHTS['import-cycles'])
}
function pointsContextCoverage(pct) {
  if (!Number.isFinite(pct)) return WEIGHTS['context-coverage']
  const miss = Math.max(0, 100 - Math.max(0, Math.min(100, pct)))
  return Math.min(miss * 0.085, WEIGHTS['context-coverage'])
}

// ---------- core API (PURE; no clock, no randomness, no IO) ----------

// generatedAt is INJECTABLE so the core stays deterministic/testable.
// Precedence: --at=<iso> > STRUCTURE_SCORE_AT env > null. NEVER Date.now().
export function resolveGeneratedAt(argv = process.argv, env = process.env) {
  const arg = argv.find((a) => a.startsWith('--at='))
  if (arg) return arg.slice('--at='.length) || null
  if (env.STRUCTURE_SCORE_AT) return env.STRUCTURE_SCORE_AT
  return null
}

export function scoreFrom({ filesOver, cssOver, godCount, cycles, contextPercent } = {}) {
  const dims = [
    { name: 'files-over-cap', raw: filesOver | 0, weight: WEIGHTS['files-over-cap'], points: 0,
      evidence: `${filesOver | 0} files over the line cap` },
    { name: 'css-over-cap', raw: cssOver | 0, weight: WEIGHTS['css-over-cap'], points: 0,
      evidence: `${cssOver | 0} style files over the css cap` },
    { name: 'god-files', raw: godCount | 0, weight: WEIGHTS['god-files'], points: 0,
      evidence: `${godCount | 0} god files (>1000 lines)` },
    { name: 'import-cycles', raw: cycles | 0, weight: WEIGHTS['import-cycles'], points: 0,
      evidence: `${cycles | 0} import cycles` },
    { name: 'context-coverage', raw: contextPercent | 0, weight: WEIGHTS['context-coverage'], points: 0,
      evidence: `${contextPercent | 0}% of load-bearing files carry a <context> block` },
  ]

  const pts = [
    pointsFilesOverCap(filesOver),
    pointsCssOverCap(cssOver),
    pointsGodFiles(godCount),
    pointsImportCycles(cycles),
    pointsContextCoverage(contextPercent),
  ]
  for (let i = 0; i < dims.length; i++) dims[i].points = Math.round(pts[i] * 100) / 100

  const totalPenalty = pts.reduce((s, p) => s + p, 0)
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)))
  return { score, dimensions: dims }
}

export function anchorScore() {
  return scoreFrom(RUBRIC_ANCHOR).score
}

// ---------- live measurement (CLI only — the impure half) ----------
// Sketched, self-contained walkers. ADAPT roots/caps; or swap for your repo's
// real file + import-graph utilities. Kept OUT of the pure core on purpose.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_ROOTS = ['src']        // ADAPT to your domain roots
const STYLE_ROOT = 'src'            // ADAPT
const LOAD_BEARING_ROOTS = ['src']  // where <context> blocks are expected
const LINE_CAP = 250
const CSS_CAP = 300
const GOD_THRESHOLD = 1000
const OUT_JSON = join(ROOT, 'docs', 'STRUCTURE-SCORE.json')

function* walk(dir) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (/(^|\/)(node_modules|dist|build|out|release|_generated|_archive)$/.test(p)) continue
      yield* walk(p)
    } else {
      yield p
    }
  }
}
const lineCount = (p) => { try { return readFileSync(p, 'utf8').split('\n').length } catch { return 0 } }
const isSrc = (p) => /\.[cm]?[jt]sx?$/.test(p) && !/\.(test|spec)\./.test(p)
const isCss = (p) => extname(p) === '.css'

function collectLiveMeasurements() {
  let filesOver = 0, godCount = 0, cssOver = 0
  let loadBearing = 0, covered = 0
  for (const root of SOURCE_ROOTS) {
    for (const p of walk(join(ROOT, root))) {
      const rel = relative(ROOT, p)
      if (isCss(p)) { if (lineCount(p) > CSS_CAP) cssOver++; continue }
      if (!isSrc(p)) continue
      const n = lineCount(p)
      if (n > LINE_CAP) filesOver++
      if (n > GOD_THRESHOLD) godCount++
      if (LOAD_BEARING_ROOTS.some((r) => rel.startsWith(r))) {
        loadBearing++
        try { if (readFileSync(p, 'utf8').includes('<context')) covered++ } catch { /* skip */ }
      }
    }
  }
  const contextPercent = loadBearing ? Math.round((covered / loadBearing) * 100) : 100
  // cycles: plug in your real import-graph SCC count. 0 here keeps the template
  // runnable; the canonical implementation builds the graph and counts SCCs>1.
  const cycles = countImportCycles()
  return { filesOver, cssOver, godCount, cycles, contextPercent }
}

// ADAPT: replace with a real import-graph cycle count (e.g. parse the
// dependency-cruiser JSON, or build your own graph + Tarjan SCC). Returns 0
// when no graph tooling is wired — absent tooling must NOT manufacture a penalty.
function countImportCycles() {
  return 0
}

// ---------- CLI ----------

function runCli() {
  const generatedAt = resolveGeneratedAt(process.argv, process.env) // NO new Date() here
  const measured = collectLiveMeasurements()
  const { score, dimensions } = scoreFrom(measured)
  const result = { score, baseline: BASELINE, target: TARGET, generatedAt, dimensions }

  // READ-ONLY by default — measuring must never dirty the tree. --write to persist.
  if (process.argv.includes('--write')) {
    mkdirSync(dirname(OUT_JSON), { recursive: true })
    writeFileSync(OUT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  }
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else {
    console.log(`structure-score: ${result.score}/100 (baseline ${BASELINE}, target ${TARGET})`)
  }
  process.exit(0)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--calibrate')) {
    const got = anchorScore()
    // The calibration contract: anchor MUST reproduce BASELINE.
    if (got !== BASELINE) {
      console.error(`structure-score CALIBRATION BROKEN: anchorScore()=${got} but BASELINE=${BASELINE}. ` +
        'Re-tune the penalty curves or re-anchor the rubric. The 0-100 mapping is not honest until these match.')
      process.exit(1)
    }
    console.log(got)
  } else {
    runCli()
  }
}
