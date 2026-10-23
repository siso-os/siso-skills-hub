# CLAUDE.md "Read FIRST" Snippet

Copy the block below into the top of any project's `CLAUDE.md`. It primes the
agent to consult `.siso-wiki/` before exploring the filesystem — the single
biggest token-saving win from siso-codex.

---

## Read FIRST — `.siso-wiki/`

Before running Glob, Grep, `ls`, or any filesystem exploration, read
`.siso-wiki/index.md` if present. It's a pre-computed catalog of:

- `routes.md` — every API/HTTP route, grouped by resource, with auth/db tags
- `schema.md` — DB tables, primary keys, foreign keys (Prisma/Drizzle/Convex/SQLA)
- `components.md` — React components with their props (client `(c)` flagged)
- `lib.md` — library exports — function signatures, classes
- `topology.md` — top-level directory map with file counts and entrypoints

Compression notation:
- `GET,POST /api/products [auth,db]` — verbs, path, capability tags
- `(c) CartDrawer  items, onRemove` — client-marker, name, props
- `**Order** id(PK) | userId | status -> User` — table, columns, FK
- `lib/cache.ts -> get(key), set(key,val)` — module exports

**Rule:** the shards exist precisely so you don't have to grep. If the answer
is in the wiki, use it. Only fall back to filesystem exploration when the wiki
is missing, stale, or the question is genuinely outside its scope.

If `.siso-wiki/` is missing or you suspect it's stale, regenerate:

```bash
~/.claude/skills/siso-codex/scan.sh
```

---

That's the whole snippet. ~250 tokens. Pays for itself the first time the
agent skips a 5K-token Glob.
