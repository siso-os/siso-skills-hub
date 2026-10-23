---
name: claude-mini
description: Use MiniMax-backed Claude Code from Codex for split compute. Trigger when the user asks to spawn Claude Mini, MiniMax agents, Herdr Claude Code tabs, cheap Haiku workers, headless MiniMax Claude jobs, or Claude Code background-agent/goal sessions from Codex.
---

# Claude Mini Split Compute

Use this when Codex should offload work to MiniMax-backed Claude Code.

`claude-mini` is the launcher:

```bash
claude-mini
```

It opens real Claude Code CLI with `--model haiku`. Bifrost routes that Haiku alias to:

- provider: `Minimax`
- model: `MiniMax-M2.7-highspeed`
- key: `Minimax $80`
- routing rule: `MiniMax Workers (Haiku Alias)`

## Efficient Use Policy

Codex stays the orchestrator. Claude Mini workers are split-compute lanes for bounded independent work.

Use Claude Mini for:

- Parallel repo reconnaissance: "inspect A/B/C and report facts."
- Independent bug hypotheses: one worker per hypothesis or subsystem.
- Verification passes: ask workers to reproduce, run tests, review a diff, or search for regressions.
- Cheap summarization of large but bounded logs/files.
- Background jobs that can keep running while Codex implements.

Do not use Claude Mini for:

- Tiny tasks Codex can finish faster than spawning a worker.
- Shared edits to the same files from multiple workers.
- Final merge decisions, destructive commands, credentials, or production operations.
- Vague "go improve this" prompts. Workers need a narrow target.

Default routing:

| Need | Mode |
|---|---|
| User wants to see the agent | interactive Herdr tab |
| Multiple background tasks/goals | `claude-mini agents` |
| One bounded answer only | headless `claude-mini -p` |
| Long task with tools/context | interactive tab or background-agent UI |
| Parallel verification | 2-4 headless jobs or background agents |

Fan-out limits:

- Default to 2-3 workers.
- Use 4-5 only for clearly independent search/review tasks.
- Do not exceed 5 without Shaan explicitly asking for a swarm.
- Prefer one warm `claude-mini agents` tab for many background tasks instead of repeatedly launching new full Claude Code sessions.

Aggregation rule:

Codex must read worker outputs, compare evidence, resolve conflicts, and make the final call. Do not pass worker output through unexamined.

## Modes

### Interactive Herdr Agent

Use when the user wants to see or manage the worker, or when the worker needs Claude Code's normal interactive loop.

```bash
~/.codex/skills/claude-mini/scripts/spawn-herdr-claude-mini.sh \
  --cwd /absolute/project/root \
  --label "Claude Mini"
```

This creates a new Herdr tab in the focused workspace and runs:

```bash
cd /absolute/project/root && claude-mini
```

Then send the task to the returned pane:

```bash
herdr pane run "$PANE_ID" '<worker task>'
```

Use a completion marker such as `===TASK_COMPLETE===` and monitor with:

```bash
herdr wait output "$PANE_ID" --match "===TASK_COMPLETE===" --timeout 600000
herdr pane read "$PANE_ID" --source recent-unwrapped --lines 160
```

### Claude Code Background-Agent UI

Use when the worker should manage Claude Code background sessions/goals.

```bash
~/.codex/skills/claude-mini/scripts/spawn-herdr-claude-mini.sh \
  --cwd /absolute/project/root \
  --label "Claude Mini Agents" \
  --agents
```

This runs:

```bash
cd /absolute/project/root && claude-mini agents
```

### Headless MiniMax Job

Use for cheap bounded checks, research, summaries, or verification where Codex only needs the final text.

```bash
cd /absolute/project/root
claude-mini -p 'Reply with the smallest safe fix for ...'
```

Headless jobs are useful, but do not use them when the user asked for visible Herdr agents, Claude Code goals, or an interactive worker.

For parallel headless checks, run independent commands in parallel and keep outputs separate:

```bash
(cd "$PROJECT_ROOT" && claude-mini -p 'Inspect auth tests only. Finish with AUTH_DONE.') > /tmp/auth-worker.txt &
(cd "$PROJECT_ROOT" && claude-mini -p 'Inspect API routes only. Finish with API_DONE.') > /tmp/api-worker.txt &
wait
```

Then Codex reads `/tmp/*-worker.txt`, checks Bifrost logs if routing matters, and decides.

## Worker Prompt Contract

Give each worker:

- `PROJECT_ROOT=/absolute/path`
- One bounded goal
- What it may inspect
- What it may edit, if anything
- Verification command or evidence expected
- Final marker: `===TASK_COMPLETE===`

Example:

```text
PROJECT_ROOT=~/SISO_Workspace/SISO_Agency/apps/isso-dashboard

Goal: inspect why Hub Approvals tests fail. Do not edit files.
Scope: package scripts, relevant tests, and failing logs only.
Return: root cause, exact files/lines, smallest recommended fix.
Finish with ===TASK_COMPLETE===.
```

Prompt shape for parallel diagnosis:

```text
PROJECT_ROOT=/absolute/path

Role: verifier. Do not edit files.
Question: Is hypothesis H true for subsystem X?
Scope: only paths A, B, C.
Commands allowed: read/search/test commands only.
Return: PASS/FAIL/UNCERTAIN, evidence with file:line refs, commands run.
Finish with ===TASK_COMPLETE===.
```

Prompt shape for implementation workers:

```text
PROJECT_ROOT=/absolute/path

Goal: implement exactly <bounded change>.
Edit scope: only <files/dirs>.
Do not touch unrelated formatting.
Verify with: <command>.
Return: changed files, verification output, remaining risk.
Finish with ===TASK_COMPLETE===.
```

Only one implementation worker should own a file set. If two workers need the same file, Codex should serialize them or do the edit itself.

## Verify Routing

After a new launcher or route change, verify with:

```bash
sqlite3 -header -column ~/.config/bifrost/logs.db \
  'select datetime(timestamp), provider, model, selected_key_name, routing_rule_name, status
   from logs order by timestamp desc limit 5;'
```

Expected successful worker calls:

```text
provider=Minimax
model=MiniMax-M2.7-highspeed
selected_key_name=Minimax $80
routing_rule_name=MiniMax Workers (Haiku Alias)
status=success
```

## Rules

- Use interactive Herdr tabs when the user wants to see agents or use Claude Code goal/background-agent behavior.
- Use headless `claude-mini -p` only for bounded noninteractive split-compute jobs.
- Keep one task per worker.
- Keep each worker prompt self-contained; workers should not infer project context from Codex's chat.
- Prefer read-only workers first, implementation workers second.
- Serialize edits that touch the same files.
- Use completion markers so Codex can wait reliably.
- Do not spawn recursive worker fleets unless Shaan explicitly asks.
- Close temporary test tabs after verification.
