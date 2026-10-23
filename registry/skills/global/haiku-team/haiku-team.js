export const meta = {
  name: 'haiku-team',
  description: 'Haiku 5.5 teams in four modes (map, research, verify, build): workers take one slice each and share a board, a Haiku owner merges once 75% of slices are in (late slices still land) and may send one follow-up round; every result is on the board ledger, a coach logs how to improve the team; one return per team',
  whenToUse: 'Anything an Opus would otherwise do with 5+ reads, a sweep, a claim check, or several small disjoint edits',
}
// args: { run: 'short-unique-id', context: string,
//   teams: [{ name, mode?: 'map'|'research'|'verify'|'build' (default map), context?, owner?: string, followups?: number,
//             slices: [string | { ask, type?, effort?, files?: [paths] (build: the only files this worker may edit), check?: 'cmd' }] }] }
// Every agent is Haiku 5.5 (CLAUDE_CODE_SUBAGENT_MODEL). No worktrees: the team works in the caller's checkout.
// Build workers never commit: the owner reviews the diff and reruns the checks; the caller (Opus) commits.
const RUN = args.run || 'team'
const DIR = '~/SISO_Workspace/.agents/teams'
const board = (team) => `${DIR}/${RUN}-${team}.jsonl`
const BASE = `Corpus first: before external research, run recall for your topic or query the Great Library; reuse relevant library/research, agents/harness/reports and eco-fp reviews. Name reused sources and research only the missing questions; unavailable sources remain unknown. Return status "done" only after every command you started has exited; never use & or nohup, never send output you need to /dev/null. Use rg, sed, jq for reads; heavy only for commands over 30 s, as HEAVY_TIMEOUT=3 heavy --class quick -- <cmd>, and if heavy has not admitted it within 3 min, return status "blocked" with the command. Tool-call budget: about 4 (low effort), 8 (medium), 15 (high); stop early when two reads agree. gh search code allows 10 per minute for the whole team: sleep 7 s between code searches and fall back to gh search repos or contents reads on a 403. GitHub: gh search repos|code ... --json ..., gh api 'repos/O/R/contents/PATH?ref=main' (quote URLs), never clone. Never print secrets or anyone's private messages (Shaan's own short phrases are fine). No background jobs and no "&": run commands in the foreground and wait; anything over ~30 s via "heavy --class quick --". Keep your context under ~90k: when you have read a lot, stop and return what you have, marking the rest "unknown". Return only the schema; evidence is command+number or file:line.`
const READONLY = `READ-ONLY except the team board: never edit, move, commit, push, kill or restart anything. Appending your result and notes to the team board is part of the job and stays allowed even when the context says "read-only" or "never edit anything".`
const MODES = {
  map: { type: 'scout', rules: READONLY, owner: 'Fill the table with what is true today and the next step for each item.' },
  research: { type: 'researcher', rules: READONLY + ' Cite a URL for every claim and its fetch result (HTTP status, or unreached); a 404 or unverified figure is not a source.', owner: 'Merge into the best-practice table: practice, source URL plus a supporting quote (25 words max), how we would apply it. Drop rows without a source quote.' },
  verify: { type: 'checker', rules: READONLY + ' Try to REFUTE the claim you are given; default to refuted when the evidence is missing.', owner: 'Table: one row per claim, status = CONFIRMED / REFUTED / UNREACHED with evidence.' },
  build: { type: 'general-purpose', rules: 'You may edit ONLY the files listed in your slice (create them if new). Never commit, push, stash, reset or touch other files; teammates are editing other files in the same checkout. When done, run your slice\'s check and report its exact result.', owner: 'Review: run git status --porcelain on the whole checkout and flag any changed path outside the slices\' files lists; run git diff on every listed file and rerun every slice check. Table: one row per slice, status = PASS/FAIL with the decisive output line, next = the fix if FAIL. Never commit.' },
}
const talk = (team) => `Team board: ${board(team)} (shared with teammates). Read it at the start and before you return. To tell a teammate or the owner something that matters outside your slice, append one JSON line with a quoted heredoc (never echo): mkdir -p ${DIR}; cat >> ${board(team)} <<'EOF'\n{"from":"<slice>","to":"all|owner|<slice>","note":"..."}\nEOF`
const F = { type: 'object', properties: {
  status: { type: 'string', enum: ['done', 'blocked'] },
  findings: { type: 'array', maxItems: 12, items: { type: 'object', properties: { claim: { type: 'string', maxLength: 300 }, evidence: { type: 'string', maxLength: 300 } }, required: ['claim', 'evidence'] } },
  open_questions: { type: 'array', maxItems: 5, items: { type: 'string' } },
  blocked_items: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 200 }, description: 'each shop, file or claim you could not finish; empty when all are done' },
  blocked_reason: { type: 'string', maxLength: 300 },
  tools_used: { type: 'integer', minimum: 0, description: 'tool calls you made, for the budget in the brief' } }, required: ['status', 'findings'] }
const O = { type: 'object', properties: {
  state: { type: 'string', description: '6 lines max' },
  table: { type: 'array', maxItems: 15, items: { type: 'object', properties: { item: { type: 'string' }, status: { type: 'string' }, next: { type: 'string' } }, required: ['item', 'status', 'next'] } },
  decisions: { type: 'array', items: { type: 'string' }, description: 'max 5 real choices, each with a recommended default' },
  followups: { type: 'array', items: { type: 'object', properties: { ask: { type: 'string' }, type: { type: 'string', enum: ['scout', 'researcher', 'runner', 'librarian', 'checker'] } }, required: ['ask'] } } },
  required: ['state', 'table', 'decisions'] }
const C = { type: 'object', properties: { score: { type: 'number', description: '1-10, how well this team answered what it was given' }, lessons: { type: 'array', items: { type: 'string' } } }, required: ['score', 'lessons'] }

const TYPES = ['scout', 'researcher', 'runner', 'librarian', 'checker', 'general-purpose']
const worker = (t, m, ctx, s, label) => {
  const slice = typeof s === 'string' ? { ask: s } : s
  if (!slice || !slice.ask) throw new Error(`${t.name}:${label} slice needs an ask`)
  if (!TYPES.includes(slice.type || m.type)) { log(`${t.name}:${label} unknown type "${slice.type}", using ${m.type}`); slice.type = m.type }
  const extra = slice.files ? `\nFiles you may edit: ${slice.files.join(', ')}` : ''
  const check = slice.check ? `\nYour check: ${slice.check}` : ''
  const ledger = `\nLast step before you return: append your result as ONE JSON line to the board with a quoted heredoc: cat >> ${board(t.name)} <<'EOF'\n{"from":"${label}","result":<your schema JSON>}\nEOF`
  return agent(`${ctx}\n${talk(t.name)}\n\nYour slice (${label}): ${slice.ask}${extra}${check}${ledger}`,
    { label: `${t.name}:${label}`, phase: t.name, agentType: slice.type || m.type, effort: slice.effort || 'medium', schema: F })
}
// Workflow VMs expose agent/parallel, not filesystem or shell APIs. The tiny
// runner executes one deterministic append, with no discovery or model decisions.
// No clock reads here: the Workflow VM throws on them (they break resume); a0 team-event stamps the time.
const event = async (t, kind, status) => {
  const value = { kind, status, who: t.name, task: t.task || args.task || null, board: board(t.name) }
  const quoted = "'" + JSON.stringify(value).replace(/'/g, "'\\''") + "'"
  const result = await agent(`Run exactly this command once and return {"status":"done"} only on exit 0: a0 team-event ${quoted}. No other commands, reads or writes.`,
    { label: `${t.name}:${kind}`, phase: t.name, agentType: 'general-purpose', effort: 'low',
      schema: { type: 'object', properties: { status: { type: 'string', enum: ['done', 'blocked'] } }, required: ['status'] } })
  if (!result || result.status !== 'done') log(`${t.name}: ${kind} event not recorded (the team carries on)`)
}
const runTeam = async (t) => {
  let status = 'blocked'
  await event(t, 'team-start', 'running')
  try {
    const out = await team(t)
    status = out._eventStatus
    return out
  } finally {
    await event(t, 'team-end', status)
  }
}
const team = async (t) => {
  const m = MODES[t.mode || 'map']
  const ctx = `${args.context || ''}\n${t.context || ''}\n${m.rules}\n${BASE}`
  if (!t.slices.length || t.slices.length > 12) throw new Error(`${t.name}: give 1-12 slices`)
  if (m === MODES.build) {
    const seen = new Set()
    for (const sl of t.slices) for (const f of (sl.files || [])) { if (seen.has(f)) throw new Error(`${t.name}: two build slices both edit ${f}`); seen.add(f) }
  }
  const label = (list, pre) => (rs) => rs.map((r, i) => ({ slice: `${pre}${i + 1}`, ask: String(list[i].ask || list[i]).slice(0, 200), result: r || { status: 'missing' } }))
  // Each slice is its own chain (worker, one retry if it came back missing, the research refute), so no slice waits on
  // another. The owner starts once a quorum is in plus a short grace (Shaan, 21 Oct: "most of the agents are done ...
  // not waiting on those last two agents the whole time"); a late slice still lands on the board and in the return.
  const research = (t.mode || 'map') === 'research' && t.refute !== false
  const V = { type: 'object', properties: { checks: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, verdict: { type: 'string', enum: ['confirmed', 'refuted', 'unreached'] }, note: { type: 'string' } }, required: ['claim', 'verdict'] } } }, required: ['checks'] }
  const got = new Array(t.slices.length), chk = []
  const chains = t.slices.map((s, i) => (async () => {
    let r = await worker(t, m, ctx, s, `${i + 1}`)
    if (!r) r = await worker(t, m, ctx, s, `${i + 1}r`)
    if (r && research && (r.findings || []).length) {
      const c = await agent(`${MODES.verify.rules}\n${BASE}\nRe-open the source of each claim below and try to refute it. Claims:\n${JSON.stringify(r.findings)}`,
        { label: `${t.name}:check${i + 1}`, phase: t.name, agentType: 'checker', effort: 'low', schema: V })
      if (c) chk[i] = c.checks
    }
    got[i] = r || null
  })().catch(() => { got[i] = null }))
  const N = t.slices.length
  const need = Math.min(N, Math.max(1, Math.ceil(N * (t.quorum ?? 0.75))))
  const wait = (ms) => new Promise((go) => setTimeout(go, ms))
  await new Promise((go) => {
    let n = 0
    chains.forEach((p) => p.then(() => { n++; if (n >= N) go(); else if (n === need) wait((t.grace ?? 45) * 1000).then(go) }))
  })
  const snap = () => t.slices.map((s, i) => ({ slice: `${i + 1}`, ask: String(s.ask || s).slice(0, 200),
    result: i in got ? (got[i] || { status: 'missing' }) : { status: 'running' }, ...(chk[i] ? { checks: chk[i] } : {}) }))
  let res = snap()
  const gone = res.filter((r) => r.result.status !== 'done').map((r) => `${r.slice}:${r.result.status}`)
  log(`${t.name}: ${N - gone.length}/${N} done, owner starting${gone.length ? `; not done: ${gone.join(' ')}` : ''}`)
  const own = (extra) => agent(`${ctx}\n\nYou own the ${t.name} Haiku team (mode ${t.mode || 'map'}). Read the team board ${board(t.name)} too. Worker returns:\n${JSON.stringify(res)}\n\n${extra}Your context is small: run at most 3 commands, cap every output with | head -c 2000, never cat a whole log or jsonl, and ignore background-task notifications (never read /private/tmp task files). Cross-check contradictions (re-run one decisive command if two disagree). A blocked or missing slice makes its rows "unknown" and a slice still running makes them "pending", never guessed; a refuted claim is dropped. ${t.owner || m.owner} Before returning, append your final JSON as one line to ${board(t.name)} with a quoted heredoc (cat >> FILE <<'EOF' ... EOF) so the result survives the run.`,
    { label: `${t.name}:owner`, phase: t.name, agentType: 'scout', effort: t.ownerEffort || 'medium', schema: O })
  // The coach runs beside the owner, never in its way: it grades the team and appends ideas to the shared improvement log.
  const coach = agent(`${m === MODES.build ? READONLY : m.rules}\n${BASE}\nYou coach Haiku teams (Shaan, 20 Oct: "one guy out of every Haiku team should see how to improve the Haiku team and note down data"). Team ${t.name}, mode ${t.mode || 'map'}, run ${RUN}.
Slices given: ${JSON.stringify(t.slices)}
Not done: ${gone.join(' ') || 'none'}. Per worker: status, findings count, open questions, evidence sample: ${JSON.stringify(res.map((r) => ({ s: r.slice, st: r.result.status, why: r.result.blocked_reason, n: (r.result.findings || []).length, open: (r.result.open_questions || []).length, ev: (r.result.findings || []).slice(0, 3).map((f) => f.evidence.slice(0, 300)) })))}
Board: read ${board(t.name)} if it exists.
Judge: were slices well cut (overlap, too broad, wrong worker type, wrong effort)? Did evidence hold up? What should the next team of this kind do differently, and what should change in the haiku-team script or skill (~/.claude/workflows/haiku-team.js, ~/.claude/skills/haiku-team/SKILL.md; read them)?
Then append ONE JSON line (your only write) with a quoted heredoc, never echo: mkdir -p ${DIR}; cat >> ${DIR}/IMPROVE.jsonl <<'EOF'\n<json on one line>\nEOF with keys run, team, mode, slices, returned, score, lessons (array of short strings). Return the same as the schema.`,
    { label: `${t.name}:coach`, phase: t.name, agentType: 'scout', effort: 'medium', schema: C })
  let out = await own('If a gap or contradiction blocks you, list follow-up slices instead of guessing, each naming the claim it settles and what result settles it (they run once and come back to the caller beside your table). ')
  if (!out) throw new Error(`${t.name}: owner returned nothing`)
  const fu = (out.followups || []).slice(0, t.followups ?? 4)
  const more = fu.length ? label(fu, 'f')(await parallel(fu.map((s, i) => () => worker(t, m, ctx, s, `f${i + 1}`)))) : []
  if (fu.length) log(`${t.name}: ${fu.length} follow-ups back`)
  // The run ends when the script returns, which stops any agent still going, so give stragglers a capped wait and name the rest.
  const pending = res.filter((r) => r.result.status === 'running').map((r) => Number(r.slice) - 1)
  if (pending.length) await Promise.race([Promise.all(pending.map((i) => chains[i])), wait((t.lateWait ?? 60) * 1000)])
  const now = snap()
  const late = pending.filter((i) => i in got).map((i) => now[i])
  const dropped = pending.filter((i) => !(i in got)).map((i) => `${i + 1}`)
  if (dropped.length) log(`${t.name}: dropped slices still running: ${dropped.join(' ')} (their notes are on ${board(t.name)})`)
  const graded = await coach
  const brief = (r) => ({ slice: r.slice, ask: r.ask, status: r.result.status, findings: r.result.findings, checks: r.checks })
  return { ...out, _eventStatus: now.some((r) => r.result.status !== 'done' || (r.result.blocked_items || []).length) || more.some((r) => r.result.status !== 'done' || (r.result.blocked_items || []).length) ? 'blocked' : 'done',
    ...(more.length ? { followup_results: more.map(brief) } : {}), ...(late.length ? { late: late.map(brief) } : {}),
    ...(dropped.length ? { dropped } : {}), board: board(t.name), coach: graded && { score: graded.score, lessons: graded.lessons.slice(0, 3) } }
}
const out = await parallel(args.teams.map((t) => () => runTeam(t)))
return Object.fromEntries(args.teams.map((t, i) => [t.name, out[i]]))
