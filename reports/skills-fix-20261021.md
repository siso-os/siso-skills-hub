# Skills audit fixes — 21 October 2026

All ten ranked source fixes implemented in order. Laptop and Mini each have 78 full-file-verified projections installed with the Hub installer; changed projections and brain outputs were backed up first under `~/.claude/backups/skills-fix-20261021/`, with restorable manifest entries.

- Hub gate on Mini: `SKILLS_HUB_CHECK_OK (69 skills)`; 5 new installer regression tests and 51 existing judgment tests pass.
- Both machines: `compose-brain.mjs --check` passes, including the Codex router consumer check.
- Retired setup test: help, missing arguments, new target and collision preserve fixture state.
- UI pick source test: 138 curated picks read without a provider call.
- Preservation: all 18 removed source files match their archived bytes, including verified decryption of credential-bearing originals.
- Reviewed counts: global missing 10 to 0; registry missing 2 to 0; divergent research names 3 to 0; dormant names 0 to 359 (21 registered entries hidden from list/search). Other baseline duplicate candidates remain outside this scope, including HALO/Cam, which were untouched.

The original broad inventory is preserved in `_archive/2026-10-21-skills/audit-baseline/INDEX.json`. `build_audit_index.py` regenerates the current fix-scope index without rereading transcripts. `sync_audit_projections.py` provides an idempotent, backed-up refresh and writes the machine receipt outside git.

The Mini's orphaned Serena launcher references a missing interpreter. Brain source now prefers Serena when available and explicitly falls back to rg; the missing daemon was not reinstated.

Security follow-up: an old research helper contained a hardcoded OpenRouter credential. Preserved originals are age-encrypted; the identity stays in the laptop credential store. The credential was exposed during source reading and must be rotated; revocation was not performed in this audit. No plaintext credential is added by this change. No paid search, production deployment, HALO repo change or Cam skill change was performed.
