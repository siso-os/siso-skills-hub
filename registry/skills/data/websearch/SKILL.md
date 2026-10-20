---
name: websearch
description: Search the web using Perplexity Sonar via OpenRouter when the user requests web research or the task needs current external information.
version: 1.0.0
tags:
  - research
  - web
user-invocable: true
context: fork
agent: Explore
allowed-tools: Bash, Read
---

# Web Search

You are running in a forked subagent context. Your task is to search the web and return results.

## Search Query

$ARGUMENTS

## Your Task

1. Run the search using this command:
```bash
python3 "${CLAUDE_SKILL_DIR:-$HOME/.claude/skills/websearch}/scripts/perplexity_search.py" "$ARGUMENTS"
```

2. Read the output carefully

3. Summarize the key findings in 3-5 bullet points

4. Include any relevant URLs or sources

## Guidelines

- Use `perplexity/sonar-pro` for standard searches
- Use `perplexity/sonar-reasoning-pro` for complex analysis
- Use `perplexity/sonar-deep-research` for comprehensive research

Return a concise summary of the search results.

## Scripts

- `scripts/perplexity_search.py` — Main search wrapper

## Examples

See `examples/` folder for usage examples.
