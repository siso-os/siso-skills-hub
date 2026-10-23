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
| analyzing-video | Extract frames or scenes from a video with ffmpeg and analyse them in parallel. Use when a human shares a screen recording, Loom, or .mp4 to review. | library/works/unfuck-the-project/skills/analyzing-video |
| bounded-tool-output | Keep diagnostic results small and recover precisely from truncated logs, broad searches and oversized API responses. | bundled |
| component-review-gallery | Build a client-facing web gallery that shows several design options for one component using the client's real brand assets, and publishes it to a shareable URL they can open on a phone. | bundled |
| implement_story | Implement a single user story with tests | bundled |
| siso-owner | How to BE a SISO domain owner, and how to dispatch one. Load at the start of any owned task, and before spawning any agent. Use when you are given a domain, when a task says "you are the owner", or when you are about to write a brief for another agent. | apps/labs-server/skills/siso-owner |
| siso-plane-ops | Run SISO's Plane workspace (projects, work items, states, labels, assignees, cycles, modules, pages, views, comments) from the command line. Use whenever asked to create/list/update a project or task, check what SISO is working on, or wire an agent into the task system. | apps/labs-server/skills/siso-plane-ops |
| siso-project-front-door | Find where a SISO project's real code, tasks, docs and history live before doing any work. Use at the START of any task on a SISO project — especially Oracle Streaming — or when asked "where is X", "what repo is this", "what tasks exist", or when a repo's README or main branch seems to disagree with reality. | apps/labs-server/skills/siso-project-front-door |
| siso-project-page | Build or refresh a SISO project's front door — the one page that shows every repo, doc, app and layer of a project so an agent with no repo access can orient. Use when onboarding a project into the SISO workspace, when asked for a project hub/one-pager/front-end, or when a project's map has drifted from the code. | apps/labs-server/skills/siso-project-page |
| superapp-forge | Research an industry end-to-end and produce an open-source super-app blueprint — find the specific operator, map their working day, map the commercial tools that own each step, sweep GitHub wide for open-source replacements, then assemble the best of them into one coherent app design. Use when asked to research an industry, find what open source exists for a vertical, build an industry research pack, work out what a super-app for a profession would contain, or add an industry to the SISO industry index. Triggers — "research this industry", "super app for X", "what open source exists for", "industry pack", "industry index", "what do X use and what could replace it". | agency/factory/method/superapp-forge |
| trace-to-regression | Convert observed agent failures into source-linked regression cases and scoped skill or harness corrections. | bundled |
| ui-bank | Shaan's curated UI component bank (21st.dev picks with his verbatim notes + 300 rubric-rated candidates), with per-project presets (operator, models-app, landing). Use BEFORE building any UI component or screen for the Oracle streaming operator dashboard, the Oracle models app, or any SISO product — "which component should I use for X", "is there a comp for a login/chart/notifications/leaderboard/calendar/chat input", "A/B these comps", "open the bank", or when Shaan pastes 21st.dev URLs with reactions. Entry points are brief.mjs and registry/curated/query.mjs in siso-ui-base. | bundled |
| ui-iteration-round | Run one round of UI iteration on pages or widgets Shaan has seen: his words first, shots before at his ratio, at least five specified improvement ideas per item (his own first, additive, never removing what he picked), one coder, shots after, and a before/after page with Added / Changed / Kept bullets per item. | bundled |
| unified-code-search | Navigate a local codebase through native Serena symbol, reference, outline, and call-hierarchy queries. | bundled |
| verify_story | Verify a story implementation meets acceptance criteria | bundled |

### communication

| Skill | Description | Source |
|---|---|---|
| adhd-agent-output | The standard way every SISO agent writes to Shaan: next action first, numbered steps, state restated as X of Y, concrete time estimates, verified wins, at most 5 items, no preamble/recap/closers. | bundled |
| agent-commander | Create workspaces, start agents, and communicate with them via CMUX | bundled |
| cli-runner | Run SISO CLI commands and interact with agents | bundled |
| meta-commander | Communicate with META agents in the SISO ecosystem | bundled |
| task-commander | Log tasks and communicate with agents using the SISO task database | bundled |

### data

| Skill | Description | Source |
|---|---|---|
| client-pack | Build a bilingual client research pack (company, competitors with a page each, open source, APIs, build vs base, first principles, plan) as a SISO-landing-styled static site behind a per-client login at research.sisolabs.space, plus agent-readable JSON; reuse its components on other static sites. | independent |
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
| a0-dispatch | Use when sending a bounded job to an existing Agent Zero owner or seat; records the dispatch and arms the completion waiter. | agents/zero/.claude/skills/a0-dispatch |
| a0-upgrade | Use when any seat improves its own skills, tools or hooks: file it with a0-upgrade add --seat --area, hand the id to a background Haiku upgrader, which checks and ships it. | agents/skills/hub/registry/skills/global/a0-upgrade |
| ab-spec | Write an Agent Base build spec a builder can follow without asking: pack his words, surface history, ADRs and UI principles, code map, live data shapes, related work and ui-pick prior art, then write it from the template and fail it through speccheck before filing the ask. Use before handing any Agent Base build to an Astra or a worker. | bundled |
| adversary | Preserved Mini installed capability: adversary | bundled |
| agent-architecture | Preserved Mini installed capability: agent-architecture | bundled |
| agent-comms | Preserved Mini installed capability: agent-comms | bundled |
| agent-zero | Use when starting an Agent Zero session or deciding how to turn Shaan's request into checked, landed work across existing owners. | agents/zero/.claude/skills/agent-zero |
| agents-sdk | Preserved Mini installed capability: agents-sdk | bundled |
| ai-benchmarks | Preserved Mini installed capability: ai-benchmarks | bundled |
| ai-slop-cleaner | Preserved Mini installed capability: ai-slop-cleaner | bundled |
| async-codex-review | Preserved Mini installed capability: async-codex-review | bundled |
| bifrost-log-maintenance | Inspect, archive, verify, rotate, and bound Maxim Bifrost SQLite request logs without losing prompts, responses, tool calls, or training data. Use when logs.db is large, disk space is low, Bifrost log growth needs diagnosis, logs must be compressed or moved between the MacBook and Mac Mini, retention/object-storage settings are being considered, or recurring Bifrost log maintenance is requested. | bundled |
| brain | Preserved Mini installed capability: brain | bundled |
| bykonz-ui-bank-review | Design and review BykonzYard cards, heroes, community sections, and footers using the local SISO UI Base/21st.dev bank before changing production UI. Use when replacing hand-rolled comps, adapting new images, or building a component review preview for the BykonzYard React/Vite site. | bundled |
| camofox | Use when reading, navigating or taking screenshots of a web page headlessly through the local Camofox REST API without opening a browser on Shaan's screen. | bundled |
| cancel | Preserved Mini installed capability: cancel | bundled |
| capability-router | Preserved Mini installed capability: capability-router | bundled |
| chatgpt-deep-research | Preserved Mini installed capability: chatgpt-deep-research | bundled |
| checkmark | Preserved Mini installed capability: checkmark | bundled |
| classify-by-reading | Classify files from their content before assigning consequential current/stale/dead/duplicate/archive verdicts. | bundled |
| claude-mini | Preserved Mini installed capability: claude-mini | bundled |
| claude-ops | Preserved Mini installed capability: claude-ops | bundled |
| clone-website | Preserved Mini installed capability: clone-website | bundled |
| cloudflare | Preserved Mini installed capability: cloudflare | bundled |
| cloudflare-email-service | Preserved Mini installed capability: cloudflare-email-service | bundled |
| cloudflare-one | Preserved Mini installed capability: cloudflare-one | bundled |
| cloudflare-one-migrations | Preserved Mini installed capability: cloudflare-one-migrations | bundled |
| code-search-campaign | Preserved Mini installed capability: code-search-campaign | bundled |
| codex-companion | Preserved Mini installed capability: codex-companion | bundled |
| codex-computer-use | Control local apps through Computer Use (the @oai/sky runtime) inside the Codex app. Use when the session uses a custom (non-OpenAI) model, for example deepseek-v4-flash or mimo-v2.5, and the user asks to control the computer, operate a desktop app's UI, use Safari or Chrome through computer use, click or type in an app, or take a screenshot of an app. Prefer purpose-built connectors, APIs, or CLIs when they exist. | bundled |
| codex-dispatch | Preserved Mini installed capability: codex-dispatch | bundled |
| codex-in-app-browser | Drive the Codex in-app browser (open, navigate, click, type, screenshot, read page state) through the app's own node_repl runtime. Use when the session uses a custom (non-OpenAI) model, for example deepseek-v4-flash or mimo-v2.5, and the user asks to use the in-app browser, open or navigate a page in it, test a local app in a browser, or click, type, or take a screenshot in the Codex browser panel. | bundled |
| codex-router | Orientation for custom (non-OpenAI) models running in the Codex app through the codex-router proxy. Explains that the app's native tools arrive as flattened codex_app__ and mcp__ names, that the router restores them so the app executes them, which companion skills to read before threads, browser, or computer-use work, and that a turn with no tool call ends the task. Use when the session uses a custom (non-OpenAI) model, for example deepseek-v4-flash or mimo-v2.5, when codex_app__ or mcp__ tool names appear in the tool list, when a tool result just arrived and more work remains, or when thread, browser, or computer-use work is requested. | bundled |
| codex-router-media | Generate video, music, speech, or images with the operator's MiniMax Token Plan subscription through the codex-router media CLI. Use when the session runs a MiniMax custom (non-OpenAI) model (for example minimax-m3) with the MiniMax Token Plan provider connected, and the user explicitly asks to create a video, a song or music track, spoken audio, or an image. Do not use for reading or analyzing existing media. | bundled |
| codex-run | Use when dispatching an implementation job or coordinating parallel builders with disjoint files; resolve routing, run codex-run and integrate checked artifacts. | agents/skills/hub/registry/skills/global/codex-run |
| codex-subagent-orchestration | Preserved Mini installed capability: codex-subagent-orchestration | bundled |
| codex-subagent-routing | Preserved Mini installed capability: codex-subagent-routing | bundled |
| conduct | Preserved Mini installed capability: conduct | bundled |
| console | Show Shaan something or ask a decision without stopping work — post a card, mockup URL, HTML, or decision to the SISO console at http://127.0.0.1:8891 and receive the answer asynchronously. Use whenever you would otherwise paste a long result, a URL, or a question into the terminal. | bundled |
| context-relay | Preserved Mini installed capability: context-relay | bundled |
| convex-feature | Preserved Mini installed capability: convex-feature | bundled |
| dedup-primitive | Preserved Mini installed capability: dedup-primitive | bundled |
| deletion-pass | Use when simplifying a system or retiring duplicate code, skills, tests or jobs; inspect consumers, preserve an archive and verify the remaining path. | agents/zero/.claude/skills/deletion-pass |
| design-directions | Preserved Mini installed capability: design-directions | bundled |
| design-lab | Build a live, hosted, side-by-side comparison page so a human picks a UI/design direction by LOOKING at rendered options instead of reading names or prose. Use whenever there is a choice between UI options, layouts, components, shells, themes or variants; whenever asked to "redesign"/"improve"/"clean up" a page; whenever about to describe a design change in words or build one version and hope; and whenever offering components from a scraped corpus. Renders real component source live (server-side Sucrase, no build step), uses the real app's data, shows honest failure cards for whatever cannot render, and ends with a URL that has been verified in a headless browser. | bundled |
| disk-cleanup | Preserved Mini installed capability: disk-cleanup | bundled |
| dispatch | Preserved Mini installed capability: dispatch | bundled |
| durable-objects | Preserved Mini installed capability: durable-objects | bundled |
| estate-keeper | Keep Shaan's laptop estate clean while working: look before making anything, put new things in their district, one command per move, keys and big files out of git, other agents' work untouched, update maps with estate refresh --maps-only at session end, and report messes to the Estate Manager's inbox. | bundled |
| falsifiable-investigation | Preserved Mini installed capability: falsifiable-investigation | bundled |
| fan-out | Preserved Mini installed capability: fan-out | bundled |
| fast-build-loop | How a product owner (one Opus integrator) drives up to 12 Sol builders to finish a product fast - lanes, a 20-minute merge train, deploy the last green SHA, bisect a red head, affected tests, builders prove before merging, minutes lost per stage. Load it when you own a product and have more than three rows to ship. | bundled |
| firecrawl | Preserved Mini installed capability: firecrawl | bundled |
| firecrawl-agent | Preserved Mini installed capability: firecrawl-agent | bundled |
| firecrawl-crawl | Preserved Mini installed capability: firecrawl-crawl | bundled |
| firecrawl-download | Preserved Mini installed capability: firecrawl-download | bundled |
| firecrawl-instruct | Preserved Mini installed capability: firecrawl-instruct | bundled |
| firecrawl-map | Preserved Mini installed capability: firecrawl-map | bundled |
| firecrawl-scrape | Preserved Mini installed capability: firecrawl-scrape | bundled |
| firecrawl-search | Preserved Mini installed capability: firecrawl-search | bundled |
| fleet-check | Use when asking what agents are doing, which seat is stuck or why a run stopped; run fleet-check for current evidence before reading transcripts. | bundled |
| flywheel | Preserved Mini installed capability: flywheel | bundled |
| forge-skill | Preserved Mini installed capability: forge-skill | bundled |
| foundry-corpus | Query the Foundry information organ (repos, transcripts, insights, people) with the foundry CLI. Use when a question needs prior research or who-said-what evidence. | bundled |
| gh-cli | Preserved Mini installed capability: gh-cli | bundled |
| graphify | Preserved Mini installed capability: graphify | bundled |
| haiku-deep-dive | Opus scopes a topic, 6 to 12 Haiku scouts each take one slice across laptop, GitHub, boxes and Shaan's words, and the Opus answers in one plain reply. | bundled |
| haiku-dispatch | Preserved Mini installed capability: haiku-dispatch | bundled |
| haiku-leverage | How an Opus seat uses Haiku 5.5 sub-agents as its arms and legs for reading, searching and checking. | bundled |
| haiku-team | Use when research, audits, maps or independent build jobs need a Haiku team or parallel builders; split bounded slices and integrate one checked return. | bundled |
| headroom | Preserved Mini installed capability: headroom | bundled |
| herdr | Preserved Mini installed capability: herdr | bundled |
| higgsfield-brandkit | Preserved installed capability: higgsfield-brandkit | bundled |
| higgsfield-generate | Preserved installed capability: higgsfield-generate | bundled |
| higgsfield-marketplace-cards | Preserved installed capability: higgsfield-marketplace-cards | bundled |
| higgsfield-product-photoshoot | Preserved installed capability: higgsfield-product-photoshoot | bundled |
| higgsfield-soul-id | Preserved installed capability: higgsfield-soul-id | bundled |
| higgsfield-video-explainer | Preserved installed capability: higgsfield-video-explainer | bundled |
| higgsfield-websites | Preserved installed capability: higgsfield-websites | bundled |
| higgsfield-youtube-thumbnail | Preserved installed capability: higgsfield-youtube-thumbnail | bundled |
| hub-research | V1 research skill for an Opus seat that needs to map its whole domain (~80% of what exists) cheaply. One Opus plans and judges; about 15 Haiku sub-agents (researcher, checker) search and read; scripts sweep GitHub and merge. Ends with a map of the domain, what we are heavy and light on, the top picks with reasons, and UI references to steal. Use when a hub seat (AGENTS-HUB, SISO-BENCH, SISO-VOICE, UI-HUB, ...) is asked to research its domain, or any "find everything that exists about X" job bigger than a few searches. | bundled |
| implement | Preserved Mini installed capability: implement | bundled |
| improve-agent-system | Preserved Mini installed capability: improve-agent-system | bundled |
| insights-ask | Preserved Mini installed capability: insights-ask | bundled |
| iso | Preserved Mini installed capability: iso | bundled |
| jev-judgment | Optional intent, completion and progress checks; eligible model/skill/tool selection; bounded Camofox search/navigation; and shadow-only context relevance through the existing OpenRouter transport. | independent |
| job-brief | Use when compiling a request into a builder job with quoted intent, owned files, constraints and one executable acceptance check. | agents/zero/.claude/skills/job-brief |
| land | Use when landing checked work in sisodias/siso or diagnosing a red or missing siso-ci status; run the repository land command and preserve guard failures. | agents/skills/hub/registry/skills/global/land |
| laptop-health | Diagnose and fix a slow or overloaded MacBook with the laptop-health command: power and Low Power Mode first, then CPU speed, RAM, who makes the load, what keeps spawning processes, and leftover servers and browsers. Never kills agents. | bundled |
| legibility-floor | Preserved Mini installed capability: legibility-floor | bundled |
| lesson | Preserved Mini installed capability: lesson | bundled |
| librarian | Use when finding an existing repo, tool, skill, prior decision or research before building; search recall and estate where, then return exact source paths. | agents/skills/hub/registry/skills/global/librarian |
| librarian-loop | Preserved Mini installed capability: librarian-loop | bundled |
| living-asset | Design and build a premium, alive, state-driven UI asset that feels 3D (a mascot face, assistant orb, status character, animated logo) as one SVG + CSS engine driven by data attributes. Use when asked to design a character or face for an app, to "make it cooler / more alive / more 3D / more premium", to give an AI assistant a look across several apps, or to replace clip-art state icons. Carries the method, the craft toolkit, the checks and a working reference engine (Halo, 1 Oct 2026, five rounds Shaan approved). | bundled |
| look | Use when Agent Zero needs current queue and seat status or must wait for dispatched work; wraps look, a0-await and waitfor without manual polling. | agents/skills/hub/registry/skills/global/look |
| mac-mini-herdr-control | Control Shaan's Mac Mini from the MacBook through the primary Cloudflare WARP private route or legacy Tailscale fallback, using SSH and Herdr. Use for Mac Mini access, remote agents, Herdr, syncing, deployment preparation, and connectivity recovery. | bundled |
| machine-reach | Use when connecting to the Mac mini or a SISO VPS, or diagnosing SSH reachability; resolve the current alias and try documented routes in order. | bundled |
| melanotresses-client-ops | Safely maintain, verify, host, and hand off the MelanoTresses client site. Use for client feedback triage, approved-content updates, Cloudflare Pages preview/domain work, Groq chat configuration, booking handoffs, and reusable module maintenance in the MelanoTresses repo. | bundled |
| model-routing | Preserved Mini installed capability: model-routing | bundled |
| omc-reference | Preserved Mini installed capability: omc-reference | bundled |
| opencli | Preserved Mini installed capability: opencli | bundled |
| oracle-checkpoint | Preserved Mini installed capability: oracle-checkpoint | bundled |
| oracle-loop-manager | Preserved Mini installed capability: oracle-loop-manager | bundled |
| orchestrate | Preserved Mini installed capability: orchestrate | bundled |
| orchestration-playbook | Preserved Mini installed capability: orchestration-playbook | bundled |
| os-database | Core Agent OS Database for telemetry, tasks, and timeline tracking | bundled |
| owner-handoff | Use the owning Playbook's preservation, cold-read and single-writer handoff gate. | bundled |
| owner-writeback | Persist owned material state and append an index pointer through the consuming project's existing adapter. | bundled |
| page-deep-dive | Preserved Mini installed capability: page-deep-dive | bundled |
| page-deep-dive-verify | Preserved Mini installed capability: page-deep-dive-verify | bundled |
| page-flow-analysis | Preserved Mini installed capability: page-flow-analysis | bundled |
| pb-codenav | Preserved Mini installed capability: pb-codenav | bundled |
| pb-frontend | Preserved Mini installed capability: pb-frontend | bundled |
| pb-orchestration | Preserved Mini installed capability: pb-orchestration | bundled |
| pb-research | Preserved Mini installed capability: pb-research | bundled |
| pb-system | Preserved Mini installed capability: pb-system | bundled |
| pb-verification | Preserved Mini installed capability: pb-verification | bundled |
| pi-dispatch | Preserved Mini installed capability: pi-dispatch | bundled |
| pi-fleet | Preserved Mini installed capability: pi-fleet | bundled |
| playwright-cli | Preserved Mini installed capability: playwright-cli | bundled |
| ponytail | Find existing repo, estate and research, then GitHub work before writing the minimum missing code. | independent |
| preflight-lessons | Preserved Mini installed capability: preflight-lessons | bundled |
| property-engine | Run the prop CLI for the UK house search (listings, scoring, shortlist). Use only when Shaan asks about the property search. | bundled |
| prove-before-claim | Verify live-state, completion, and changed-contract claims with the smallest applicable probe while reusing existing evidence. | bundled |
| prove-model-routing | Prove the provider and model that served a request from the gateway's read-only request log; use when runtime labels or fallback warnings are ambiguous. | bundled |
| reflect | Preserved Mini installed capability: reflect | bundled |
| research-first | Use when about to build, design or decide anything non-trivial: fan out Haiku scouts over the estate, GitHub, top companies, open data and free asset libraries, then build only the gap. | bundled |
| research-fleet | Use when a research question needs independent slices and one evidence-backed synthesis from an Agent Zero fleet. | agents/zero/.claude/skills/research-fleet |
| run-spark | Preserved Mini installed capability: run-spark | bundled |
| runtime-reminders | Preserved Mini installed capability: runtime-reminders | bundled |
| safe-prompt-rewriter | Preserved Mini installed capability: safe-prompt-rewriter | bundled |
| sandbox-migrate-to-next | Preserved Mini installed capability: sandbox-migrate-to-next | bundled |
| sandbox-next | Preserved Mini installed capability: sandbox-next | bundled |
| sandbox-stable | Preserved Mini installed capability: sandbox-stable | bundled |
| seat-launch | Start a named Claude seat (an owner agent Shaan talks to) so it shows in Agent Base's side nav, in the right group, already working on its brief. Use whenever you spawn or relaunch an owner agent in herdr. | bundled |
| self-compact | Use when context is filling, a compaction ping arrives or Shaan requests a checkpoint; save state and arm self-compact at a clean break. Agent Zero follows its own compaction rule. | bundled |
| session-checkpoint | Preserved Mini installed capability: session-checkpoint | bundled |
| shaan-report | Use when returning a deliverable to Shaan; lead with his next action, then verified changes, evidence and remaining limits. | agents/zero/.claude/skills/shaan-report |
| show-page | Use when showing Shaan a page, screenshot comparison or UI result; inspect the artifact, then return a real show-page URL or supported inline screenshot view. | agents/skills/hub/registry/skills/global/show-page |
| show-shots | Put screenshots (before/after, every state, laptop and phone) straight into Shaan's SISO Code chat as one html_render page above the reply, so he reviews by looking. | bundled |
| siso-capabilities | Preserved Mini installed capability: siso-capabilities | bundled |
| siso-ci | Our own CI, since GitHub Actions is off (billing; Shaan, 15 Oct "I don't want to do payments"). The Mac mini runs every open PR's tests in SISO Code, siso-harness-lab, Agent Base and Agent Zero and posts a `siso-ci` commit status. Use before merging any PR in those repos, when a PR shows red Actions checks ("not started because recent account payments have failed": ignore them), when siso-ci is red or missing, and when a repo needs its tests added to siso-ci. | bundled |
| siso-codex | Preserved Mini installed capability: siso-codex | bundled |
| siso-credentials | Where every SISO credential lives — VPS SSH, Cloudflare, GitHub, the Plane database. Use before asking the user for a token, password or host, and before storing a new secret. | bundled |
| siso-graph | Preserved Mini installed capability: siso-graph | bundled |
| siso-lsp | Preserved Mini installed capability: siso-lsp | bundled |
| siso-ui | Use when building or restyling a SISO screen or component; start with the surface standard and Shaan's curated UI picks, then inspect rendered results. | bundled |
| siso-work | Claim your task and check in on the Work page Shaan reads (sisolabs.space/agents). Use whenever you work on a SISO project that has a Work page (HALO Streaming, HALO CRM, SISO Internal Labs, Agent stack, Organise). Run `siso-work show` when you start; claim a task before you begin it; post a one-line check-in at each milestone and at least every 20 minutes of work; mark it done with a note when it is finished. | bundled |
| skill | Preserved Mini installed capability: skill | bundled |
| skill-author | Use when any agent adds, edits, registers or installs a skill; reuse the Hub source, write trigger cases first, validate and verify the installed files. | bundled |
| skills-catalog | Locate the current skill or router for a capability without relying on a stale duplicated inventory. | bundled |
| skills-home-check | Verify shared global skill loading. | bundled |
| skills-hub-usage | Navigate, discover, install, and use skills from the SISO Skills Hub | bundled |
| source-reference | Preserved Mini installed capability: source-reference | bundled |
| sourcegraph | Preserved Mini installed capability: sourcegraph | bundled |
| subagents | Spawn and manage parallel subagents for concurrent task execution | bundled |
| systemdb-query | Preserved Mini installed capability: systemdb-query | bundled |
| task | Preserved Mini installed capability: task | bundled |
| telemetry | Preserved Mini installed capability: telemetry | bundled |
| token-ledger | Use when asking where Claude tokens or spend went by seat, model, login or time window; run token-ledger and report measured totals and coverage. | bundled |
| turnstile-spin | Preserved Mini installed capability: turnstile-spin | bundled |
| ui-pick | Rank the 137 curated UI components against a stated need in one ~1.5s parallel Jev call for $0.0006. Reads the curator's verbatim note as intent. Ranks only; design-lab decides by looking. | bundled |
| ui-science | Preserved Mini installed capability: ui-science | bundled |
| verifiable-frontend | Preserved Mini installed capability: verifiable-frontend | bundled |
| verify-surface | Preserved Mini installed capability: verify-surface | bundled |
| web-perf | Preserved Mini installed capability: web-perf | bundled |
| workers-best-practices | Preserved Mini installed capability: workers-best-practices | bundled |
| world-class-research | Take any domain from zero to a world-class grasp, cheaply. That means every library, site, tool, person and paper in the domain, plus the neighbouring sub-domains that add complementary data: ~80% of everything alive, global and good, by numbers and by quality. Successor to hub-research (v1). One Opus plans and judges; about 15 Haiku sub-agents (researcher, checker) search and read; scripts sweep GitHub and merge. Ends with a map of the domain, what we are heavy and light on, the top picks with reasons, and UI references to steal. Use when a hub seat (AGENTS-HUB, SISO-BENCH, SISO-VOICE, UI-HUB, ...) is asked to research its domain, or any "find everything that exists about X" job bigger than a few searches. | bundled |
| wrangler | Preserved Mini installed capability: wrangler | bundled |
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
| task-manager | Full task pipeline system with steps, artifacts, and execution logging | bundled |
| workspace | Understand and navigate the SISO workspace | bundled |

### testing

| Skill | Description | Source |
|---|---|---|
| halo-batch-qa | Discover the HALO-owned two-pass error sweep and executable browser verification workflow. | bundled |
| playwright | Automated browser testing for SISO Internal Lab | bundled |

---

**Total: 217 skills**

Use `python3 scripts/skills list`, `search <query>`, or `info <skill>` to explore.
