export const meta = {
  name: 'implement-sweep',
  description: 'Tiered implementation sweep: triage items, run just-do-it and needs-reasoning lanes, verify independently, rate /100, and write a checkpoint report.',
  phases: [
    { title: 'Triage', detail: 'Split work into just-do-it and needs-reasoning lanes.' },
    { title: 'Implement', detail: 'Use Haiku glue and headless codex exec for actual code cognition and edits.' },
    { title: 'Verify', detail: 'Run independent skeptical verification with /100 ratings.' },
    { title: 'Checkpoint', detail: 'Write a compact HTML checkpoint and return only status, rating, and path.' },
  ],
};

const JOB = args.job || 'No job supplied';
const WORKSPACE = args.workspace || '.';
const ITEMS = Array.isArray(args.items) && args.items.length > 0 ? args.items : [JOB];
const REPORT_PATH = args.reportPath || 'templates/profile/skills/implement/reports/implement-checkpoint.html';
const LEDGER_PATH = args.ledgerPath || 'templates/profile/skills/implement/ledger/runs.jsonl';
const PASS_FLOOR = Number(args.passFloor || 85);
const MAX_CYCLES = Number(args.maxCycles || 3);

const TRIAGE_SCHEMA = {
  type: 'object',
  required: ['tier', 'rating', 'items'],
  properties: {
    tier: { type: 'string', enum: ['XS', 'S', 'M', 'L', 'XL', 'Super'] },
    rating: { type: 'number', minimum: 0, maximum: 100 },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'summary', 'lane', 'rating'],
        properties: {
          id: { type: 'string' },
          summary: { type: 'string' },
          lane: { type: 'string', enum: ['just-do-it', 'needs-reasoning'] },
          rationale: { type: 'string' },
          rating: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
    },
  },
};

const RESULT_SCHEMA = {
  type: 'object',
  required: ['id', 'status', 'rating', 'evidence'],
  properties: {
    id: { type: 'string' },
    status: { type: 'string', enum: ['PASS', 'FAIL', 'BLOCKED'] },
    rating: { type: 'number', minimum: 0, maximum: 100 },
    evidence: { type: 'string' },
    nextAction: { type: 'string' },
  },
};

const CHECKPOINT_SCHEMA = {
  type: 'object',
  required: ['status', 'aggregateRating', 'reportPath'],
  properties: {
    status: { type: 'string', enum: ['PASS', 'FAIL', 'BLOCKED'] },
    aggregateRating: { type: 'number', minimum: 0, maximum: 100 },
    reportPath: { type: 'string' },
  },
};

const result = await pipeline(
  async () => agent(
`Triage this implementation job into the smallest honest tier and two lanes.

Job:
${JOB}

Items:
${JSON.stringify(ITEMS, null, 2)}

Rules:
- Use XS/S/M/L/XL/Super.
- Put obvious low-risk edits in just-do-it.
- Put ambiguous or cross-cutting items in needs-reasoning.
- Rate each triage decision /100.
- Return only the schema.`,
    { phase: 'Triage', label: 'implement-triage', model: 'haiku', schema: TRIAGE_SCHEMA }
  ),

  async (triage) => {
    const items = Array.isArray(triage.items) ? triage.items : [];
    const implemented = await parallel(items.map((item) => () => agent(
`Implement item ${item.id} via headless Codex.

Workspace: ${WORKSPACE}
Lane: ${item.lane}
Summary: ${item.summary}
Rationale: ${item.rationale || 'n/a'}

Use this command shape for code cognition and edits:
node templates/profile/skills/implement/tools/codex-exec-adapter.mjs --cwd "${WORKSPACE}" --ledger "${LEDGER_PATH}" --label "implement:${item.id}" --prompt "<specific implement prompt requiring a /100 rating>"

For needs-reasoning items, first ask Codex for a compact plan with a /100 plan rating, then ask Codex to implement.
For just-do-it items, dispatch Codex directly.
Return PASS, FAIL, or BLOCKED with evidence and a /100 rating.`,
      { phase: 'Implement', label: `implement:${item.id}`, model: 'haiku', schema: RESULT_SCHEMA }
    )));
    return { triage, implemented };
  },

  async (state) => {
    let current = Array.isArray(state.implemented) ? state.implemented : [];
    for (let cycle = 1; cycle <= MAX_CYCLES; cycle += 1) {
      const weak = current.filter((item) => item.status !== 'PASS' || Number(item.rating || 0) < PASS_FLOOR);
      if (weak.length === 0) {
        break;
      }
      const repaired = await parallel(weak.map((item) => () => agent(
`Repair and re-verify implementation item ${item.id}.

Previous status: ${item.status}
Previous rating: ${item.rating}/100
Previous evidence: ${item.evidence}
Next action: ${item.nextAction || 'n/a'}

Use headless Codex through the implement adapter for real code cognition and verification.
Return an updated PASS, FAIL, or BLOCKED result with evidence and a /100 rating.`,
        { phase: 'Repair', label: `repair:${item.id}:cycle-${cycle}`, model: 'haiku', schema: RESULT_SCHEMA }
      )));
      current = current.map((item) => repaired.find((next) => next.id === item.id) || item);
    }

    const verified = await parallel(current.map((item) => () => agent(
`Independently verify this implementation result.

Workspace: ${WORKSPACE}
Item: ${item.id}
Status claimed: ${item.status}
Rating claimed: ${item.rating}/100
Evidence claimed: ${item.evidence}

Default to skeptical. Use headless Codex or local smoke commands to check the real files. If blocked, say BLOCKED and cap the rating below ${PASS_FLOOR}.
Return PASS, FAIL, or BLOCKED with verifier evidence and a /100 rating.`,
      { phase: 'Verify', label: `verify:${item.id}`, model: 'haiku', schema: RESULT_SCHEMA }
    )));

    return { ...state, implemented: current, verified };
  },

  async (state) => agent(
`Write the implement checkpoint HTML to ${REPORT_PATH}. Create parent directories if needed.

Include:
- tier and triage rating
- item table
- implementation ratings /100
- independent verifier ratings /100
- aggregate rating /100
- command and report evidence
- unresolved risks
- lessons worth appending to BEST-PRINCIPLES.html

Use the state below without re-analyzing unrelated scope:
${JSON.stringify(state, null, 2)}

Return only the schema object with status, aggregateRating, and reportPath.`,
    { phase: 'Checkpoint', label: 'write-implement-checkpoint', model: args.synthesisModel || 'opus', schema: CHECKPOINT_SCHEMA }
  )
);

return result;
