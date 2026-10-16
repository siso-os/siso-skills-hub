---
name: add-module
description: Add one Agent Base module using its existing manifest registry and isolated service ownership.
---

# Add one module

Read AGENTS.md and git status first. Use an owned branch and preserve unrelated edits.

1. Read `packages/siso-os/src/types.ts`, `apps/web/src/os/registry.ts`, and the nearest existing module matching the requested surface.
2. Add `apps/web/src/modules/<id>/manifest.ts` with a unique ID, an existing space, name, icon, order, entry and sidenav. The registry discovers manifests automatically; do not add a second registry.
3. For a built-in screen, add `index.tsx` exporting the screen. Share code through packages or shared components; never import another module's internals. For an independently served app, use `entry: { kind: "url", url }` and keep its API in that app's service.
4. Use `keepAlive: true` only when leaving the screen must preserve work such as music playback. A loopback URL works on the host machine only; supply a routed origin before claiming remote support.
5. Declare required identity and credentials at the service boundary. Keep secrets out of manifests, URLs, screenshots and git. A public mirror declaration does not remove private code from a build.
6. Run `node tools/check-modules.mjs`, the closest registry tests and the affected typecheck. Integrate once in the real shell: open, navigate away, return, reload, and exercise the reverse action. Check 390 px and desktop widths for visible changes.
7. Open one PR with the local check results and UI evidence. Merge on green checks, then use the documented deployment path. Verify `/api/version` and the changed behavior before closing its task.

Use the existing Browser module for navigation and the existing Voice and Music services for their capabilities. A new module is not permission to duplicate a provider, credential store or background daemon.
