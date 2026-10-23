---
name: siso-codex
description: "/siso-codex"

trigger: /siso-codex
---

# /siso-codex

(Named for its ai-codex inspiration — this is the **wiki indexer**, NOT a Codex-agent skill; for Codex workers see herdr/codex-companion.)

Pre-compute a compact markdown index of a project. Replaces ~50K tokens of
exploration with ~500 tokens of pre-digested topology. The agent reads the
index instead of running Glob/Grep on every conversation start.

Inspired by ai-codex (skibidiskib/ai-codex). Pure shell. No MCP. No deps.

## When to Use

- Starting fresh work in an unfamiliar repo (read `.siso-wiki/index.md` first)
- Project has grown and the existing wiki is stale (regenerate)
- Onboarding an agent / pi-worker / iso crew to a new codebase
- Pre-commit hook to keep the wiki fresh
- Any time you would otherwise run `find`, `ls -R`, or grep across the repo

Do NOT use this for graph queries (use `/siso-graph`) or single-file blast
radius (use `/blast-radius` once it lands).

## Commands

### Scan — generate the wiki

```bash
~/.claude/skills/siso-codex/scan.sh                 # scan CWD
~/.claude/skills/siso-codex/scan.sh /path/to/repo   # scan target
```

Emits to `<project>/.siso-wiki/`:

| File           | Emitted when                                         | Contents                                  |
|----------------|------------------------------------------------------|-------------------------------------------|
| `index.md`     | always                                               | catalog of available shards (~200 tok)    |
| `routes.md`    | Next.js app/pages, FastAPI, Express, Convex http     | `GET,POST /path [tags]`                   |
| `schema.md`    | Prisma, Drizzle, Convex schema, SQLAlchemy           | `**Table** id(PK) | field -> Other`       |
| `components.md`| `.tsx`/`.jsx` files with React components found      | `(c) Name  prop1, prop2`                  |
| `lib.md`       | exported functions/classes in `lib/`, `src/lib/`     | `fn name(args)` / `class Name`            |
| `topology.md`  | always                                               | top-level dirs + counts + entrypoints     |

## Compression Notation

Routes: `GET,POST /api/products [auth,db]`
Components: `(c) CartDrawer  items, onRemove, onCheckout`  (`(c)` = client)
Schema: `**Order** id(PK) | userId | status -> User`
Lib: `lib/cache.ts -> get(key), set(key,val), invalidate(prefix)`
Topology: `bin/  10 files, entry: bin/atlas_loop.sh`

## Read FIRST Pattern

Add this block to project CLAUDE.md (see `CLAUDE_MD_SNIPPET.md`):

> Read `.siso-wiki/index.md` BEFORE any Glob/Grep. The shards there cover
> routes, schema, components, lib, and topology. Only fall back to filesystem
> exploration if the wiki is missing or the answer isn't in it.

## Refreshing

The wiki goes stale. Three options:

1. **Manual** — re-run `scan.sh` after big structural changes
2. **Git pre-commit** — add `scan.sh` to `.git/hooks/pre-commit`
3. **Session start** — iso / pi-fleet workers regenerate before dispatch

## Output Discipline

- Deterministic ordering (sorted) so diffs are clean
- Skips: `node_modules`, `.next`, `dist`, `build`, `.git`, `_archive`,
  `.SystemDB`, `.siso-wiki`, `.venv`, `__pycache__`, `target/` (Rust),
  `coverage`, `.cache`
- Conditional emission — no `schema.md` if no ORM detected, no
  `components.md` if no `.tsx` files, etc.
- Pure shell — `rg`, `awk`, `sed`, `sort`, `find`. No node, no python.

## What You Must Do When Invoked

1. Confirm target path (CWD by default, or first arg)
2. Run `scan.sh <path>`
3. Read the resulting `.siso-wiki/index.md` and report what was emitted
4. If shards are unexpectedly missing, surface that — could mean a detection gap

## Known Limits

- Component prop extraction is regex-based — complex generics may drop props
- Convex / Drizzle detection looks for canonical filenames; weird layouts may slip
- Doesn't follow imports — pair with `/siso-graph` for cross-file relationships
