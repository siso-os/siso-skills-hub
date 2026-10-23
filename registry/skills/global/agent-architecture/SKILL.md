---
name: agent-architecture
description: "agent-architecture"
---

# agent-architecture

**Thesis.** A legible repo is one where a cold agent gets **O(1) orientation at every scope** — root, module, file — without grepping the whole tree. You get that two ways, and you need both: (1) **structures** — a domain-partitioned tree with stable addresses, explicit boundaries, a points-not-asserts router, and a volatility-sharded planning spine; and (2) **executable enforcement** — the layout is a *test/lint/gate*, not a doc, and the gate **only tightens** (ratchet the Δ, score 0–100, flip warn→error only at zero). Structure without enforcement rots back to mud; this pack ships both.

This file is the always-loaded entry. The bulk lives in three siblings it points to — load them on demand:
- **`playbook/PLAYBOOK.md`** — 15 SCENARIO→ACTION blocks + a decision table. *The "what do I do right now" manual.*
- **`adrs/`** — 18 ADRs + `INDEX.md`. *Why each decision, with evidence and the universal-vs-house honesty tag.*
- **`templates/`** — 9 copy-pasteable enforcement configs + `FILE-TREE.md` + `INDEX.md`. *The real `.cjs/.mjs/.json/.md` you drop into a repo.*

Evidence + full per-principle reasoning: `../../../Foundry/research/answers/GQ-001-agent-legible-architecture/answer/ANSWER.html` — graded **B+** (★★★ Fable pass 2026-07-02: prediction test scored, kill-list re-tried, enforcement decay measured live, frontier corroboration). Corroborated across 24 god-source repos in 4 languages + the AGENTS.md field standard; enforcement layer wired in production in `SISO_Agency/apps/oracle-streaming/` (partially retired since — see P18 note).

---

## When to load this skill

- Starting a new project / monorepo, or restructuring one.
- "Where does this file / domain / dependency go?"
- Wiring or fixing architecture enforcement (lint boundaries, structure score, ratchet, pre-commit chain).
- "Is the layout getting better or worse?" / scoring legibility / reviewing a repo's structure.
- Landing cold in an unfamiliar repo and needing the fastest orientation path.
- Writing `CLAUDE.md`, `FILE-TREE.md`, or the planning/state spine.
- `/architecture`.

---

## The 22 principles (one line each — honest about which layer)

**Be explicit about which layer you're invoking.** The universal layer is *law* (apply anywhere). The enforcement layer is the *breakthrough* (turns conventions into gates). The agent-ergonomics layer is a *house-bet* — high-payoff for agent-operated repos, **not universal** — say so when you apply it.

### Universal code-layout (corroborated across 24 god-source repos — apply anywhere)
- **P2** — CLAUDE.md *points*, never *asserts*: one destination per question; timeless inline, volatile in dated ledgers.
- **P3** — Shard the planning/state spine by **volatility** (immutable REQUIREMENTS vs volatile STATE); never one mega-doc.
- **P5** — One registry, no side-lists: every unit of work = one canonical id; the hub is a projection.
- **P6** — Single-writer spine: files are canonical, the DB is a mirror.
- **P8** — Append-don't-reorg; stable addresses; renames only via `describe→bridge→move` (outcome universal; the ritual is house).
- **P9 ★** — Partition the tree by **domain/feature, not technical layer**; every slice self-similar; cross-module access only via an explicit contract assembly.
- **P10 ★** — Make the layout **executable, not documentary**: architecture-as-test + import-boundary-as-lint + create-via-generator.
- **P11** — A named folder **is** the dependency boundary (directed-arrow: core depends on nothing; outer points inward).
- **P12** — Units declare an explicit **public export surface**; named deps (`@repo/*`), no relative `../` reach, no barrel index files.
- **P13** — Name-normalized ops entrypoints (`script/bootstrap|setup|test|server`) at the **same path in every repo**.
- **P23 ★** — **Nested per-directory orientation files, nearest-file-wins** (one AGENTS.md/CLAUDE.md per package, concatenated root→cwd). Now the dominant field convention (AGENTS.md standard, Linux-Foundation-governed; OpenAI's Codex repo ships 88 of them) — P1/P16 made fractal.
- **P24** — **One canonical rules source, symlink/import-bridged** across tools (AGENTS.md as SoT; CLAUDE.md/.cursor-rules symlink or `@import` to it). Diverging copies rot the second one exists — P5 extended cross-tool.
- **P14** — Two-bucket monorepo root (`apps/` deployables vs `packages/` libraries) + **one** task/build graph file.
- **P15** — Quarantine **derived/generated** code to its own sibling address; inherit shared config from a central rig.
- **P16** — Non-uniform fractal: local architecture matched to each unit's complexity + a maintained system map whose nodes **are** the folders.

### SISO agent-ergonomics (HOUSE-BET — valid for agent-operated repos, not universal law)
- **P1** — Self-orienting unit header. **Universal form = a terse machine `<context id/layer/status>{purpose,contract,agent-note}` block** compiled to a queryable `CODE-CONTEXT-GRAPH.json`, coverage-gated — **not** a narrative GOAL/TIMELINE prose header (0 of 24 repos do that).
- **P4** — Worktree-per-task **code** isolation; the merge is the verification gate.
- **P7** — A "what lives where" first-read map. Universal form = a hand-curated README tree; the lazy-generated `.siso-wiki` is the house innovation.

### Enforcement layer (P17–P22 — the breakthrough; fixes "enforcement is warn-only theater")
- **P17 ★★** — Anti-degradation **ratchet**: freeze each metric at today's number; new regressions reject, legacy debt passes; the bar only tightens. **Gate the Δ, not the absolute** → makes "keep it clean" enforceable on a messy repo day one.
- **P18 ★** — **Score the structure**: deterministic calibrated 0–100 legibility KPI, trended. ⚠ *Live status (2026-07-02): oracle RETIRED the score floor + filesOver250/godFiles ceilings (commit `9d1eca04`, argued ruling: "line-count cap ≠ quality signal"); score fell 71→54 un-gated. The score survives as read-only measurement. Lesson: see the FOURTH law below.*
- **P19** — Flip a rule warn→error **only at a zero violation count** (a too-eager hard gate → `--no-verify` → bypasses *all* gates).
- **P20** — Make the bad state **structurally impossible**: an existence-check gate, not another move ("a move is a state; a gate is an invariant").
- **P21** — Provenance gate on new deps: a new top-level dependency needs a one-line `dep-rationale` in the **same commit**.
- **P22** — No-orphan **liveness** gate on the ops/script layer (every script reachable or flagged; the known-orphan set only shrinks).

**Key nuances** (don't skip): boot layer = **Markdown** (CLAUDE/README/AGENTS/ARCHITECTURE/FILE-TREE); state/ledger/report layer = **HTML** — *not* blanket-HTML. **Detect-rot ≠ repair-rot**: cheap deterministic checks every commit; expensive LLM repairs surfaced-as-stale, never auto-run; a "proof" = commit + depends-on paths (truth is git-falsifiable). The hook **instruments its own `--no-verify` evasion**. **A plan is a HYPOTHESIS until it has a task id.**

---

## Decision table — situation → principle → action → template

| Situation | Principle(s) | First move | Template / ADR |
|---|---|---|---|
| Starting a new project | P14, P9, P13, P2, P3, P10, P17 | Two-bucket root + one task-graph file, `script/` ops layer, points-not-asserts CLAUDE.md, volatility-split spine, wire the ratchet at baseline=today **before** feature code | `FILE-TREE.md`, `CLAUDE.md`, `structure-ratchet.mjs` · ADR-001/008/017 |
| Where does this new file go? | P9, P11, P15 | By feature/domain not layer; derived code to its own sibling; respect the directed-arrow boundary | `FILE-TREE.md` · ADR-001/011 |
| Adding a new domain / feature | P9, P11, P12, P16 | New **vertical** slice, self-similar to siblings, explicit public export surface; local arch matched to complexity | `FILE-TREE.md`, `CONTEXT-BLOCK.template.ts` · ADR-001/017 |
| Adding a cross-module dependency | P11, P12, P9 | Only via the other module's **contract** assembly; named dep, no `../`, no barrel; core-depends-on-nothing | `.dependency-cruiser.cjs` · ADR-011/017 |
| Adding a 3rd-party dependency | P21 | One-line `dep-rationale: <pkg> — <why>` in the **same commit**, or it doesn't land | `dep-ratchet.mjs` · ADR-018 |
| Layout rule keeps getting violated | P10, P20, P11, P12 | Stop warning, start **failing the build/lint**; if it keeps regressing, make the bad state structurally impossible (existence gate) | `.dependency-cruiser.cjs`, `pre-commit.sh` · ADR-002/014 |
| Enforcement is warn-only theater / rot creeps back | P17, P18, P19, P22 | Ratchet (freeze metric), score 0–100 + trend, flip warn→error **only at zero**, no-orphan gate on ops | `structure-ratchet.mjs`, `structure-score.mjs`, `no-orphan-scripts.mjs` · ADR-003/004/005/018 |
| Renaming / moving code | P8, P20 | `describe → bridge → move` (stable addresses); if a path keeps coming back wrong, gate its existence | `pre-commit.sh` · ADR-014 |
| Writing docs | P2, P3, P7, nuance(MD) | Boot/doc layer = **Markdown**; one destination per question; timeless inline, volatile in dated ledgers; first-read map | `CLAUDE.md`, `FILE-TREE.md` · ADR-006/007/008/015 |
| A doc / derived file went stale | nuance(detect≠repair), P18 | Cheap deterministic detect every commit → write a red "I am stale + refresh cmd" banner **into** the file; never auto-run the repair | ADR-016 |
| Starting a task | P5, P1, P4, nuance(hypothesis) | One canonical task id **first** (a plan is a hypothesis until it has one); self-orienting header; worktree off fresh `origin/main` | `CONTEXT-BLOCK.template.ts` · ADR-010/012/013/015 |
| Two agents on one repo | P4, P6, P5, P8 | Worktree-per-task isolation; single-writer spine (files canonical, DB mirror); merge = verification gate; no side-lists | ADR-009/010/012 |
| Is the architecture getting better or worse? | P18, P17, P16 | Read the 0–100 score + trend; check ratchet baselines tightened not loosened; check the system map is current | `structure-score.mjs`, `structure-ratchet.mjs` · ADR-004/003 |
| Landing cold in an unfamiliar repo | P7, P2, P13, P1, P16 | First-read map → CLAUDE.md route table → `script/` to run it → unit headers as you descend → system map for the macro shape | `FILE-TREE.md`, `CLAUDE.md` · ADR-015/007/013 |

---

## How to use this pack

1. **Find your situation in the decision table above** → it names the principle(s), the first move, and the exact sibling file.
2. **Need the full "what to do, when"?** → `playbook/PLAYBOOK.md`. Find your scenario, do the ACTION, obey the DO/DON'T. Every action cites the `Pn` it implements.
3. **Need the *why* + the evidence + honest universal-vs-house tag?** → `adrs/INDEX.md`, then the specific ADR. Each one states plainly whether it's UNIVERSAL (24-repo corroborated) or SISO HOUSE-BET (oracle-wired, single integrated instance).
4. **Wiring enforcement into a real repo?** → `templates/INDEX.md` has the **drop-in order** (each step leaves the repo green). Short version: map + router first (`FILE-TREE.md`, `CLAUDE.md`, `CONTEXT-BLOCK.template.ts`) → `structure-score.mjs` + freeze the ratchet baseline at today → `.dependency-cruiser.cjs` (clean rules `error`, dirty rules `warn`) → `no-orphan-scripts.mjs` + `dep-ratchet.mjs` → chain it all in `pre-commit.sh`.

**The four laws that make enforcement not-theater** (read before changing any gate severity): **gate the Δ not the absolute (P17)** — freeze the number so only *new* regressions reject; **flip warn→error only at zero (P19)** — a hard-error on a dirty rule rejects every commit → forces `--no-verify` → bypasses *all* gates; **a move is a state, a gate is an invariant (P20)** — for any cleanup that keeps regressing, add an existence-check gate, don't just move it again; **ratchet the ratchet itself (Fable pass, OBSERVED failure)** — when a firing gate blocks a wave of work, the path of least resistance is deleting the *metric*, not fixing the debt (this actually happened: oracle retired its score floor under pressure, 2026-06-28). Removing any ceiling/floor must itself require a ledger entry + rationale in the same commit — metric retirement should leave a trace by construction, not by the luck of an honest committer.

**The honest residual (updated by the Fable pass, 2026-07-02 — answer now graded B+; universal layer A−).** The structures (universal layer) are right, externally corroborated, and now first-party-vendor-corroborated (AGENTS.md standard; Anthropic's own guidance states P2/P7 nearly verbatim). The *gates* (P17–P22) are the open frontier — and the live evidence says they're **decaying, not just unproven**: oracle retired its score floor four days after the answer praised it, and a killed typo-path scar physically re-emerged (both observed 2026-07-02). Second observed law: **structures propagate by parent-scope INHERITANCE, not habit** — the next SISO project authored ~1.5 of 6 predicted structures itself; everything else it got from its parent's router/spine. So when you spin up a new unit, explicitly wire it to the inherited router/map/spine — don't assume the conventions travel on their own. Two claims stay flagged as estimates, not facts: the HTML-vs-MD token cost and the "~50K tokens saved" first-read-map ROI. Apply the universal layer with confidence; apply the house-bets knowing they're bets; apply the gates knowing they need a guard on themselves (fourth law).
