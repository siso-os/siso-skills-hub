---
name: preflight-lessons
description: "Pull known mistakes for this territory BEFORE starting any non-trivial task (build, sweep, deploy, orchestration, migration — anything with burn-scar potential). AUTO-TRIGGER on: 'before we build', 'start the task', 'let's do X' / 'let's build X', 'kick off', 'set up', or resuming work after a compact/handoff. The READ side of the lesson system — recall scar tissue so you don't repeat a mistake already written down."
allowed-tools: [Bash, Read]
---

# preflight-lessons — recall scar tissue before you act

The capture side (lesson/reflect skills) writes mistakes to disk. This is the
READ side: spend ≤60s pulling what's already known about THIS territory so you
don't repeat a lesson already on file. The search is the point — not the hits.

## Budget (hard)
**≤60 seconds, ≤4 sources.** Stop when the budget is spent even if unread hits
remain. This is a preflight, not a research task. Do NOT open every match — you
want the 2–3 lessons that BIND this specific task.

## Extract domain keywords first
From the task, pull 2–4 content nouns (the tech, the operation, the target):
e.g. "vercel deploy spa" → `vercel spa deploy routes`. Use these below.

## The four sources (run in parallel, then read only the hits)
```bash
# 1. GLOBAL lessons — grep filenames + bodies, read INDEX hits
grep -il -e vercel -e deploy -e <kw> ~/.claude/lessons/*.md   # swap in your keywords
grep -i  -e <kw> ~/.claude/lessons/INDEX.md

# 2. PROJECT lessons — repo-local, then the workspace file
cat "$PWD/tasks/lessons.md" 2>/dev/null | grep -i -e <kw>
grep -i -e <kw> ~/SISO_Workspace/tasks/lessons.md 2>/dev/null
# repo-resident agent memory, only if it exists:
[ -f .agents/memory/INDEX.md ] && grep -i -e <kw> .agents/memory/INDEX.md

# 3. MINED insights — one importance-ranked call against the spine DB
python3 ~/SISO_Workspace/SISO_Agent_Base/extensions/session-mirror/preflight_lessons.py --domain <kw> --top 8
#   (no domain match? drop --domain for the top cross-domain failures)
#   fallback if that script is unavailable:
#   python3 ~/.claude/skills/insights-ask/scripts/ask.py --query <kw> --fails --top 10

# 4. MEMORY recall-on-cue — grep this project's memory for the content nouns
grep -rils -e <kw> ~/.claude/projects/*/memory/ 2>/dev/null
```
Read only the files that matched. Skim for the rule, not the whole story.

## Then: bind, state, honor
- Pick the **2–3 lessons that actually BIND this task** — not all hits. A lesson
  binds if acting against it would reproduce a real, relevant mistake.
- **State each in one line BEFORE you act**, then honor it in the plan.
- If a lesson **contradicts the plan → surface it, don't silently override.**
  Say what the plan does, what the lesson says, and how you're reconciling.
- **Zero hits → say so and proceed.** No hits ≠ failure; the search is the guard.

## Output contract (exactly this shape, before the first real action)
```
BINDING LESSONS (preflight, <Ns>): <domain keywords used>
1. <lesson in one line> — [source: global|project|mined|memory] → how I honor it
2. <lesson in one line> — [source] → how I honor it
3. <optional third>
```
If nothing binds: `BINDING LESSONS: none — no prior scar tissue found for <kw>. Proceeding.`
