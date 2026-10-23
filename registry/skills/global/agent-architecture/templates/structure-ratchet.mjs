#!/usr/bin/env node
/**
 * structure-ratchet.mjs — THE ANTI-DEGRADATION RATCHET (the "never again" law)
 * ============================================================================
 * ENFORCES: P17 (freeze each metric at TODAY's number; new regressions reject,
 *           legacy debt passes; the bar only tightens — gate the Δ, not the
 *           absolute). This is the single breakthrough that makes "keep it
 *           clean" enforceable on a messy repo on day one.
 *
 * WHY THIS EXISTS (the failure it kills): you cannot hard-fail a rule like
 * "files < 250 lines / no import cycles / >=90% context-coverage" on a legacy
 * tree — every commit gets rejected, the fleet switches to `git commit
 * --no-verify`, and that one escape hatch bypasses ALL gates. A warn-only gate
 * is the opposite failure: it reports forever and blocks nothing, so the metric
 * bleeds (real incident: dup CSS selectors went 0 -> 800 over ~724 commits in a
 * day with nothing rejecting them).
 *
 * THE FIX: freeze every structural metric at its CURRENT value as a monotonic
 * baseline. Pre-existing debt does NOT block (the repo is never stuck red), but
 * any NEW regression — one more oversized file, one more cycle, a lower score —
 * REJECTS the commit. The numbers can only improve. After a genuine cleanup
 * wave, run `--write-baseline` to ratchet the bar DOWN (tighter) and lock the
 * recovery in. Ceilings only fall; floors only rise.
 *
 * DETERMINISM CONTRACT: this gate NEVER re-implements a measurement. It invokes
 * the CANONICAL scripts (structure-score.mjs --json, no-duplicate-css.mjs,
 * css-imports-resolve.mjs) as subprocesses and reads their output, so the
 * ratchet can never drift from what those gates actually report. To add a
 * metric: add a measurement script, read it here, add a ceiling/floor.
 *
 * HOW TO ADAPT:
 *   1. Keep the measure() shape but point it at YOUR measurement scripts. The
 *      only hard requirement: each metric is a single number, comparable across
 *      commits, produced deterministically (no clock, no randomness, no network).
 *   2. ceilings = "max allowed" (lower is better: file counts, cycles, dups).
 *      floors   = "min allowed" (higher is better: score, coverage %).
 *   3. First run `node structure-ratchet.mjs --write-baseline` to freeze TODAY.
 *      Commit fitness/baseline/structure-ratchet.json. From then on the gate is live.
 *   4. Wire `node structure-ratchet.mjs` into .githooks/pre-commit (exit 1 = block).
 *
 * USAGE:
 *   node structure-ratchet.mjs                 # gate: compare current vs baseline
 *   node structure-ratchet.mjs --write-baseline  # freeze current as the new bar
 */
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = join(ROOT, 'fitness', 'baseline', 'structure-ratchet.json')
const WRITE = process.argv.includes('--write-baseline')

function run(script, args = []) {
  return spawnSync(process.execPath, [join(ROOT, script), ...args], { cwd: ROOT, encoding: 'utf8' })
}

// --- measure (REUSE canonical gates; never re-implement a metric here) ---
function measure() {
  // Read the score LIVE from --json stdout. Read-only: must never dirty the
  // committed STRUCTURE-SCORE.json (the ratchet runs on every commit; a
  // self-dirtying measurement breaks git-clean checks).
  const scoreRes = run('fitness/structure-score.mjs', ['--json'])
  const score = JSON.parse(`${scoreRes.stdout || ''}`)
  const dim = (name) => score.dimensions.find((d) => d.name === name)?.raw ?? 0

  // dup selectors: parse the FAIL header "N selector(s)"; OK => 0.
  // ADAPT or DELETE if you have no CSS dimension.
  const dupRes = run('fitness/no-duplicate-css.mjs')
  const dupOut = `${dupRes.stdout || ''}${dupRes.stderr || ''}`
  const dupMatch = dupOut.match(/(\d+)\s+selector\(s\)/)
  const dupSelectors = dupMatch ? Number(dupMatch[1]) : 0

  // broken imports: nonzero exit => count from output; OK => 0.
  const impRes = run('fitness/css-imports-resolve.mjs')
  const impOut = `${impRes.stdout || ''}${impRes.stderr || ''}`
  const impMatch = impOut.match(/(\d+)\s+broken/)
  const brokenImports = impRes.status === 0 ? 0 : impMatch ? Number(impMatch[1]) : 1

  return {
    // floors (higher is better)
    structureScore: score.score,
    contextCoveragePct: dim('context-coverage'),
    // ceilings (lower is better)
    dupSelectors,
    filesOver250: dim('files-over-cap'),
    cssOver300: dim('css-over-cap'),
    godFiles: dim('god-files'),
    importCycles: dim('import-cycles'),
    brokenImports,
  }
}

const current = measure()

if (WRITE) {
  const baseline = {
    schemaVersion: 1,
    mode: 'ratchet',
    generatedAt: process.env.RATCHET_DATE || new Date().toISOString().slice(0, 10),
    rule:
      "Anti-degradation ratchet (P17, the 'never again' law). Ceilings = max allowed; " +
      'floors = min allowed. Pre-existing debt does not block; any NEW regression rejects ' +
      'the commit. Recovery lowers ceilings / raises floors via --write-baseline. They must ' +
      'only improve.',
    ceilings: {
      dupSelectors: current.dupSelectors,
      filesOver250: current.filesOver250,
      cssOver300: current.cssOver300,
      godFiles: current.godFiles,
      brokenImports: current.brokenImports,
      importCycles: current.importCycles,
    },
    floors: {
      structureScore: current.structureScore,
      contextCoveragePct: current.contextCoveragePct,
    },
    reason:
      'ADAPT: one line on WHY the bar moved this commit (what cleanup landed). The reason ' +
      'field is the audit trail for every ratchet-down — never move the bar silently.',
  }
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`)
  console.log(
    `structure-ratchet: wrote baseline — score>=${current.structureScore}, ` +
      `ctx>=${current.contextCoveragePct}%, dups<=${current.dupSelectors}, ` +
      `files>250<=${current.filesOver250}, css>300<=${current.cssOver300}, ` +
      `god<=${current.godFiles}, brokenImports<=${current.brokenImports}, ` +
      `cycles<=${current.importCycles}`,
  )
  process.exit(0)
}

if (!existsSync(BASELINE_PATH)) {
  console.error('structure-ratchet: baseline missing — run `node structure-ratchet.mjs --write-baseline`')
  process.exit(1)
}
const base = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
const fails = []
// ceilings: current must be <= baseline (debt may not grow)
for (const [k, ceil] of Object.entries(base.ceilings)) {
  if (current[k] > ceil) fails.push(`${k}: ${current[k]} > ceiling ${ceil} (regressed by ${current[k] - ceil})`)
}
// floors: current must be >= baseline (quality may not drop)
for (const [k, floor] of Object.entries(base.floors)) {
  if (current[k] < floor) fails.push(`${k}: ${current[k]} < floor ${floor} (dropped by ${floor - current[k]})`)
}

if (fails.length) {
  console.error('structure-ratchet: FAIL — structure regressed below the frozen baseline:')
  for (const f of fails) console.error(`  x ${f}`)
  console.error(
    '\nFix the regression. If this is intentional recovery that should TIGHTEN the bar, ' +
      'that is fine — but tightening happens via `node structure-ratchet.mjs --write-baseline`, ' +
      'never by loosening a ceiling/floor by hand. The bar only tightens.',
  )
  process.exit(1)
}
console.log(
  `structure-ratchet: OK — score ${current.structureScore}>=${base.floors.structureScore}, ` +
    `ctx ${current.contextCoveragePct}%>=${base.floors.contextCoveragePct}%, ` +
    `dups ${current.dupSelectors}<=${base.ceilings.dupSelectors}, ` +
    `files>250 ${current.filesOver250}<=${base.ceilings.filesOver250}, ` +
    `css>300 ${current.cssOver300}<=${base.ceilings.cssOver300}, ` +
    `god ${current.godFiles}<=${base.ceilings.godFiles}, ` +
    `brokenImports ${current.brokenImports}<=${base.ceilings.brokenImports}, ` +
    `cycles ${current.importCycles}<=${base.ceilings.importCycles}`,
)
process.exit(0)
