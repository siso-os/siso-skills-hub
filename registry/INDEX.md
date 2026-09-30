# Skill Registry

> Auto-generated from `skills_registry.json`. Do not edit manually.

## Categories

### code

| Skill | Description | Source |
|---|---|---|
| agent-builder | Create new agents from the SISO v3 agent template | bundled |
| agent-setup | Create new agent from V4 template with memory system pre-configured | bundled |
| analyze_task | Analyze a task and decompose into user stories | bundled |
| bounded-tool-output | Keep diagnostic results small and recover precisely from truncated logs, broad searches and oversized API responses. | bundled |
| component-review-gallery | Build a client-facing web gallery that shows several design options for one component using the client's real brand assets, and publishes it to a shareable URL they can open on a phone. | bundled |
| implement_story | Implement a single user story with tests | bundled |
| trace-to-regression | Convert observed agent failures into source-linked regression cases and scoped skill or harness corrections. | bundled |
| ui-iteration-round | Run one round of UI iteration on pages or widgets Shaan has seen: his words first, shots before at his ratio, at least five specified improvement ideas per item (his own first, additive, never removing what he picked), one coder, shots after, and a before/after page with Added / Changed / Kept bullets per item. | bundled |
| unified-code-search | Navigate a local codebase through native Serena symbol, reference, outline, and call-hierarchy queries. | bundled |

### communication

| Skill | Description | Source |
|---|---|---|
| agent-commander | Create workspaces, start agents, and communicate with them via CMUX | bundled |
| cli-runner | Run SISO CLI commands and interact with agents | bundled |
| meta-commander | Communicate with META agents in the SISO ecosystem | bundled |

### data

| Skill | Description | Source |
|---|---|---|
| multisearch | Run web, GitHub, and X searches in parallel for comprehensive research | bundled |
| websearch | Search the web using Perplexity Sonar via OpenRouter | bundled |
| xsearch | Search X (Twitter) for discussions, opinions, and latest updates | bundled |

### devops

| Skill | Description | Source |
|---|---|---|
| chat-on-steroids | Use an explicitly configured local Desktop MCP bridge for authorized browser work, with OS-consent gates and fresh window identities; no cookie extraction or automatic chat loops. | bundled |
| cmux | Terminal multiplexer for Claude Code with socket API for workspace control and browser automation | bundled |
| cmux-browser | Control CMUX browser for automated testing and browser interactions | bundled |
| contabo-vps | Connect to, provision and debug a Contabo VPS. Encodes the reinstall-is-the-fix rule and the host-key diagnosis. | bundled |
| github | Complete GitHub workflow for SISO codebase - branch, commit, push, merge | bundled |
| gitsearch | Search GitHub for code, repos, issues, and PRs | bundled |
| gls | Add reviewed Work, Release, Source Inventory and question metadata through the Library's schema and full verification gate. | bundled |
| publish | Publish a reviewed static directory or HTML file to an authorized public Cloudflare Pages project with exact readback and a caller handoff receipt. | bundled |
| siso-workspace | Use SISO Workspace MCP apps for machine metrics, permitted filesystem operations, shell/Python execution and durable remote jobs. | independent |
| vercel | Deploy SISO Internal Lab to Vercel | bundled |

### global

| Skill | Description | Source |
|---|---|---|
| classify-by-reading | Classify files from their content before assigning consequential current/stale/dead/duplicate/archive verdicts. | bundled |
| estate-keeper | Keep Shaan's laptop estate clean while working: look before making anything, put new things in their district, one command per move, keys and big files out of git, other agents' work untouched, and report messes to the Estate Manager's inbox. | bundled |
| jev-judgment | Optional intent, completion and progress checks; eligible model/skill/tool selection; bounded Camofox search/navigation; and shadow-only context relevance through the existing OpenRouter transport. | independent |
| laptop-health | Diagnose and fix a slow or overloaded MacBook with the laptop-health command: power and Low Power Mode first, then CPU speed, RAM, who makes the load, what keeps spawning processes, and leftover servers and browsers. Never kills agents. | bundled |
| os-database | Core Agent OS Database for telemetry, tasks, and timeline tracking | bundled |
| owner-handoff | Use the owning Playbook's preservation, cold-read and single-writer handoff gate. | bundled |
| owner-writeback | Persist owned material state and append an index pointer through the consuming project's existing adapter. | bundled |
| prove-before-claim | Verify live-state, completion, and changed-contract claims with the smallest applicable probe while reusing existing evidence. | bundled |
| skill-author | Author, register, validate and safely install one reviewed skill from its owning source. | bundled |
| skills-catalog | Locate the current skill or router for a capability without relying on a stale duplicated inventory. | bundled |
| skills-hub-usage | Navigate, discover, install, and use skills from the SISO Skills Hub | bundled |
| subagents | Spawn and manage parallel subagents for concurrent task execution | bundled |
| ui-pick | Rank the 137 curated UI components against a stated need in one ~1.5s parallel Jev call for $0.0006. Reads the curator's verbatim note as intent. Ranks only; design-lab decides by looking. | bundled |
| writeback | Append one material owner line to a repository log and mirror it to the existing Agent Zero ledger, with safe retries. | bundled |

### pipeline

| Skill | Description | Source |
|---|---|---|
| check_status | Check the current status of a pipeline run by reading progress files | bundled |
| create_progress | Initialize or update progress.md for a pipeline run | bundled |
| pass_to_next | Pass context to the next agent in the pipeline by writing output files | bundled |
| read_job_ticket | Read and validate a JobTicket JSON file from inbox | bundled |

### system

| Skill | Description | Source |
|---|---|---|
| pm-tasks | Simple PM task manager - create, list, update tasks | bundled |
| task-commander | Log tasks and communicate with agents using the SISO task database | bundled |
| task-manager | Full task pipeline system with steps, artifacts, and execution logging | bundled |
| workspace | Understand and navigate the SISO workspace | bundled |

### testing

| Skill | Description | Source |
|---|---|---|
| halo-batch-qa | Discover the HALO-owned two-pass error sweep and executable browser verification workflow. | bundled |
| playwright | Automated browser testing for SISO Internal Lab | bundled |
| verify_story | Verify a story implementation meets acceptance criteria | bundled |

---

**Total: 50 skills**

Use `python3 scripts/skills list`, `search <query>`, or `info <skill>` to explore.
