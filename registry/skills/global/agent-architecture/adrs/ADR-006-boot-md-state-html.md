# ADR-006 — Boot layer = Markdown; state/ledger/report layer = HTML

- **Principle:** Key nuance (the boot=MD / state=HTML split)
- **Status:** ACCEPTED · **Classification: SISO HOUSE-PREFERENCE** (the blanket "HTML beats MD for agents" claim was REFUTED; this scoped split is what survived)
- **Layer:** Cross-cutting / artifact format

## Context

SISO at one point asserted **HTML-for-agents over Markdown as a legibility GAIN** — that agents encode more structure into HTML and read it back more reliably, so machine artifacts should be HTML. The adversary KILLED the blanket form: it is an **unfalsified house preference**; LLMs read Markdown fine, and HTML costs tag-noise tokens on the hot path. The load-bearing half underneath it was never "HTML" — it was "**one append-only ledger per concern.**"

The reference implementation confirms the refutation and reveals the real, narrower rule. Oracle-streaming's boot and working layer — `.siso-wiki`, `.planning`, `fitness/`, `CLAUDE.md` — are **all Markdown**. HTML is reserved for human-facing dashboards and ledgers.

## Decision

Split by **what reads the file on the hot path**, not by "machine vs human":

- **Boot / orientation layer = Markdown.** `CLAUDE.md`, `README`, `AGENTS.md`, `ARCHITECTURE` — anything an agent reads to orient at session start. Markdown minimizes tag-noise tokens on the path agents traverse most. The compressed map, planning spine, and fitness configs are Markdown too.
- **State / ledger / report layer = HTML.** Persistent run logs, dated ledgers, dashboards, digests, registry/state views — artifacts that are *rendered and reviewed*, where richer structure pays off and the token cost is not on a hot boot path.

This is **NOT blanket-HTML.** The default for boot-time agent reading is Markdown.

## Consequences

- Agents land cold reading lean Markdown, not tag-heavy HTML — lower token cost where it matters most.
- Rendered state/reports keep the structural richness of HTML where a human (or a render step) consumes them.
- The honest caveat stays attached: the token-cost difference (HTML tag-noise vs MD) is **asserted, not measured** — this split is a reasoned house preference, and measuring HTML-vs-MD token cost is an open A-gate item.
- Note: this scoped split partially tensions with the workspace's general "HTML for machine artifacts" guidance. The reference implementation (oracle) follows the split above; treat the split as the refined rule for the boot/working layer specifically.

## When this applies

When choosing a format for a new doc: is it read by an agent to orient (→ Markdown) or rendered as persistent state/report (→ HTML)? When in doubt about a working/config file an agent reads frequently, default to Markdown.

## Evidence

SISO HOUSE-PREFERENCE. The blanket "HTML beats MD for agents" claim is in the adversary's KILLED list ("unfalsified house preference; LLMs read MD fine, HTML costs tag-noise tokens"). The scoped split is witnessed in oracle-streaming, which uses Markdown for `.siso-wiki`/`.planning`/fitness/`CLAUDE.md` and reserves HTML for human-facing dashboards/ledgers. Source: GQ-001 ANSWER.html, KILLED list + "Where Oracle REFUTES / differs" (boot=MD / state=HTML split).
