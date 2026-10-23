---
status: active
name: source-reference
description: "Source Reference"

disable-model-invocation: true
---

# Source Reference

## Overview

Use Vercel Labs `opensrc` to fetch dependency or repository source into the global cache, then link it into the workspace declared by `MANIFEST.yaml` `paths.source_reference` with an index agents can cite.

## Workflow

1. Identify the narrow library, SDK, or repo needed for the current task.
   - Prefer one to three targets. Do not fetch broad ecosystems.
   - Use package names for installed dependencies, such as `@opentui/core`.
   - Use GitHub repo specs for source repos, such as `vercel/ai` or `sveltejs/svelte`.

2. Fetch and link source references:

```bash
node templates/profile/skills/source-reference/scripts/fetch-source-reference.mjs @opentui/core
node templates/profile/skills/source-reference/scripts/fetch-source-reference.mjs vercel/ai sveltejs/svelte
```

3. Read `MANIFEST.yaml` `paths.source_reference` `index.md`, then inspect the target's `package.json`, workspace config, exports, tests, and examples before assuming a source layout.

4. Use source references as read-only evidence.
   - Do not execute fetched source.
   - Do not copy large blocks into SISO.
   - Cite the local source path in reasoning when it drove an implementation decision.
   - Prefer exact exported APIs, tests, examples, and package internals over memory or generated docs.

5. Keep context small.
   - Search within `MANIFEST.yaml` `paths.source_reference` `<target>/` with `rg`.
   - Open specific source files, tests, and examples.
   - Avoid loading entire fetched repos into context.

## Target Selection

Good targets:

- The exact package being imported by the code under edit.
- A framework or SDK with version-sensitive APIs.
- A reference implementation for a SISO adapter or TUI surface.
- A dependency whose docs are missing, stale, or too high level.

Avoid:

- Fetching repos just because they are popular.
- Pulling source for packages unrelated to the current edit.
- Treating fetched third-party code as approved to vendor, run, or ship.

## Useful Commands

```bash
# Fetch/link one npm package using the current repo lockfile context.
node templates/profile/skills/source-reference/scripts/fetch-source-reference.mjs remeda

# Fetch/link multiple GitHub repos.
node templates/profile/skills/source-reference/scripts/fetch-source-reference.mjs vercel/ai browser-use/browser-use

# Use a different cwd for package lockfile resolution.
node templates/profile/skills/source-reference/scripts/fetch-source-reference.mjs --cwd apps/siso-tui @opentui/core

# Find relevant implementation details after fetching.
find -L "$(node lib/manifest-paths.mjs get source_reference)/<target>" -maxdepth 3 -name package.json -print
rg -n "createClient|export function|interface" "$(node lib/manifest-paths.mjs get source_reference)/<target>"
```

## SISO Rules

- Keep fetched source in `MANIFEST.yaml` `paths.source_reference`; the manifest owns the active source-reference location.
- For SISO/Pi runtime or adapter work, fetch upstream source before changing adapter behavior when the relevant API is unfamiliar.
- For dependency additions, combine this skill with package risk review. Source availability does not mean the dependency is safe to install.
- If a target cannot be fetched, fall back to package metadata, existing local dependency files, or official docs, and state the gap.

## Package Safety

- Do not add a new runtime dependency just because source is available.
- Before adding or upgrading a package, check package metadata, release age, install scripts, repository source, and transitive dependency risk.
- Do not install packages first published or updated within the last 14 days unless the user explicitly approves the risk.
- Prefer existing dependencies or SISO-owned adapter code when the new package would require broad filesystem, network, shell, credential, or browser access.
