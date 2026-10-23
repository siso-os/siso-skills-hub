---
name: capability-router
description: Readable capability index for routing to tools, skills, and agents without loading full skill bodies.
---

# Capability Router

Readable index for routing to tools, skills, and agents without loading full skill bodies.

## When to use

Invoke this skill when the task needs a specialized capability and the exact tool, skill, or agent name is not obvious.

## Rule

Use the smallest direct tool first. Load a full skill body only after this index identifies a likely route.

## Core Tools

| Scenario | Route |
| --- | --- |
| Find files by name or glob | `Glob` |
| Search text, symbols, imports, config | `Grep` |
| Read exact file contents | `Read` |
| Patch existing files | `Edit` |
| Create or fully rewrite a file | `Write` |
| Run commands, tests, sqlite queries, curl, launchctl | `Bash` |
| Parallel codebase exploration or implementation | `Agent` |

## Skills By Job

| Job | Preferred route |
| --- | --- |
| Claude/settings/hooks/permissions/env vars | `Skill` -> `update-config` |
| Keyboard shortcuts | `Skill` -> `keybindings-help` |
| Reduce permission prompts | `Skill` -> `less-permission-prompts` |
| Claude API / Anthropic SDK work | `Skill` -> `claude-api` |
| Claude home-base ops | `Skill` -> `claude-ops` |
| Cancel OMC/autopilot/team modes | `Skill` -> `cancel` |
| Recurring/polling task | `Skill` -> `loop` |
| Session checkpointing | `Skill` -> `session-checkpoint` |
| Save a lesson from a correction | `Skill` -> `reflect` |
| GitHub CLI / PR / issue work | `Skill` -> `gh-cli` |
| Search GitHub examples | `Skill` -> `gitsearch` |
| Web research | `Skill` -> `websearch` |
| Sourcegraph/code search | `Skill` -> `sourcegraph` |
| SISO graph query | `Skill` -> `siso-graph` |
| SystemDB query | `Skill` -> `systemdb-query` |
| Build/query knowledge graphs | `Skill` -> `graphify` |
| LSP definitions/references/diagnostics | `Skill` -> `siso-lsp` |
| Project compressed indexes | `Skill` -> `siso-codex` |
| UI polish / frontend quality | `Skill` -> `impeccable` |
| Browser/page analysis | `Skill` -> `page-flow-analysis` |
| Deep page review | `Skill` -> `page-deep-dive` |
| Verify page analysis | `Skill` -> `page-deep-dive-verify` |
| Playwright/browser CLI | `Skill` -> `playwright-cli` |
| Code simplification/refactor cleanup | `Skill` -> `simplify` |
| Review current changes | `Skill` -> `review` |
| Security review | `Skill` -> `security-review` |
| Async Codex review | `Skill` -> `async-codex-review` |
| Token bloat dashboard/audit | `Skill` -> `token-optimizer:token-dashboard` |
| Token coaching | `Skill` -> `token-optimizer:token-coach` |
| Fleet token audit | `Skill` -> `token-optimizer:fleet-auditor` |
| Convex feature scaffold | `Skill` -> `convex-feature` |
| Run Spark/Codex route | `Skill` -> `run-spark` |
| OpenCLI/browser-to-tool work | `Skill` -> `opencli` |
| OMC reference / routing | `Skill` -> `omc-reference` |

## Agent Routes

| Job | Route |
| --- | --- |
| Fast codebase lookup | `Agent` with `Explore` |
| General multi-step research | `Agent` with `general-purpose` |
| Implementation planning | `Agent` with `planner` or `Plan` |
| Bounded implementation | `Agent` with `worker` |
| Verification | `Agent` with `verifier` |
| Second opinion / rescue | `Agent` with `codex:codex-rescue` |

## Notes

- Do not load full skill bodies just because the name appears relevant.
- If multiple routes match, pick the most direct route and avoid stacking skills.
- If the task is just reading/searching/editing local files, stay on core tools.
