#!/usr/bin/env node
/**
 * no-orphan-scripts.mjs — NO-ORPHAN LIVENESS GATE on the ops/script layer
 * ============================================================================
 * ENFORCES: P22 (every script must be reachable — a package.json entry OR
 *           imported by live code — or it's flagged orphan; the known-orphan set
 *           may only SHRINK). Dead ops code is the same legibility tax as a stale
 *           doc. This is the enforcement complement to P13 (the name-normalized
 *           ops entrypoint layer): P13 says "scripts live at a known path"; P22
 *           says "and every one of them is actually wired to something".
 *
 * THE RATCHET SHAPE (same family as structure-ratchet, P17): a baseline file
 * lists KNOWN orphans so pre-existing loose scripts do not block. Only a NEW
 * orphan (or a re-classified one) is reported. The known-orphan set is monotonic
 * — it may only shrink (a recovery wave runs --write-baseline to lock the
 * smaller set in). Starts WARN-mode; promote to hard-fail once the pile is small
 * enough that a clean repo can hard-error at 0 (the P19 zero-violation flip).
 *
 * DETECTION MODEL (intentionally false-positive-SAFE — errs toward flagging, and
 * the baseline absorbs historical noise):
 *   - "referenced in package.json": the script's repo-relative path appears as a
 *     substring in any `scripts` entry value (catches `node scripts/X.mjs --flag`).
 *   - "imported by live code": the script's relative path OR basename appears as
 *     a substring in any source file under the importer roots (catches static,
 *     dynamic, and subdir imports).
 *   - One good reference is enough. No reference + not allowlisted = orphan.
 *
 * THE ALLOWLIST IS A LOCKED SURFACE, NOT A JUNK DRAWER: every entry MUST carry a
 * written reason ("why this file is reachable-only-by-hand and that's correct").
 * A bare allowlist entry with no reason is itself rot.
 *
 * HOW TO ADAPT:
 *   - SCRIPT_ROOT / SCRIPT_EXT: where your ops scripts live + their extension.
 *   - IMPORTER_ROOTS: every dir whose files could import a script.
 *   - First run `--write-baseline` to seed the known-orphan set, commit it, done.
 *   - Wire `node fitness/no-orphan-scripts.mjs` into pre-commit (it exits 0 in
 *     WARN-mode; flip the final exit to 1 once you've cleared the pile to flip
 *     it to a hard gate per P19).
 *
 * USAGE:
 *   node fitness/no-orphan-scripts.mjs                 # report NEW orphans (warn)
 *   node fitness/no-orphan-scripts.mjs --write-baseline # freeze the known set
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve, sep, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = join(ROOT, 'fitness', 'baseline', 'known-orphan-scripts.json')
const WRITE_BASELINE = process.argv.includes('--write-baseline')

// --- ADAPT these to your repo ---
const SCRIPT_ROOT = 'scripts'                                   // the ops layer being audited
const SCRIPT_EXT = '.mjs'                                       // script extension
const IMPORTER_ROOTS = ['scripts', 'src', 'packages']          // where importers could live
const IMPORTER_EXT = /\.[cm]?[jt]sx?$/                          // importer file extensions

// Allowlist: scripts reachable ONLY by direct hand-invocation, on purpose. Each
// MUST carry a reason — this is a locked design surface, not a junk drawer.
const ALLOWLIST_WITH_REASON = {
  // 'scripts/recon-oneoff.mjs': 'dated one-off recon harness; run by hand, output to docs/recon/, not on the npm pipeline',
}

const toPosix = (p) => p.split(sep).join('/')

function walk(dir, test, acc = []) {
  if (!existsSync(dir)) return acc
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '_archive' || e.name === 'node_modules') continue
    const abs = join(dir, e.name)
    if (e.isDirectory()) walk(abs, test, acc)
    else if (test(abs)) acc.push(toPosix(relative(ROOT, abs)))
  }
  return acc
}

function listScripts() {
  return walk(join(ROOT, SCRIPT_ROOT), (p) => p.endsWith(SCRIPT_EXT) && !p.endsWith(`.test${SCRIPT_EXT}`)).sort()
}

function listImporters() {
  const acc = []
  for (const root of IMPORTER_ROOTS) walk(join(ROOT, root), (p) => IMPORTER_EXT.test(p) && !/\.test\./.test(p), acc)
  return acc
}

function referencedInPackageJson(relScriptPath) {
  const pkgPath = join(ROOT, 'package.json')
  if (!existsSync(pkgPath)) return false
  let pkg
  try { pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) } catch { return false }
  return Object.values(pkg.scripts || {}).some((v) => typeof v === 'string' && v.includes(relScriptPath))
}

function importedBy(relScriptPath, importers) {
  const basename = relScriptPath.split('/').pop()
  const needles = [relScriptPath, basename]
  for (const importer of importers) {
    let text
    try { text = readFileSync(join(ROOT, importer), 'utf8') } catch { continue }
    if (needles.some((n) => text.includes(n))) return true
  }
  return false
}

function findOrphans() {
  const importers = listImporters()
  const orphans = []
  for (const file of listScripts()) {
    if (Object.prototype.hasOwnProperty.call(ALLOWLIST_WITH_REASON, file)) continue
    if (referencedInPackageJson(file)) continue
    if (importedBy(file, importers)) continue
    orphans.push(file)
  }
  return orphans
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) return null
  try { return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) } catch { return null }
}

const orphans = findOrphans()

if (WRITE_BASELINE) {
  mkdirSync(dirname(BASELINE_PATH), { recursive: true })
  const baseline = {
    schemaVersion: 1,
    mode: 'warn',
    generatedAt: process.env.ORPHAN_DATE || new Date().toISOString().slice(0, 10),
    rule:
      'Orphan scripts are a ratchet (P22): the known set may only SHRINK. NEW orphans warn; ' +
      'promote to a hard gate (exit 1) after a cleanup wave drives the pile to 0 (P19 zero-flip).',
    allowlist: ALLOWLIST_WITH_REASON,
    total: orphans.length,
    orphans,
  }
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`)
  console.log(`no-orphan-scripts: wrote baseline with ${orphans.length} known orphan(s)`)
  process.exit(0)
}

const baseline = readBaseline()
const known = new Set(baseline ? baseline.orphans || [] : [])
const newOrphans = orphans.filter((o) => !known.has(o))
const absorbed = orphans.filter((o) => known.has(o))

if (!baseline) {
  console.warn('WARN no-orphan-scripts: baseline missing; run `node fitness/no-orphan-scripts.mjs --write-baseline`')
}
for (const file of newOrphans) {
  console.warn(
    `WARN no-orphan-scripts: ${file} — no package.json entry, no importer under ${IMPORTER_ROOTS.join('/')}. ` +
      'Wire an npm alias (preferred), import it from live code, move it to _archive/, or add it to ' +
      'ALLOWLIST_WITH_REASON with a written rationale.',
  )
}
console.log(`no-orphan-scripts: ${newOrphans.length} NEW / ${orphans.length} total / ${absorbed.length} baselined`)
// WARN-mode: never hard-fail yet. Flip to `process.exit(newOrphans.length ? 1 : 0)`
// once the pile is cleared and you want the P19 hard gate.
process.exit(0)
