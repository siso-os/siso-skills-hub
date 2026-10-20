# Skill Registry

> Auto-generated from `skills_registry.json`. Do not edit manually.

## Categories

### code

| Skill | Description | Source |
|---|---|---|
| add-module | Add a manifest-discovered Agent Base screen or independently served app using existing module, identity and lifecycle contracts. | bundled |
| agent-builder | Route bounded work through current Agent Zero ownership; retired template setup is not executed | bundled |
| agent-setup | Route bounded work through current Agent Zero ownership; retired template setup is not executed | bundled |
| agent-widgets | Publish bounded data-only agent widgets from explicit operational sources and verify same-data fallback migration. | bundled |
| analyze_task | Analyze a task and decompose into user stories | bundled |
| bounded-tool-output | Keep diagnostic results small and recover precisely from truncated logs, broad searches and oversized API responses. | bundled |
| component-review-gallery | Build a client-facing web gallery that shows several design options for one component using the client's real brand assets, and publishes it to a shareable URL they can open on a phone. | bundled |
| implement_story | Implement a single user story with tests | bundled |
| trace-to-regression | Convert observed agent failures into source-linked regression cases and scoped skill or harness corrections. | bundled |
| ui-bank | Shaan's curated UI component bank (21st.dev picks with his verbatim notes + 300 rubric-rated candidates), with per-project presets (operator, models-app, landing). Use BEFORE building any UI component or screen for the Oracle streaming operator dashboard, the Oracle models app, or any SISO product — "which component should I use for X", "is there a comp for a login/chart/notifications/leaderboard/calendar/chat input", "A/B these comps", "open the bank", or when Shaan pastes 21st.dev URLs with reactions. Entry points are brief.mjs and registry/curated/query.mjs in siso-ui-base. | bundled |
| ui-iteration-round | Run one round of UI iteration on pages or widgets Shaan has seen: his words first, shots before at his ratio, at least five specified improvement ideas per item (his own first, additive, never removing what he picked), one coder, shots after, and a before/after page with Added / Changed / Kept bullets per item. | bundled |
| verify_story | Verify a story implementation meets acceptance criteria | bundled |

### communication

| Skill | Description | Source |
|---|---|---|
| adhd-agent-output | The standard way every SISO agent writes to Shaan: next action first, numbered steps, state restated as X of Y, concrete time estimates, verified wins, at most 5 items, no preamble/recap/closers. | bundled |
| agent-commander | Create workspaces, start agents, and communicate with them via CMUX | bundled |
| task-commander | Log tasks and communicate with agents using the SISO task database | bundled |

### data

| Skill | Description | Source |
|---|---|---|
| client-pack | Build a bilingual client research pack (company, competitors with a page each, open source, APIs, build vs base, first principles, plan) as a SISO-landing-styled static site behind a per-client login at research.sisolabs.space, plus agent-readable JSON; reuse its components on other static sites. | independent |
| multisearch | Run web, GitHub, and X searches in parallel for comprehensive research | bundled |
| websearch | Search the web using Perplexity Sonar via OpenRouter | bundled |

### devops

| Skill | Description | Source |
|---|---|---|
| cmux | Terminal multiplexer for Claude Code with socket API for workspace control and browser automation | bundled |
| cmux-browser | Control CMUX browser for automated testing and browser interactions | bundled |
| contabo-vps | Connect to, provision and debug a Contabo VPS. Encodes the reinstall-is-the-fix rule and the host-key diagnosis. | bundled |
| github | Complete GitHub workflow for SISO codebase - branch, commit, push, merge | bundled |
| gitsearch | Search GitHub for code, repos, issues, and PRs | bundled |
| publish | Publish a reviewed static directory or HTML file to an authorized public Cloudflare Pages project with exact readback and a caller handoff receipt. | bundled |

### global

| Skill | Description | Source |
|---|---|---|
| classify-by-reading | Classify files from their content before assigning consequential current/stale/dead/duplicate/archive verdicts. | bundled |
| estate-keeper | Keep Shaan's laptop estate clean while working: look before making anything, put new things in their district, one command per move, keys and big files out of git, other agents' work untouched, update maps with estate refresh --maps-only at session end, and report messes to the Estate Manager's inbox. | bundled |
| haiku-deep-dive | Opus scopes a topic, 6 to 12 Haiku scouts each take one slice across laptop, GitHub, boxes and Shaan's words, and the Opus answers in one plain reply. | bundled |
| haiku-leverage | How an Opus seat uses Haiku 5.5 sub-agents as its arms and legs for reading, searching and checking. | bundled |
| haiku-team | Workflow-run Haiku teams: scouts per team report to a Haiku owner who merges; the caller gets one return per team, not one ping per Haiku. | bundled |
| jev-judgment | Optional intent, completion and progress checks; eligible model/skill/tool selection; bounded Camofox search/navigation; and shadow-only context relevance through the existing OpenRouter transport. | independent |
| laptop-health | Diagnose and fix a slow or overloaded MacBook with the laptop-health command: power and Low Power Mode first, then CPU speed, RAM, who makes the load, what keeps spawning processes, and leftover servers and browsers. Never kills agents. | bundled |
| machine-reach | Reach any SISO machine over ssh by the right alias, with fallbacks in order (Tailscale, home LAN, Cloudflare WARP) and a debug ladder when one is down. | bundled |
| prove-before-claim | Verify live-state, completion, and changed-contract claims with the smallest applicable probe while reusing existing evidence. | bundled |
| self-compact | A long-running Claude agent in a herdr pane checkpoints its state, tells Agent Zero, and arms a one-shot waiter that types /compact into its own pane once idle and then the resume prompt, so the seat carries on without anyone typing. | bundled |
| show-shots | Put screenshots (before/after, every state, laptop and phone) straight into Shaan's SISO Code chat as one html_render page above the reply, so he reviews by looking. | bundled |
| siso-ui | How any SISO agent builds or restyles UI: the surface's standard and kit first, Shaan's hub picks and rankings, house rules plus the 71 verified evidence rules, machine checks in every state at laptop and phone size, a fresh reviewer, numbered shots for Shaan, approved goldens. | bundled |
| skill-author | Author, register, validate and safely install one reviewed skill from its owning source. | bundled |
| skills-hub-usage | Navigate, discover, install, and use skills from the SISO Skills Hub | bundled |
| token-ledger | Answer where the Claude tokens went (seat, main vs sub-agents, model, top sessions, waste) from the TOKENS ledger script, not by reading transcripts. | bundled |
| ui-pick | Rank the 137 curated UI components against a stated need in one ~1.5s parallel Jev call for $0.0006. Reads the curator's verbatim note as intent. Ranks only; design-lab decides by looking. | bundled |

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
| task-manager | Full task pipeline system with steps, artifacts, and execution logging | bundled |
| workspace | Understand and navigate the SISO workspace | bundled |

### testing

| Skill | Description | Source |
|---|---|---|
| playwright | Automated browser testing for SISO Internal Lab | bundled |

---

**Total: 69 skills**

Use `python3 scripts/skills list`, `search <query>`, or `info <skill>` to explore.
