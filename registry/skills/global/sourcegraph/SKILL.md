---
status: active
name: sourcegraph
description: "Code Search: Sourcegraph + Package Discovery"

disable-model-invocation: true
version: "1.0"
tags: [research, code-search, sourcegraph, oss, package-discovery, npm, background-agent]
user-invocable: true
allowed-tools: [Bash]
---

# Code Search: Sourcegraph + Package Discovery

## What This Skill Is

This is the **code search** skill.

Use it when you need to discover public OSS code patterns, find package entrypoints, inspect extension APIs across many repos, or build an ecosystem inventory.

It has two complementary lanes:

1. **Sourcegraph code search** - find code, files, symbols, and implementation patterns across public repos.
2. **NPM/package registry discovery** - find packages and metadata for ecosystems such as Pi packages.

Do not rely on GitHub search alone for broad ecosystem discovery. GitHub search can rate-limit, reject queries as spammy, or miss code-pattern detail. Sourcegraph is better for code evidence. NPM is better for package inventory.

## What Sourcegraph Is

Sourcegraph indexes all public code from GitHub, GitLab, and Bitbucket. The public instance at `sourcegraph.com` accepts unauthenticated queries via GraphQL at `https://sourcegraph.com/.api/graphql`. No API key required to start.

## When to Use Sourcegraph, NPM, Or `gh search`

| Need | Use |
|------|-----|
| Code-pattern research (library usage, API calls, impl patterns) | `sg-search.sh code` — GitHub code search is 0 req/min unauthenticated |
| Broad package ecosystem inventory | NPM registry search (`-/v1/search`) — best for package names, versions, repos, publish dates |
| Star counts / trending repos | `gh search repos` — Sourcegraph doesn't surface stars |
| Symbol definitions across langs | `sg-search.sh symbol` — GitHub has no symbol-level search |
| Archived / dead repos | `sg-search.sh repo` with `archived:yes` |
| PR/commit/issue history | `gh` — Sourcegraph is code-only |

## The Script

Located at:
```
~/SISO_Workspace/SISO_Agency/apps/isso-dashboard/docs/cam-stream/scripts/sg-search.sh
```

If that script path is stale, use the direct Sourcegraph GraphQL fallback below.

### Commands

**Code search** — find files containing a pattern:
```bash
sg-search.sh code "obs-websocket-js" --lang typescript --limit 20
sg-search.sh code "supabase.auth.signIn" --lang typescript
sg-search.sh code "chaturbate" --limit 10
```

**Repo search** — find repositories by name pattern:
```bash
sg-search.sh repo "obs-websocket" --limit 10
sg-search.sh repo "electron streaming" --limit 5
```

**Symbol search** — find function/class/interface definitions:
```bash
sg-search.sh symbol "OBSWebSocket" --lang go
sg-search.sh symbol "createClient" --lang typescript --limit 15
```

## Direct Sourcegraph GraphQL Fallback

Use this when the helper script is missing or stale.

```bash
QUERY='"@mariozechner/pi-coding-agent" "registerTool" lang:TypeScript count:50'
curl -sS https://sourcegraph.com/.api/graphql \
  -H 'user-agent: pi-harness-lab-code-search/1.0' \
  -H 'accept: application/json' \
  -H 'content-type: application/json' \
  --data-binary "$(jq -n --arg q "$QUERY" '{
    query: "query($q:String!){ search(query:$q, version:V3){ results { limitHit matchCount elapsedMilliseconds results { __typename ... on FileMatch { repository { name url } file { path url } lineMatches { lineNumber preview } } ... on Repository { name url } } } } }",
    variables: { q: $q }
  }')" \
  | jq -r '.data.search.results.results[]? |
      select(.__typename=="FileMatch") |
      [.repository.name, .file.path, .file.url] | @tsv'
```

## Pi Ecosystem Inventory Pattern

For Pi package discovery, use **both** NPM and Sourcegraph:

1. NPM registry search gives broad package metadata.
2. Sourcegraph finds public source code patterns and package manifests.
3. Clone/read only the top candidates.

### NPM package discovery

```bash
python3 - <<'PY' > research/sources/discovery/npm-pi-package-candidates.json
import json, urllib.parse, urllib.request

queries = [
    "keywords:pi-package",
    "pi extension coding agent",
    "pi subagent coding agent",
    "pi context coding agent",
    "pi permission coding agent",
    "pi task coding agent",
    "pi prompt coding agent",
]

seen = {}
for q in queries:
    url = "https://registry.npmjs.org/-/v1/search?" + urllib.parse.urlencode({
        "text": q,
        "size": 100,
        "quality": 0.2,
        "popularity": 0.4,
        "maintenance": 0.4,
    })
    data = json.load(urllib.request.urlopen(url, timeout=20))
    for item in data.get("objects", []):
        pkg = item["package"]
        name = pkg["name"]
        if name in seen:
            continue
        seen[name] = {
            "name": name,
            "version": pkg.get("version"),
            "description": pkg.get("description"),
            "published_at": pkg.get("date"),
            "links": pkg.get("links", {}),
            "keywords": pkg.get("keywords", []),
            "score": item.get("score", {}).get("final"),
        }

print(json.dumps(list(seen.values()), indent=2))
PY
```

Summarize:

```bash
jq -r '.[] |
  [.name, .version, .published_at, ((.links.repository // .links.npm // "")|tostring), (.description // "")]
  | @tsv' research/sources/discovery/npm-pi-package-candidates.json
```

### Sourcegraph package/code queries

Use these to find implementation evidence:

```bash
# Pi package manifests
QUERY='file:package.json "pi" "extensions" count:50'

# Pi extension imports
QUERY='"@mariozechner/pi-coding-agent" count:50'

# Custom tool implementations
QUERY='registerTool lang:TypeScript count:50'

# Command implementations
QUERY='registerCommand lang:TypeScript count:50'

# Tool interception / permission systems
QUERY='"tool_call" "block" lang:TypeScript count:50'

# Context rewriting / pruning systems
QUERY='"pi.on(\"context\"" lang:TypeScript count:50'
```

Then run the GraphQL fallback command above with the chosen `QUERY`.

## Broad Inventory Output

When building a registry, normalize to this shape:

```json
{
  "name": "pi-subagents",
  "version": "0.24.0",
  "published_at": "2026-05-03T05:36:42.779Z",
  "repo": "https://github.com/nicobailon/pi-subagents.git",
  "description": "Pi extension for delegating tasks to subagents...",
  "keywords": ["pi-package"],
  "category": "workers/subagents",
  "inspection_priority": "medium",
  "harness_fit": "high",
  "status": "candidate",
  "last_checked": "2026-05-05"
}
```

Useful categories:

- `workers/subagents`
- `task/queue/workflow`
- `safety/permission/audit`
- `context/pruning/memory`
- `codebase-map/wiki`
- `ui/status/metrics`
- `web/browser/search`
- `testing/devtools`
- `provider/mcp/integration`

## Pi Ecosystem Queries To Start With

NPM:

```text
keywords:pi-package
pi extension coding agent
pi subagent coding agent
pi context coding agent
pi permission coding agent
pi workflow coding agent
pi memory coding agent
pi mcp coding agent
```

Sourcegraph:

```text
file:package.json "pi" "extensions" count:50
"@mariozechner/pi-coding-agent" count:50
registerTool lang:TypeScript count:50
registerCommand lang:TypeScript count:50
"pi.on(\"tool_call\"" lang:TypeScript count:50
"pi.on(\"context\"" lang:TypeScript count:50
"pi.setActiveTools" lang:TypeScript count:50
"sendUserMessage" "followUp" lang:TypeScript count:50
```

### Auth

Set `SOURCEGRAPH_TOKEN` env var for higher limits. Leave unset for unauthenticated access (sufficient for most research).

```bash
SOURCEGRAPH_TOKEN=sgp_xxxxx sg-search.sh code "..."
```

To get a token: sourcegraph.com → Settings → Access Tokens → Generate.

## Interpreting Results

Each result is a **file match**, not a repo summary:
```
Repo:  github.com/twirapp/twir
File:  frontend/overlays/src/composables/obs/use-obs.ts
  L1: import OBSWebSocket from 'obs-websocket-js'
```

- `Repo` = full GitHub path (clone with `git clone https://github.com/twirapp/twir`)
- `File` = path within the repo
- `L<n>` = line number + matched snippet

Use results to: identify candidate repos, then clone/read the specific file.

## Known Limits & Gotchas

1. **Dot-in-URL queries:** `chaturbate.com/events` returns 0 — dots are regex wildcards in Sourcegraph's default mode. Use `patternType:regexp` or simplify: `sg-search.sh code "chaturbate" --limit 20`.
2. **No star metadata:** Sourcegraph results don't include stars. Use `gh search repos` when you need popularity signal.
3. **Fork/archive exclusion:** Forked and archived repos excluded by default. Add `fork:yes` or `archived:yes` to the query string to include them.
4. **Repo search syntax:** Internally uses `r:<query> type:repo`. Bare name queries work; no special quoting needed.
5. **Rate limits:** No `x-ratelimit-*` headers observed. Unauthenticated ceiling unknown — comfortable for 10-50 queries/session. Get a token if you see 429s.
6. **count: matters:** Sourcegraph caps results. Add `count:all` to the query string for exhaustive search (slower).
7. **Sourcegraph is evidence, not ranking:** It does not provide stars, downloads, or publish dates. Pair it with NPM or GitHub metadata.
8. **NPM is noisy:** Package keyword search finds forks, personal packages, and unrelated packages. Categorize and score before dispatching research agents.

## Sourcegraph Query Syntax (pass in query strings)

```
lang:TypeScript      Filter by language
count:50             Up to N results
type:repo            Repo results
type:symbol          Symbol results
r:owner/repo         Scope to repo
patternType:regexp   Enable regex
fork:yes             Include forks
archived:yes         Include archived
file:*.config.ts     Filter by filename
```

## Installation Note

This skill currently lives at:
`~/.claude/skills/sourcegraph/SKILL.md`

It is intentionally still named `sourcegraph` so existing slash/skill references keep working, but operationally it should be treated as the **code-search** skill.
