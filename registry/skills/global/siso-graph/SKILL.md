---
name: siso-graph
description: Query a graphify knowledge graph — keyword search, shortest paths, god nodes, and node explanations. Read-only, no LLM calls, instant results.
trigger: /siso-graph
---

# /siso-graph

Lightweight CLI to query a pre-built graphify knowledge graph. Returns plain text
suitable for agent consumption. No graph rebuilding, no LLM calls, pure traversal.

## When to Use

- You need to understand how concepts in a codebase or knowledge base are connected
- You want to find the shortest path between two ideas/modules/concepts
- You want to identify the most important nodes (god nodes) in a knowledge graph
- You need all connections for a specific concept before making architectural decisions
- You are exploring a graphify graph that was already built with /graphify

Do NOT use this for building graphs (use /graphify instead).

## Commands

### Query — keyword search with BFS neighborhood expansion

Finds nodes matching your question and returns them with their 2-hop neighbors.

```bash
siso-graph query "agent coordination patterns"
siso-graph query "iso pipeline"
siso-graph query "skills hub"
```

Good queries: use 2-4 specific terms that would appear in node labels.
Bad queries: full sentences, vague single words like "system" or "code".

### Path — shortest path between two concepts

Finds how two concepts are connected through the graph.

```bash
siso-graph path "agent os" "iso"
siso-graph path "skills" "hooks"
siso-graph path "siso library" "knowledge graph"
```

Node names are fuzzy-matched — you do not need exact IDs.

### Gods — top 10 most connected nodes

Shows the structural hubs of the knowledge graph.

```bash
siso-graph gods
```

Use this first when exploring an unfamiliar graph to understand its center of gravity.

### Explain — all connections for a single node

Shows everything connected to one concept.

```bash
siso-graph explain "agent os"
siso-graph explain "iso"
siso-graph explain "siso workspace"
```

## Invocation

Always invoke via the full script path. The CLI auto-detects `graphify-out/graph.json`
by walking up from CWD — so either `cd` into the project first, or pass `--graph` explicitly.

```bash
SISO_GRAPH=~/SISO_Workspace/agent_os/hub/skills/siso-graph/siso-graph.py

# Option 1: cd into the project (auto-detect finds graph.json)
cd ~/SISO_Workspace/ecosystem_context
$SISO_GRAPH gods

# Option 2: explicit graph path (works from anywhere)
$SISO_GRAPH --graph ~/SISO_Workspace/ecosystem_context/graphify-out/graph.json gods
```

## Known Graphs

| Project | Graph path |
|---------|-----------|
| ecosystem_context | `~/SISO_Workspace/ecosystem_context/graphify-out/graph.json` |
| isso-dashboard | `~/SISO_Workspace/SISO_Agency/apps/isso-dashboard/graphify-out/graph.json` |
| SISO_Library | `~/SISO_Workspace/SISO_Library/graphify-out/graph.json` |
| agent_os/hub | `~/SISO_Workspace/agent_os/graphify-out/graph.json` |

Run `/graphify <path>` to build graphs for other projects (SISO_Library).

## What You Must Do When Invoked

1. Set `SISO_GRAPH=~/SISO_Workspace/agent_os/hub/skills/siso-graph/siso-graph.py`
2. Pick the right graph from the Known Graphs table above, or ask the user which project
3. Run the relevant command using the Bash tool with `--graph <path>`
4. Read the plain text output
5. Answer using only what the graph contains — do not hallucinate edges or connections
6. If the graph lacks the information, say so and suggest running `/graphify <path>` to build one

## Interpreting Output

All output is plain text. Key patterns:

- `--relation-->` shows edge type (contains, implements, references, rationale_for, etc.)
- `[EXTRACTED, 1.0]` means the relationship was found explicitly in source material
- `[INFERRED, 0.7]` means the relationship was reasoned about, not explicit — treat with appropriate uncertainty
- `[AMBIGUOUS, 0.2]` means the relationship is uncertain — flag for review
- `degree` indicates how connected a node is (higher = more central)
- `community` groups nodes into clusters of related concepts

## Examples of Good Usage Patterns

1. Start with `gods` to find structural hubs
2. Use `explain` on interesting god nodes to understand their role
3. Use `path` to trace how two distant concepts connect
4. Use `query` when you have a question but do not know which nodes are relevant

## Graphs Available in This Workspace

- `ecosystem_context/graphify-out/graph.json` — 251 nodes, architecture docs, ADRs, Claude Code docs, standards
- `SISO_Library/graphify-out/graph.json` — 1,838 nodes, 2,208 edges, 323 communities; AI research knowledge base (benchmarks, agents, LLMs, RAG, infrastructure)
- `isso-dashboard/graphify-out/graph.json` — 4,388 nodes, 3,259 edges; DDD TypeScript codebase (partnerships, client-base, portfolio domains)
- `agent_os/graphify-out/graph.json` — 1,222 nodes, 1,636 edges; agent hub (skills registry, hooks library, agent templates, OS database)
