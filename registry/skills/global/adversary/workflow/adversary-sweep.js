export const meta = {
  name: 'adversary-sweep',
  description: 'Run the adversary/gaslight protocol on a target: FIND with the lens persona(s) at a starting rung via Codex (gpt-5.5 xhigh), auto-escalate the multiplier up to the god cap if the find stage comes back empty, then CONFIRM every finding with N independent default-refuted skeptics (majority vote), rank survivors, and WRITE an HTML report to disk — returning only a short summary. CRITIQUE mode anchors on a diff/file; GENERATIVE mode builds an improvement pool from a subsystem/UI with no diff.',
  phases: [
    { title: 'Load', detail: 'load the lens (frame + persona(s) + multiplier ladder + confirm prompt) from premises.json' },
    { title: 'Find', detail: 'persona-driven Codex find at the starting rung; auto-escalate the wording up the ladder if empty (escalating-with-a-cap)' },
    { title: 'Confirm', detail: 'N independent default-refuted Codex skeptics per finding; majority vote (ALWAYS-PAIRED LAW)' },
    { title: 'Report', detail: 'rank survivors, WRITE the HTML report to disk, return path + headline + top-3' },
  ],
}

// ---- args (with defaults) ----
const TARGET     = args.target;                       // diff path | file | subsystem path (required)
const LENS_ID    = args.lens      || 'bugs';
const START_RUNG = args.rung      || 'mid';           // low | mid | high | god
const MODE       = args.mode      || 'critique';      // critique | generative
const CONFIRMERS = Number(args.confirmers || 3);
const SKILL_DIR  = args.skillDir  || (process.env.HOME + '/.claude/skills/adversary');
const OUT_DIR    = args.outDir    || `${SKILL_DIR}/reports`;

const CODEX_DEEP = 'codex -m gpt-5.5 -c model_reasoning_effort=xhigh';
const RUNG_ORDER = ['low', 'mid', 'high', 'god'];

// ---- load the bank deterministically (no tokens spent reading it into an agent) ----
const BANK = JSON.parse(await readFile(`${SKILL_DIR}/premises/premises.json`));
const lens = (BANK.lenses || []).find(l => l.id === LENS_ID);
if (!lens) throw new Error(`unknown lens '${LENS_ID}'. known: ${(BANK.lenses||[]).map(l=>l.id).join(', ')}`);

const frameText   = BANK.frame.anchor;
const personaText = (lens.personas || []).map(p => `### Persona ${p}\n${BANK.personas[p].prompt}`).join('\n\n');
const ladder      = lens.multiplier_ladder;
const rungPremise = (rung) => (ladder.find(r => r.rung === rung) || {}).premise || ladder[ladder.length - 1].premise;
const startIdx    = Math.max(0, RUNG_ORDER.indexOf(START_RUNG));
// the find lens may be Claude only for ui-soul (taste); everything else is Codex
const findIsClaude = lens.find_engine === 'claude';

const FIND_SCHEMA = lens.output_schema;
const CONFIRM_SCHEMA = {
  type: 'object', required: ['verdict', 'reason'],
  properties: {
    verdict: { type: 'string', enum: ['CONFIRMED', 'REFUTED'] },
    reason:  { type: 'string', description: 'why, with file:line evidence' },
  },
};

phase('Find')
// Escalating-with-a-cap: start at START_RUNG, climb the ladder if the find stage returns empty.
let findResult = null;
let rungReached = START_RUNG;
for (let i = startIdx; i < RUNG_ORDER.length; i++) {
  const rung = RUNG_ORDER[i];
  if (!ladder.find(r => r.rung === rung)) continue; // ladder may skip a rung
  rungReached = rung;
  const findPrompt =
`You are running the FIND stage of an adversary sweep. Mode: ${MODE.toUpperCase()}.

## THE FRAME (anchor every judgment here)
${frameText}

## YOUR PERSONA(S) — embody fully; this is how you SEE
${personaText}

## THE MULTIPLIED PREMISE (rung: ${rung})
${rungPremise(rung)}

## TARGET
${MODE === 'generative'
  ? `Subsystem / UI (NO diff — this is GENERATIVE mode, produce an IMPROVEMENT POOL of gaps to close): ${TARGET}`
  : `Diff / file(s) to critique: ${TARGET}`}

## HOW TO WORK
${findIsClaude
  ? `Read the target yourself and apply the persona + frame as TASTE judgment (this lens is Claude-arbitrated).`
  : `Dispatch Codex to read the REAL files and hunt: run via bash \`cd $(dirname "${TARGET}") 2>/dev/null; ${CODEX_DEEP} "<your composed FIND prompt — paste the frame, persona, and multiplied premise verbatim, point it at ${TARGET}, demand concrete file:line findings>"\` with a generous timeout (e.g. 300000ms). Retry ONCE if it errors/returns empty; if still empty, set findStageReturned=false and do the find yourself by reading the files.`}

Each finding MUST carry the fields in the schema, including a 'verdict' field — set verdict="CONFIRMED" tentatively (the independent confirm stage decides for real next). Be AGGRESSIVE: over-finding is allowed here, precision is restored downstream. If after honest effort there is genuinely nothing at this rung, return findings:[] and findStageReturned=true (this triggers escalation).

Return the structured object (lens="${LENS_ID}", rungReached="${rung}").`;

  findResult = await agent(findPrompt, {
    phase: 'Find',
    label: `find:${LENS_ID}@${rung}`,
    model: findIsClaude ? 'opus' : 'sonnet',  // sonnet drives the Codex dispatch; opus only for the taste lens
    schema: FIND_SCHEMA,
  });

  const got = findResult && Array.isArray(findResult.findings) && findResult.findings.length > 0;
  if (got) break;                       // issues surfaced → stop climbing
  if (rung === 'god') break;            // CAP: top rung reached, terminate (empty-with-evidence)
  // else: empty → escalate the wording, climb to the next rung
}

const rawFindings = (findResult && findResult.findings) || [];

phase('Confirm')
// ALWAYS-PAIRED LAW: each finding defaults to REFUTED; N independent skeptics vote.
const confirmed = [];
for (const f of rawFindings) {
  const where = f.where || 'unspecified';
  const votes = await parallel(
    Array.from({ length: CONFIRMERS }).map((_, k) => () =>
      agent(
`You are an INDEPENDENT skeptic confirming a single adversary finding. You do NOT share the finder's emotion or frame. ${BANK.always_paired_law.rule}

DEFAULT VERDICT: REFUTED. Only flip to CONFIRMED if you can PROVE the issue is real against the actual code path.

LENS confirm instruction: ${lens.confirm_prompt}

FINDING (lens=${LENS_ID}, severity=${f.severity || 'n/a'}):
  issue: ${f.issue}
  where: ${where}
  ${Object.entries(f).filter(([k]) => !['issue','where','severity','verdict','votes'].includes(k)).map(([k,v]) => `${k}: ${v}`).join('\n  ')}

Verify against the REAL code: dispatch Codex \`cd $(dirname "${TARGET}") 2>/dev/null; ${CODEX_DEEP} "Verify against the real code at ${where}. Default to REFUTED. ${(lens.confirm_prompt||'').replace(/"/g,"'")} Claim: ${String(f.issue).replace(/"/g,"'")}"\` (300000ms, retry once); if Codex fails, verify yourself by reading the file. Return only your verdict + a one-line reason with file:line evidence.`,
        { phase: 'Confirm', label: `confirm:${LENS_ID}#${k+1}`, model: 'sonnet', schema: CONFIRM_SCHEMA }
      )
    )
  ).then(r => r.filter(Boolean));

  const yes = votes.filter(v => v.verdict === 'CONFIRMED').length;
  const passed = yes > CONFIRMERS / 2; // strict majority
  if (passed) {
    confirmed.push({ ...f, verdict: 'CONFIRMED', votes: `${yes}/${votes.length}`,
                     confirmReasons: votes.map(v => v.reason).slice(0, 3) });
  }
}

phase('Report')
// Deterministic ranking (no tokens): severity then confirm-vote strength.
const sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
confirmed.sort((a, b) => (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9));
const top3 = confirmed.slice(0, 3).map(f => `[${f.severity}] ${f.issue} (${f.where}) — ${f.votes}`);
const headline = confirmed.length === 0
  ? `CLEAN @ rung ${rungReached} (empty-with-evidence; ${MODE})`
  : `${confirmed.length} CONFIRMED ${MODE === 'generative' ? 'improvement(s)' : 'finding(s)'} on ${LENS_ID} (rung ${rungReached})`;

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = `${OUT_DIR}/adversary-${LENS_ID}-${stamp}.html`;

// Pre-reduce to a compact summary so the writer agent does NOT receive a 20K blob (monolithic-synthesis trap).
const reduced = {
  lens: LENS_ID, mode: MODE, target: TARGET, rungReached,
  findStageReturned: findResult ? !!findResult.findStageReturned : false,
  rawCount: rawFindings.length, confirmedCount: confirmed.length,
  findings: confirmed.map(f => ({
    issue: f.issue, severity: f.severity, where: f.where, votes: f.votes,
    detail: Object.entries(f).filter(([k]) => !['issue','severity','where','votes','verdict','confirmReasons'].includes(k))
                            .map(([k,v]) => `${k}: ${v}`).join(' | '),
    reasons: f.confirmReasons || [],
  })),
};

// The writer WRITES TO DISK with its own tools and returns ONLY a confirmation (orchestrate synthesis rule).
await agent(
`Write a single self-contained HTML report to ${reportPath} (create the dir if needed). This is a machine/agent artifact — HTML, not markdown, semantic sections + a findings table.

Report the adversary sweep below VERBATIM (do not re-analyze, do not editorialize):
${JSON.stringify(reduced, null, 2)}

The HTML must include: a header (lens, mode, target, rung reached, raw→confirmed counts), a one-line headline ("${headline}"), and a ranked table of confirmed findings (severity, issue, where, vote, detail, confirm reasons). If confirmedCount is 0, state clearly "CLEAN — empty with evidence at the god/${rungReached} rung" and note what was checked.

After writing, return ONLY: "wrote ${reportPath}". Do not echo the report content back.`,
  { phase: 'Report', label: 'write-report', model: 'sonnet' }
);

return { reportPath, headline, top3, lens: LENS_ID, mode: MODE, rungReached,
         rawCount: rawFindings.length, confirmedCount: confirmed.length };
