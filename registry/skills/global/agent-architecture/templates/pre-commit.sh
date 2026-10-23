#!/bin/sh
# pre-commit.sh — THE GATE CHAIN (executable-layout enforcement, wired)
# ============================================================================
# ENFORCES: P10 (make the layout EXECUTABLE not documentary — the rules run on
#           every commit), P19 (the warn-vs-hard-fail split: hard-error only
#           clean dimensions, warn+ratchet the dirty ones), and the meta-rule
#           that the hook instruments its own --no-verify evasion.
#
# INSTALL (point git at this hooks dir; ADAPT the path if you store it elsewhere):
#   cp pre-commit.sh .githooks/pre-commit && chmod +x .githooks/pre-commit
#   git config core.hooksPath .githooks
#
# THE ORDERING PRINCIPLE: cheapest + most-likely-to-fail first, so a bad commit
# dies fast. Each block guards its own existence (`[ -f ... ]`) so a partially
# adopted repo doesn't crash the hook — drop in gates incrementally.
#
# THE P19 SPLIT — read before changing any `|| exit 1` to `|| true` or back:
#   - `|| exit 1`  = BLOCKING. Use ONLY for a gate whose current violation count
#                    is 0 (dep-ratchet, no-double-nest existence checks, the
#                    structure-ratchet Δ-gate). A blocking gate that can fire on
#                    pre-existing debt teaches the fleet to run `--no-verify`,
#                    which bypasses EVERY gate at once. That is the failure this
#                    whole design exists to prevent.
#   - `|| true`    = WARN-ONLY. Use for a count/metric that is allowed to be
#                    nonzero today (branch counts, advisory lints). It must still
#                    PRINT loudly so regrowth is seen — silent warn is rot.
#   The structure-ratchet is the bridge: it BLOCKS, but only on the DELTA, so it
#   is safe to hard-fail even on a messy tree (P17).

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
ROOT="$(git rev-parse --show-toplevel)"

# --- 0. Trace this commit BEFORE the gates, to instrument --no-verify evasion ---
# WHY: `git reflog` cannot see a commit made with `--no-verify` (the hook never
# ran, so nothing recorded it). We can't stop --no-verify, but we can DETECT it:
# every commit that DID pass the hook writes its intended HEAD context to a trace
# log. A CI/audit job then diffs `git reflog` against this trace — any commit sha
# present in reflog but ABSENT from the trace was made with --no-verify. The hook
# polices its own circumvention. (The bad state isn't blocked here; it's made
# visible — a bypass leaves a hole in the trace that a later audit catches.)
TRACE="$ROOT/.gates/hook-trace.jsonl"
if [ -d "$ROOT/.gates" ]; then
  printf '{"at":"%s","branch":"%s","parent":"%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" \
    "$(git rev-parse HEAD 2>/dev/null)" >> "$TRACE"
fi

# --- 1. Spine / map freshness (cheap, deterministic; detect-rot != repair-rot) ---
# Regenerates the derived map/spine from source on every commit (the CHEAP tier
# only: git-diff, mtime, regex). Expensive repairs (LLM re-index) are NEVER run
# here — instead the cheap tier stamps a "I am stale, verify against the FS"
# banner into the derived file and prints the refresh command. BLOCKING: a
# failed regenerate means the committed map would be wrong.
if [ -f "$ROOT/scripts/build-spine.mjs" ]; then
  node "$ROOT/scripts/build-spine.mjs" || exit 1
fi

# --- 2. Import-boundary lint (P11) — depcruise runs the folder-is-boundary rules.
# Per-rule severity lives IN .dependency-cruiser.cjs (error on clean arrows, warn
# on the one with residual debt). depcruise's own exit code reflects 'error'
# rules only, so this line correctly blocks on a NEW boundary break while the
# 'warn' rule stays advisory (P19). BLOCKING.
if [ -f "$ROOT/.dependency-cruiser.cjs" ]; then
  npx --no-install depcruise src --config "$ROOT/.dependency-cruiser.cjs" || exit 1
fi

# --- 3. Structure ratchet (P17) — BLOCKS on the DELTA, not the absolute.
# Safe to hard-fail even on a messy tree: pre-existing debt passes, a NEW
# regression rejects. This is the gate that makes "keep it clean" enforceable
# on day one. BLOCKING.
if [ -f "$ROOT/fitness/structure-ratchet.mjs" ]; then
  node "$ROOT/fitness/structure-ratchet.mjs" || exit 1
fi

# --- 4. No-orphan liveness gate on the ops layer (P22) — BLOCKING on the delta.
# Every script must be reachable or in the known-orphan allowlist (which may only
# shrink). Dead ops code is the same legibility tax as a stale doc.
if [ -f "$ROOT/fitness/no-orphan-scripts.mjs" ]; then
  node "$ROOT/fitness/no-orphan-scripts.mjs" || exit 1
fi

# --- 5. Existence-invariant gates (P20) — make a recurring bad state IMPOSSIBLE.
# For any one-time cleanup that keeps regressing (scripts re-emit it, agents on
# stale bases re-create it), a gate that FAILS IF THE FORBIDDEN PATH EXISTS AT
# ALL. "A move is a state; a gate is an invariant." BLOCKING. Add one per scar.
if [ -f "$ROOT/fitness/no-forbidden-paths.mjs" ]; then
  node "$ROOT/fitness/no-forbidden-paths.mjs" || exit 1
fi

# --- 6. Branch-hygiene membrane — WARN-ONLY (a branch/worktree count is not what
# is being committed, so a ceiling breach must never block — but it must be SEEN
# or regrowth is silent). Prints loudly on regression; `|| true` keeps it
# non-blocking. Strict enforcement is an opt-in `--gate` exit in CI, not here.
if [ -f "$ROOT/scripts/branch-hygiene.mjs" ]; then
  node "$ROOT/scripts/branch-hygiene.mjs" --gate || true
fi

# --- 7. Dependency provenance ratchet (P21) — BLOCKING. A new top-level dep must
# carry a one-line dep-rationale in the same commit. Version bumps/removals pass
# free. Hard-fail from day one is safe (its starting violation count is 0, P19).
if [ -f "$ROOT/.gates/dep-ratchet.mjs" ]; then
  node "$ROOT/.gates/dep-ratchet.mjs" || exit 1
fi

exit 0
