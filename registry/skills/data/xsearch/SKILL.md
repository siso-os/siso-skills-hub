---
name: xsearch
description: Search X (Twitter) for discussions, opinions, and latest updates on topics. Use when you want community sentiment or real-time trends.
version: 1.0.0
tags:
  - research
  - social-media
user-invocable: true
context: fork
agent: Explore
allowed-tools: Bash
---

# X (Twitter) Search

You are running in a forked subagent context. Your task is to search X/Twitter.

## Search Query

$ARGUMENTS

## Your Task

Run the search using Perplexity with Twitter focus:
```bash
python3 "${CLAUDE_SKILL_DIR:-$HOME/.claude/skills/xsearch}/../websearch/scripts/perplexity_search.py" "Find recent X/Twitter discussions about: $ARGUMENTS"
```

Or use WebSearch with site filter:
```bash
WebSearch(query: "$ARGUMENTS site:x.com OR site:twitter.com")
```

Summarize:
- Key discussions/threads
- Notable handles/accounts mentioned
- Community sentiment
- Any relevant URLs

Return a concise summary of the X/Twitter search results.
