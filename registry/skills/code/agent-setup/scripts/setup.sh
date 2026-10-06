#!/bin/sh
# Retired V4 compatibility entry. Never create or modify the supplied target.
set -eu
cat >&2 <<'NOTICE'
agent-setup: the V4 agent_os template and claude-mem-lite installer are retired.
No agent directory, hooks, memory database, or running agent has been changed.
Use the agent-builder skill and the current Agent Zero AGENTS.md/routing.json.
Bounded jobs use Harness Lab bin/codex-run; hosted chats use Agent Zero bin/soul.
Read their current ownership and brief contracts before authorizing a launch.
NOTICE
if [ "$#" -eq 1 ] && { [ "$1" = --help ] || [ "$1" = -h ]; }; then
    exit 0
fi
exit 2
