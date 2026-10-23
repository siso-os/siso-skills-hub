# viewer

Launch the Dispatch Viewer to monitor active dispatch runs in the browser.

## When to use

- Shaan asks "open the viewer", "launch the monitor", "watch the dispatch"
- A dispatch is running with multiple parallel workers and Shaan wants live visibility
- Debugging a stalled phase (compare phase timeline against worker stream)

## How to launch

```bash
bash ~/.claude/skills/dispatch/viewer/launch.sh
```

Opens `http://localhost:8765` in the default browser (Arc on Mac).

Custom port:
```bash
bash ~/.claude/skills/dispatch/viewer/launch.sh --port 9000
```

## What it shows

**Left sidebar** — all plans with a `-status.md` file, split into:
- Active (updated in last 5 min, green dot)
- Completed / Idle (gray dot)

Click any plan to select it.

**Top half (Timeline)** — phase-by-phase status from the `-status.md` file:
- ✅ passed / ❌ failed / 🛑 escalated / ⏳ in-progress / ⏸ queued
- Timestamps and result notes per phase

**Bottom half (Worker Stream)** — live JSONL events from `/private/tmp/` task outputs:
- HAIKU / SONNET badges per worker
- Tool calls (Read, Write, Bash, etc.) with target paths
- Collapsible results for long outputs
- Agent brief shown at top of each worker block

Polls every 2 seconds, no reload needed.

## When dispatch should mention it

After starting a dispatch with 3+ parallel workers, print:

```
👀 Monitor at: bash ~/.claude/skills/dispatch/viewer/launch.sh
```

Do NOT auto-launch without Shaan asking. He decides when he wants the browser open.

## Files

| File | Purpose |
|---|---|
| `~/.claude/skills/dispatch/viewer/server.py` | Python stdlib HTTP server (~200 lines) |
| `~/.claude/skills/dispatch/viewer/index.html` | Single-file SPA, dark terminal aesthetic |
| `~/.claude/skills/dispatch/viewer/launch.sh` | Convenience wrapper, opens browser |

## Architecture notes

- Zero install — Python 3 stdlib only (http.server, json, os, glob)
- Status files: `.claude/plans/<name>-status.md` (this repo's plans dir)
- Worker outputs: `/private/tmp/claude-501/-Users-*/<session-uuid>/tasks/*.output`
- Server auto-discovers the most recently modified `tasks/` directory
- hook_*.output files are filtered out (not agent workers)
