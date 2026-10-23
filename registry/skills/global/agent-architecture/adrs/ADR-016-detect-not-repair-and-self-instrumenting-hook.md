# ADR-016 — Detect rot ≠ repair rot; surface-as-stale; the hook instruments its own evasion

- **Principles:** Key enforcement nuances (detect≠repair, git-falsifiable proof, hook self-instrumentation)
- **Status:** ACCEPTED · **Classification: SISO HOUSE-BET, wired & proven in production** (enforcement-layer)
- **Layer:** Enforcement

## Context

Two failure modes haunt automated enforcement. First, **expensive repair on every commit**: if a hook tries to LLM-re-index or re-prove correctness on each commit, it is too slow and too costly to survive — the fleet disables it. Second, **the gate gets bypassed**: `git commit --no-verify` skips every hook, and crucially `git reflog` **cannot see** that `--no-verify` was used, so a bypass is invisible to ordinary auditing. An enforcement layer that can't detect its own circumvention is theater.

## Decision

Three rules:

1. **Detect rot ≠ repair rot, priced honestly.** Run only the **CHEAP deterministic tier** (git-diff, mtime, regex) on every commit. **NEVER auto-run** expensive repairs (LLM re-index, re-prove a go-live). Instead, the cheap tier writes a red **"I am stale — verify against the filesystem"** banner INTO the derived file and emits the literal refresh command. The expensive repair is *surfaced as stale*, never silently run.

2. **Make truth git-falsifiable.** A "proof" is a **commit + the `depends-on` paths**, so "is this still true?" reduces to "have those files changed since that commit?" — answerable by `git`, not by trust. (Composes with ADR-009 files-canonical.)

3. **The hook assumes it will be evaded and instruments for it.** Since reflog can't see `--no-verify`, the hook writes a **positive trace** of every vetted HEAD sha to `hook-trace.jsonl`, then **diffs reflog against the trace** — any commit with no trace entry is a detected bypass. The gate polices its own circumvention.

## Consequences

- Enforcement stays cheap enough to keep on (cheap tier every commit), so it doesn't get disabled for being slow.
- Stale derived artifacts announce themselves loudly and tell you the exact fix command, instead of silently lying — and they never get auto-repaired in a way you can't review.
- A `--no-verify` bypass becomes *detectable after the fact*, closing the hole that makes every other gate optional. This is what makes ADR-002/003/005 trustworthy rather than aspirational.
- Requires maintaining the trace file and the depends-on metadata — small ongoing cost for a large trust gain.

## When this applies

Any enforcement/pre-commit layer in an agent-operated repo. The detect≠repair split applies to every derived/generated artifact (maps, indexes, proofs). The self-instrumentation applies wherever `--no-verify` bypass is a real risk (i.e. wherever agents commit).

## Evidence

SISO HOUSE-BET, wired and live. Oracle's `build-spine.mjs` runs only the cheap tier and writes stale-banners; proofs are commit + depends-on paths (git-falsifiable); the hook writes `hook-trace.jsonl` and diffs reflog against it to catch `--no-verify` bypasses. Source: GQ-001 ANSWER.html, Oracle deep-wiring pass "The cleverest nuances." These are the nuances the answer notes "a generic answer would never reach."
