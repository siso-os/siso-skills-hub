/**
 * CONTEXT-BLOCK.template.ts — THE SELF-ORIENTING UNIT HEADER (terse machine form)
 * ============================================================================
 * ENFORCES: P1 (self-orienting unit header) — but in its UNIVERSAL, corroborated
 *           form: a TERSE MACHINE block of {purpose, contract, agent-note},
 *           NOT a narrative GOAL/FUNDAMENTALS/TIMELINE prose header. 0 of 24
 *           god-source repos do the prose header; the machine manifest instinct
 *           under it IS corroborated. This block is compiled to a queryable
 *           CODE-CONTEXT-GRAPH.json and COVERAGE-GATED (the structure-score
 *           context-coverage dimension counts files carrying one of these).
 *
 * WHAT IT BUYS: cold pickup of a single file is O(1 header read), not "read the
 * whole file + grep its callers". An agent about to edit a load-bearing file
 * reads this block first: what the file is FOR, the contract it must not break,
 * and the one thing not to do. This is the file-level analog of the CLAUDE.md
 * router and the FILE-TREE map.
 *
 * WHERE TO PUT IT: at the TOP of every LOAD-BEARING file (the ones the
 * context-coverage gate measures — your domain internals, contracts, main
 * services). Trivial leaf files don't need one (P16: don't force ceremony where
 * the domain is trivial). The coverage floor in structure-ratchet.json is what
 * makes "load-bearing files carry a block" enforceable, not aspirational.
 *
 * THE FORMAT — a single fenced block in a comment. Keep it TERSE (this is a
 * manifest, not an essay). Compile it with a tiny parser into the graph JSON.
 *
 * HOW TO ADAPT:
 *   - Pick ONE tag name and use it everywhere (the example below uses <context>;
 *     oracle uses <oracle-context>). The coverage gate greps for this exact tag.
 *   - id        : stable logical id of the unit (used to cross-link the graph).
 *   - layer     : which ring it lives in (core | contract | domain | app | ops).
 *   - status    : live | deprecated | experimental — drives the graph's health view.
 *   - purpose   : ONE line. What this unit is FOR.
 *   - contract  : the invariant callers depend on / this unit must not break.
 *   - agent-note: the single do-not / gotcha a future editor needs.
 *   - links     : file:line pointers to where REAL state lives (the LOCATIONS-OF-
 *                 TRUTH idea — point at source, don't restate it).
 */

// ──────────────────────────────────────────────────────────────────────────
// COPY THIS BLOCK to the top of a load-bearing file (adjust comment syntax per
// language). The coverage gate counts files that contain the opening tag.
// ──────────────────────────────────────────────────────────────────────────

/* <context
     id="billing/internal/Ledger"
     layer="domain"
     status="live">
   purpose:    Append-only money ledger for a tenant; the single writer of balance rows.
   contract:   Every mutation goes through postEntry(); callers NEVER write balance
               rows directly. Entries are immutable once posted (P8 append-don't-reorg).
   agent-note: Do NOT add a "correction" path that mutates a posted entry — reversals
               are NEW entries. Mutating history breaks audit + the no-cycle invariant.
   links:      schema      -> packages/contracts/billing.types.ts:14
               public api  -> packages/billing/contract/index.ts:1
               decision    -> .planning/DECISION-LOG.html#ledger-immutability
   </context> */

export const __CONTEXT_BLOCK_TEMPLATE__ = true // (delete in real files; this stub just keeps the template a valid TS module)

/*
 * ── The other-language forms (same fields, native comment syntax) ──
 *
 * Python / shell / yaml:
 *   # <context id="..." layer="..." status="live">
 *   # purpose:    ...
 *   # contract:   ...
 *   # agent-note: ...
 *   # links:      file:line
 *   # </context>
 *
 * Markdown / HTML doc (use a real HTML comment so it doesn't render):
 *   <!-- <context id="..." layer="..." status="live"> ... </context> -->
 *
 * ── The compile step (sketch) ──
 * A ~30-line parser greps every load-bearing file for the opening tag, extracts
 * the fields, and writes docs/CODE-CONTEXT-GRAPH.json:
 *   { "units": [ { "id","layer","status","purpose","contract","agentNote",
 *                  "links":[...], "file":"packages/billing/internal/Ledger.ts" } ] }
 * structure-score.mjs reads coverage = (files-with-block / load-bearing-files);
 * structure-ratchet.json floors that % so it can only rise (P17 + P1 coverage gate).
 */
