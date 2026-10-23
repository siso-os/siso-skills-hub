---
name: land
description: Use when landing checked work in sisodias/siso or diagnosing a red or missing siso-ci status; run the repository land command and preserve guard failures.
---

# Land checked work

Read the destination AGENTS.md and `git status --short`. Commit only the owned paths.
In sisodias/siso run `bin/land --prove` first, then `bin/land` from the repo root: prove runs the affected tests and stores per-command proofs; land rebases, verifies those proofs (a miss names the changed inputs and re-runs only that command), scans outgoing secrets and pushes in about 6 s.
The repository guard is authoritative. A refusal or timeout is evidence to preserve and repair within scope, never bypass.
For PR repositories, inspect `gh pr checks N --repo O/R` and the `siso-ci` commit status.
Read the failing status log; fix the named regression. Follow the repository's documented local-test alternative when CI is unavailable.
Report the final SHA and observed check result; branch creation or a clean syntax check does not prove landing.
