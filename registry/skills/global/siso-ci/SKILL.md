---
name: siso-ci
description: Our own CI, since GitHub Actions is off (billing; Shaan, 15 Oct "I don't want to do payments"). The Mac mini runs every open PR's tests in SISO Code, siso-harness-lab, Agent Base and Agent Zero and posts a `siso-ci` commit status. Use before merging any PR in those repos, when a PR shows red Actions checks ("not started because recent account payments have failed": ignore them), when siso-ci is red or missing, and when a repo needs its tests added to siso-ci.
---

# siso-ci

The merge rule (brain): merge on green `siso-ci`, or, where siso-ci does not cover the repo or is down, on a local
test run whose output you paste in the PR. Red GitHub Actions checks on sisodias repos are billing, not code: ignore
them. Never ask Shaan to fix billing (Shaan, 15 Oct: "Local test is fine").

| You want | Do |
|---|---|
| The verdict | `gh pr checks N --repo O/R` and read the `siso-ci` line (or `gh api repos/O/R/commits/SHA/status`) |
| It is pending | it runs within ~1 min of a push, one PR at a time; SISO Code ~5-15 min, others ~1-3 min. Wait in your turn |
| It is red | the status links a PR comment with the last 80 log lines; fix and push, it re-runs on the new SHA |
| Re-run a SHA | `ssh mac-mini-ts 'python3 ~/SISO_Workspace/SISO_Agents/siso-harness-lab/ci/siso-ci pr <repo> <N>'` |
| Add a repo or change its tests | edit `ci/repos.json` in siso-harness-lab by PR (`setup`, `test`, `mode`), or put a `.siso-ci` shell file in the repo itself |
| No status after 5 min | `ssh mac-mini-ts 'tail -20 ~/SISO_Workspace/_data/siso-ci/serve.log'`; merge on a local test run meanwhile |

`mode: new-failures` (siso-harness-lab, Agent Zero): those mains already have failing suites, so a head is green when
every failing test also fails on its base. SISO Code runs the tests related to the files the PR changed
(`vp test run --changed <base>`); Agent Base runs `services/node/test/check.mjs`.

Source: `siso-harness-lab/ci/siso-ci` (launchd `com.siso.ci` on the Mini, pulls main and restarts itself when it
changes). Self-hosted Actions runners also work on this account (proven 15 Oct) if a repo ever needs its own workflow.
