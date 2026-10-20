---
name: multisearch
description: Run web, GitHub, and X searches in parallel for comprehensive research. Use when you need information from multiple sources.
version: 1.0.0
tags:
  - research
  - parallel
user-invocable: true
---

# Multi-Search

Run comprehensive research across multiple sources in parallel.

## Your Task

When asked to research a topic, spawn **3 parallel subagents** using the Task tool:

### Agent 1: Web Search
- Use websearch skill or run:
```bash
python3 "${CLAUDE_SKILL_DIR:-$HOME/.claude/skills/multisearch}/../websearch/scripts/perplexity_search.py" "$ARGUMENTS"
```

### Agent 2: GitHub Search
- Use gitsearch skill or run:
```bash
gh search repos "$ARGUMENTS" --limit 10 --sort stars
gh search code "$ARGUMENTS" --limit 10
```

### Agent 3: X/Twitter Search
- Use xsearch skill or run:
```bash
python3 "${CLAUDE_SKILL_DIR:-$HOME/.claude/skills/multisearch}/../websearch/scripts/perplexity_search.py" "Find recent X/Twitter discussions about: $ARGUMENTS"
```

## Execution

1. Launch ALL 3 agents in parallel using `Task` with `run_in_background: true`
2. Wait for all to complete
3. Synthesize results into a unified summary with:
   - Key findings from each source
   - Cross-source insights
   - Relevant URLs

## Important

- Run searches in parallel, not sequentially
- Aggregate and compare findings
- Note any contradictions between sources
