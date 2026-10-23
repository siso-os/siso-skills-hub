export const meta = {
  name: 'forge-round',
  description: 'One round of the forge-skill loop: MINE the OSS field for SOTA ideas (Haiku/MiniMax fan-out, code-search-campaign method) + ATTACK the target with the adversary/gaslight protocol (Codex gpt-5.5: persona FIND, escalate-on-empty, N default-refuted CONFIRMers, majority vote) using the REAL adversary premises bank. Returns mined steals + a confirmed ranked improvement pool. Self-contained at one nesting level (does not nest adversary-sweep).',
  phases: [
    { title: 'Read', detail: 'read the target skill body + load the adversary premises bank' },
    { title: 'Mine', detail: 'Haiku fan-out: artifact-class OSS sweep for SOTA ideas to steal' },
    { title: 'Find', detail: 'Codex gaslight FIND per lens, escalate the multiplier up the ladder on empty' },
    { title: 'Confirm', detail: 'N default-refuted Codex skeptics per finding; majority vote (ALWAYS-PAIRED LAW)' },
    { title: 'Rank', detail: 'merge mined + confirmed gaps, rank, write report, return summary' },
  ],
}

// readFile is provided by the workflow runtime (same as adversary-sweep.js) — no import.

// ---- args ----
const TARGET   = args.target                                  // skill dir / subsystem path (required)
const ROUND    = Number(args.round || 1)
const SEEN     = args.seenIdeas || []                         // ideas already mined in prior rounds (dedup)
const LENSES   = args.lenses || ['architecture', 'not-magical', 'ai-legibility']
const MIN_GAIN = Number(args.minGain || 2)
const CONFIRMERS = Number(args.confirmers || 3)
const ADV_DIR  = args.adversaryDir || (process.env.HOME + '/.claude/skills/adversary')

const CODEX = 'codex -m gpt-5.5 -c model_reasoning_effort=xhigh'
const RUNG_ORDER = ['low', 'mid', 'high', 'god']

log(`forge-round ${ROUND} on ${TARGET} — lenses: ${LENSES.join(', ')}`)

// ---------------------------------------------------------------------------
// READ — target body + adversary bank (deterministic, no agent tokens)
// ---------------------------------------------------------------------------
phase('Read')
// The workflow JS sandbox has NO filesystem access. The orchestrator passes the file
// CONTENTS in via args (targetBody, bankJson). Fallback: an agent (which HAS Read) fetches them.
let targetBody = args.targetBody || ''
if (!targetBody) {
  targetBody = await agent(
    `Read the file at ${TARGET}/SKILL.md and return its FULL raw contents verbatim, nothing else. ` +
    `If that path is a file not a dir, read ${TARGET} directly. RETURN: the raw file text only.`,
    { label: 'read:target', phase: 'Read', model: 'haiku' }
  )
}
if (!targetBody || targetBody.length < 20) throw new Error(`could not obtain target SKILL.md body for ${TARGET}`)

let BANK
if (args.bankJson) {
  BANK = typeof args.bankJson === 'string' ? JSON.parse(args.bankJson) : args.bankJson
} else {
  const raw = await agent(
    `Read the JSON file at ${ADV_DIR}/premises/premises.json and return its FULL raw contents verbatim, nothing else.`,
    { label: 'read:bank', phase: 'Read', model: 'haiku' }
  )
  BANK = JSON.parse(raw)
}
const frameText = BANK.frame.anchor
const lensCfg = (id) => (BANK.lenses || []).find(l => l.id === id)
const personaText = (ids) => (ids || []).map(p => `### Persona ${p}\n${BANK.personas[p].prompt}`).join('\n\n')
const rungPremise = (lens, rung) => {
  const ladder = lens.multiplier_ladder || []
  return (ladder.find(r => r.rung === rung) || ladder[ladder.length - 1] || {}).premise || 'find the gaps below perfect'
}

// ---------------------------------------------------------------------------
// MINE — Haiku/MiniMax fan-out over artifact classes (code-search-campaign method)
// ---------------------------------------------------------------------------
phase('Mine')
const MINE_SCHEMA = {
  type: 'object',
  properties: {
    steals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          idea: { type: 'string', description: 'a concrete mechanic to steal, <=20 words' },
          source: { type: 'string', description: 'owner/repo or project it comes from' },
          why: { type: 'string', description: 'why it would make THIS skill better, <=20 words' },
        },
        required: ['idea', 'source', 'why'],
      },
    },
  },
  required: ['steals'],
}

// derive the skill's JOB from its description line, to aim the search
const descLine = (targetBody.match(/description:\s*"?(.+?)"?\s*$/m) || [])[1] || targetBody.slice(0, 200)
const seenStr = SEEN.length ? `\nAlready mined (find DIFFERENT ones): ${SEEN.slice(0, 40).join('; ')}` : ''

const MINE_ANGLES = [
  `runnable tools / frameworks that do this job: ${descLine}`,
  `prompt libraries / methodology / playbooks for: ${descLine}`,
  `awesome-lists, GitHub topics, and infra/SDK around: ${descLine}`,
]
const mined = await parallel(MINE_ANGLES.map((angle, i) => () =>
  agent(
    `Mine OSS (GitHub + Sourcegraph via the gitsearch/sourcegraph skills, or web search of github.com) for the SOTA on this angle:\n\n${angle}\n\nThis is round ${ROUND} of hardening a skill whose job is: "${descLine}". Find concrete MECHANICS we could steal to make it better — not generic repos.${seenStr}\n\nCONSTRAINTS: read-only research; verify repos exist; do not invent names.\nRETURN: the schema only, 4-8 strong steals.\nSTOP after ~6 searches; return what you have.`,
    { label: `mine:${i}`, phase: 'Mine', schema: MINE_SCHEMA, model: 'haiku', agentType: 'Explore' }
  )
))
const steals = mined.filter(Boolean).flatMap(m => m.steals || [])
log(`mined ${steals.length} candidate steals`)

// ---------------------------------------------------------------------------
// FIND — gaslight, per lens, escalate the WORDING up the ladder on empty
// ---------------------------------------------------------------------------
phase('Find')
const FIND_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          where: { type: 'string', description: 'the section/line/behavior in the target this is about' },
          gap: { type: 'string', description: 'the distance below perfect — what the flawless version does that this does not' },
          fix: { type: 'string', description: 'the concrete improvement to close it' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        },
        required: ['title', 'where', 'gap', 'fix', 'severity'],
      },
    },
    empty_with_evidence: { type: 'string', description: 'if NOTHING found: what you checked, proving it is clean (required when findings is empty)' },
  },
  required: ['findings'],
}

async function findForLens(lensId) {
  const lens = lensCfg(lensId)
  if (!lens) return { lens: lensId, findings: [] }
  // round N starts one rung higher so later rounds dig deeper
  let idx = Math.min(RUNG_ORDER.length - 1, 1 + (ROUND - 1))
  for (; idx < RUNG_ORDER.length; idx++) {
    const rung = RUNG_ORDER[idx]
    const prompt =
      `${frameText}\n\n${personaText(lens.personas)}\n\n` +
      `LENS: ${lensId} — ${rungPremise(lens, rung)}\n\n` +
      `You are measuring the gap below the PERFECT version of this SKILL (GENERATIVE mode — there is no diff; ` +
      `find the gaps to close). The skill under examination:\n\n<<<SKILL>>>\n${targetBody}\n<<<END>>>\n\n` +
      `Find concrete, grounded improvements through the ${lensId} lens at this intensity. Each must point at a real ` +
      `section/behavior in the skill (the 'where'), name the gap below perfect, and give the fix. Do NOT propose ` +
      `things already present — re-read before asserting absence.\n\n` +
      `CONSTRAINTS: ground every finding in the skill text above; no vibes.\n` +
      `RETURN: the schema. If genuinely nothing is below perfect at this intensity, return findings:[] AND fill ` +
      `empty_with_evidence with what you checked.\nSTOP after the sweep.`
    const res = await agent(prompt, {
      label: `find:${lensId}:${rung}`, phase: 'Find', schema: FIND_SCHEMA, model: 'haiku',
    })
    const found = (res && res.findings) || []
    if (found.length) return { lens: lensId, rung, findings: found }
    if (rung === 'god') return { lens: lensId, rung, findings: [], evidence: res && res.empty_with_evidence }
    // else: empty below god → escalate the wording (next rung)
  }
  return { lens: lensId, findings: [] }
}

const lensResults = await parallel(LENSES.map(l => () => findForLens(l)))
let rawFindings = lensResults.filter(Boolean).flatMap(r => (r.findings || []).map(f => ({ ...f, lens: r.lens })))
const exhausted = lensResults.every(r => !r.findings || r.findings.length === 0)
log(`gaslight found ${rawFindings.length} raw findings (god-rung-exhausted: ${exhausted})`)

// ---- BOUND the confirm fan-out (hard terminator). Dedupe near-duplicate findings across
// lenses by a normalized title+where key, then cap to MAX_CONFIRM by severity. Without this,
// 4 lenses × escalation produce 40+ findings × 3 confirmers = 120+ agents (a runaway loop).
const SEV = { critical: 0, high: 1, medium: 2, low: 3 }
const MAX_CONFIRM = Number(args.maxConfirm || 12)
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 6).join(' ')
const dedup = new Map()
for (const f of rawFindings) {
  const key = norm(f.title) + '|' + norm(f.where)
  const ex = dedup.get(key)
  if (!ex || (SEV[f.severity] ?? 9) < (SEV[ex.severity] ?? 9)) dedup.set(key, f)
}
rawFindings = [...dedup.values()]
  .sort((a, b) => (SEV[a.severity] ?? 9) - (SEV[b.severity] ?? 9))
  .slice(0, MAX_CONFIRM)
log(`deduped + capped to ${rawFindings.length} findings for confirm (max ${MAX_CONFIRM})`)

// ---------------------------------------------------------------------------
// CONFIRM — default-refuted skeptics, majority vote. Confirmer count scales with severity:
// 3 for critical/high (worth the rigor), 1 for medium/low (cheap gate). Bounds total agents.
// ---------------------------------------------------------------------------
phase('Confirm')
const CONFIRM_SCHEMA = {
  type: 'object',
  required: ['verdict', 'reason'],
  properties: {
    verdict: { type: 'string', enum: ['CONFIRMED', 'REFUTED'] },
    reason: { type: 'string', description: 'why — must reference the actual skill text' },
  },
}

const confirmed = await pipeline(
  rawFindings,
  (f) => {
    const n = (f.severity === 'critical' || f.severity === 'high') ? CONFIRMERS : 1
    return parallel(Array.from({ length: n }, (_, k) => () =>
      agent(
        `You are an independent skeptic. A reviewer claims this SKILL has an improvement gap. DEFAULT TO REFUTED. ` +
        `Flip to CONFIRMED only if you can prove, against the skill text, that the gap is REAL, NOT already addressed, ` +
        `belongs in THIS skill (not its caller/harness), and is a genuine improvement (not a gameable "add a section").\n\n` +
        `CLAIM: [${f.lens}/${f.severity}] ${f.title}\nWHERE: ${f.where}\nGAP: ${f.gap}\nFIX: ${f.fix}\n\n` +
        `<<<SKILL>>>\n${targetBody}\n<<<END>>>\n\n` +
        `CONSTRAINTS: cite the skill text in your reason.\nRETURN: the schema only.\nSTOP after deciding.`,
        { label: `confirm:${f.title.slice(0, 24)}:${k}`, phase: 'Confirm', schema: CONFIRM_SCHEMA, model: 'haiku' }
      )
    )).then(votes => {
      const real = votes.filter(Boolean)
      const yes = real.filter(v => v.verdict === 'CONFIRMED').length
      return { ...f, confirms: yes, total: real.length, survived: real.length > 0 && yes > real.length / 2 }
    })
  }
)

const pool = confirmed.filter(Boolean).filter(f => f.survived)
pool.sort((a, b) => (SEV[a.severity] ?? 9) - (SEV[b.severity] ?? 9) || b.confirms - a.confirms)
log(`confirmed pool: ${pool.length}/${rawFindings.length} survived majority vote`)

// ---------------------------------------------------------------------------
// RANK + REPORT
// ---------------------------------------------------------------------------
phase('Rank')
const report = await agent(
  `Write a compact HTML round report for forge-round ${ROUND} on ${TARGET}. Sections: (1) Mined steals (table: idea/source/why), ` +
  `(2) Confirmed improvement pool (table: lens/severity/title/where/gap/fix/confirms), (3) god-rung exhausted = ${exhausted}. ` +
  `Data:\nMINED=${JSON.stringify(steals)}\nPOOL=${JSON.stringify(pool)}\n\n` +
  `Write the HTML to ${TARGET}/.forge/round-${ROUND}.html (create the dir). RETURN only the file path you wrote.`,
  { label: 'report', phase: 'Rank', model: 'haiku' }
)

// Top-level return is illegal in ESM; the runtime harness reads this object as the round's exit summary.
;(function () { const __roundResult = {
  round: ROUND,
  target: TARGET,
  mined: steals,
  pool: pool.map(f => ({ lens: f.lens, severity: f.severity, title: f.title, where: f.where, gap: f.gap, fix: f.fix, confirms: `${f.confirms}/${f.total}` })),
  reportPath: (report || '').trim(),
  exhausted,                       // true → god rung empty-with-evidence across all lenses (terminate)
  gain: pool.length,               // confirmed improvements this round (compare to minGain for diminishing returns)
}
return __roundResult })()
