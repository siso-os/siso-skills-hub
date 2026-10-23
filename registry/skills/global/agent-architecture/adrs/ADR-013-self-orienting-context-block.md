# ADR-013 — The self-orienting unit header (terse machine context block)

- **Principle:** P1
- **Status:** ACCEPTED (in its terse machine form) · **Classification: SISO HOUSE-PREFERENCE** — the NARRATIVE shape is REFUTED (0 of 24 repos); the machine-MANIFEST instinct under it is corroborated
- **Layer:** SISO agent-ergonomics (subtask scope)

## Context

The corpus's #1 waste is **re-deriving solved context every session** — an agent lands in a unit, has no idea what it is, what it depends on, or where its real state lives, and burns tokens reconstructing it. The original SISO fix was a generated **narrative header** in each unit: GOAL / FUNDAMENTALS / LOCATIONS-OF-TRUTH / CONTEXT-POINTERS / TIMELINE / LEARNINGS. It was named "the single strongest-verified, lowest-cost, highest-payoff layer."

But the external pass humbled the *shape*: **ZERO of 24 god-source repos** use a generated narrative GOAL/TIMELINE prose header in files. They get unit-legibility from naming conventions + mandatory directory skeletons + per-package manifests. The machine-readable-MANIFEST **instinct** is corroborated (Bazel's required per-dir BUILD file); the narrative prose SHAPE is ours and is not universal. Even oracle-streaming, our own reference, does NOT use the prose header.

## Decision

Adopt the self-orienting unit header in its **terse machine form**, not the narrative prose form:

- The universal-shaped artifact is a compact, queryable block: `<oracle-context id / layer / status>{ purpose, contract, agent-note }` at the unit/file level (oracle's `<oracle-context>` blocks).
- It is **coverage-gated** (oracle: ≥91% of src files must carry one) and **compiled to a queryable graph** (`CODE-CONTEXT-GRAPH.json`), so orientation is a lookup, not a read.
- LOCATIONS-OF-TRUTH stays as `file:line` pointers to where real state lives (composes with ADR-009 files-canonical).
- The narrative GOAL/FUNDAMENTALS/TIMELINE prose header is **dropped** as the file-level shape; that lineage belongs in the task spine (`task.json`), not stamped into source files.

## Consequences

- Cold pickup at the unit level becomes O(1 block read / 1 graph lookup) — the payoff survives intact; only the format changed from prose to a terse machine block.
- Coverage-gating makes the header an *invariant* (a file without a context block fails the gate, ADR-002), not a nice-to-have that decays.
- Honest scoping: this is a house bet on top of the universal naming-convention + manifest practice. The *value* (O(1) orientation) is corroborated; the specific `<oracle-context>` mechanism is SISO innovation.
- Don't force ceremony where the domain is trivial (ADR-016): a flat CRUD file gets a minimal block, not a full contract.

## When this applies

Agent-operated repos that want unit-level cold-orientation. Use the terse machine block, NOT the narrative prose header. For non-agent repos, the universal substitute is naming conventions + a per-package manifest + a mandatory directory skeleton.

## Evidence

SISO HOUSE-PREFERENCE (terse form), with the narrative form REFUTED. Corpus: "ZERO of 24 repos do [the narrative header]"; the manifest instinct corroborated by Bazel's per-dir BUILD file. Reference wiring: oracle's `<oracle-context>` blocks, ≥91% coverage-gated, compiled to `CODE-CONTEXT-GRAPH.json`; oracle explicitly does NOT use the prose header. Source: GQ-001 ANSWER.html, surviving principle #1, External Corpus Pass REFUTED (P1's specific form), Oracle deep-wiring pass (P1) + "Where Oracle REFUTES / differs."
