---
name: convex-feature
description: End-to-end Convex feature scaffold — schema → query → mutation → React hook → UI component. Use when Shaan says "build a new feature", "add X to the dashboard", or any work that touches Convex backend + UI in one motion.
---

# Convex Feature

Scaffold a full-stack Convex feature end-to-end so you don't hand-roll the schema→query→mutation→hook→UI chain every time.

## When to use

- "Add a new <thing> to the dashboard"
- "Build a feature that lets users do X"
- "I need a new entity in Convex with a UI for it"

## When NOT to use

- Pure schema migration (do it inline — no dedicated skill exists)
- Pure component work without backend (use `impeccable`)
- Performance issue (do it inline — no dedicated skill exists)

## The 5-step scaffold

For feature `<NAME>`:

### 1. Schema
File: `convex/schema/<name>.ts`
- Define table with `defineTable({...}).index("by_<field>", ["<field>"])`
- Add to `convex/schema.ts` main export
- Reference: existing tables in `convex/schema/` for conventions
- Run `npx convex dev --once` after writing

### 2. Query
File: `convex/<name>.ts`
- `export const list<Name>s = query({ args: {}, handler: async (ctx) => {...} })`
- `export const get<Name> = query({ args: { id: v.id("<name>") }, handler: ... })`
- Use `.withIndex(...)` not `.filter(...)` for hot paths
- Apply `auth.getUserIdentity()` if Clerk-protected

### 3. Mutation
Same file `convex/<name>.ts`
- `export const create<Name> = mutation({ args: {...}, handler: ... })`
- `export const update<Name> = mutation({ args: { id, patch }, handler: ... })`
- `export const delete<Name> = mutation({ args: { id }, handler: ... })`

### 4. React hook (optional, if reusable)
File: `src/features/<area>/hooks/use<Name>.ts`
- Wraps `useQuery(api.<name>.list<Name>s)`
- Returns `{ data, isLoading, mutate }`

### 5. UI component
File: `src/features/<area>/components/<Name>List.tsx` or similar
- Use `px-4` inner padding (Shaan convention)
- Match patterns from neighboring features
- If pipeline-style status, reference `PipelineStatusStrip` pattern

## Hard rules

- **Convex sync after every schema/query/mutation edit:** `npx convex dev --once`
- **Don't skip indexes:** every query that filters needs an index
- **Match neighbor conventions:** read 2 sibling features before writing
- **Verification:** typecheck (`npx tsc --noEmit`) + open feature in browser before declaring done

## Optional: ship it via /iso

For a full-stack feature with 4+ moving parts, this skill is a candidate to invoke `/iso` — worktree-isolated, parallel Haiku workers execute schema/query/mutation/UI, returns a ready-to-merge branch.
