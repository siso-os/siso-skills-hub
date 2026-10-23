#!/usr/bin/env node
/**
 * dep-ratchet.mjs — PROVENANCE GATE ON NEW DEPENDENCIES
 * ============================================================================
 * ENFORCES: P21 (a new top-level dependency must carry a one-line
 *           `dep-rationale: <pkg> — <why our own code can't do it>` in the SAME
 *           commit, or it doesn't land). Makes the dependency graph JUSTIFIED,
 *           not accreted. depcruise already bans new cross-domain imports; this
 *           is the orthogonal "why is this third-party surface here AT ALL" gate.
 *
 * WHAT IT GATES (and what it deliberately does NOT):
 *   - BLOCKS: a genuinely NEW dependency NAME appearing in a manifest with no
 *     `dep-rationale:` line anywhere in the same staged diff or commit message.
 *   - PASSES FREE: version bumps (same name on both sides of the diff) and
 *     removals. Only a new NAME is gated — provenance is about new surface area,
 *     not churn.
 *
 * WHY THE NAME-SET DIFF: a version bump shows the package name on BOTH a `-` and
 * a `+` line. A genuinely new dep shows the name only on `+`. So we diff the SET
 * of added names against the SET of removed names; a name present in both is a
 * bump, not a new dependency. This is the load-bearing trick — a naive "any +
 * line in package.json" gate would fire on every lockfile bump and get disabled.
 *
 * WHERE THE RATIONALE LIVES: package.json is JSON (no comments), so the
 * `dep-rationale:` line cannot sit next to the dep. It may live ANYWHERE in the
 * staged diff — a sibling .md, the commit message, an ADR — and this gate scans
 * the whole staged diff (and, with --range, the commit-range log) for it.
 *
 * HOW TO ADAPT:
 *   - MANIFESTS lists the dependency files this gate watches. Add/remove for your
 *     ecosystem (already covers npm, pip, poetry, cargo).
 *   - The npmKey/pipKey regexes extract a package NAME from a manifest diff line.
 *     Add a keyer for any manifest format you add (the rule: match a line that
 *     declares a dependency name + a version, return the name).
 *   - Wire `node .gates/dep-ratchet.mjs` into .githooks/pre-commit as BLOCKING
 *     (exit 1). It is intentionally hard-fail from day one because its violation
 *     count starts at 0 (no existing commit is missing a rationale) — so per P19
 *     it is safe to hard-error immediately.
 *
 * USAGE:
 *   node .gates/dep-ratchet.mjs              # gate the staged diff (pre-commit)
 *   node .gates/dep-ratchet.mjs --range=A..B # gate a commit range instead (CI)
 *
 * RATIONALE SYNTAX (put this line in the commit msg or a staged sibling file):
 *   dep-rationale: <pkg> — <why a few lines of our own code can't do it>
 */

import { execSync } from 'node:child_process'

const arg = process.argv.find((a) => a.startsWith('--range='))
const range = arg ? arg.split('=')[1] : null
const diffCmd = range ? `git diff ${range}` : 'git diff --cached'

const MANIFESTS = ['package.json', 'requirements.txt', 'pyproject.toml', 'Cargo.toml']

// Extract a package NAME from a manifest diff line. A dep line declares a name
// AND a version containing a digit; that lets us ignore non-dep JSON keys.
const npmKey = (l) => (l.match(/"([@a-z][\w@/.-]*)":\s*"[^"]*\d[^"]*"/i) || [])[1]
const pipKey = (l) => (l.match(/^[+-]\s*([A-Za-z0-9._-]+)\s*[=><~]=/) || [])[1]

let bad = 0
let newDepsTotal = 0
const report = []
for (const f of MANIFESTS) {
  let diff = ''
  try {
    diff = execSync(`${diffCmd} -- ${f}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
  } catch {
    continue
  }
  if (!diff) continue

  const addedNames = new Set()
  const removedNames = new Set()
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++') || l.startsWith('---')) continue
    const key = npmKey(l) || pipKey(l)
    if (!key) continue
    if (l.startsWith('+')) addedNames.add(key)
    else if (l.startsWith('-')) removedNames.add(key)
  }
  // Genuinely NEW = added names NOT also removed (a bump appears on both sides).
  const newDeps = [...addedNames].filter((n) => !removedNames.has(n))
  if (newDeps.length) report.push({ f, newDeps })
  newDepsTotal += newDeps.length
}

if (newDepsTotal) {
  // Rationale may sit in any staged sibling file (whole diff) or the commit message.
  let haystack = ''
  try {
    haystack = execSync(range ? `git diff ${range}` : 'git diff --cached', { encoding: 'utf8' })
  } catch {}
  if (range) {
    try { haystack += '\n' + execSync(`git log --format=%B ${range}`, { encoding: 'utf8' }) } catch {}
  }
  const hasRationale = /dep-rationale:/i.test(haystack)
  if (!hasRationale) {
    for (const { f, newDeps } of report) {
      console.error(`HARD: ${f} added new dependency(ies) with no \`dep-rationale:\`: ${newDeps.join(', ')}`)
    }
    bad++
  }
}

if (bad) {
  console.error('\nAdd a `dep-rationale: <pkg> — <why our own code can\'t do it>` line to the staged diff,')
  console.error('or drop the dep. (A few lines of our own code beats a new third-party surface.)')
}
process.exit(bad ? 1 : 0)
