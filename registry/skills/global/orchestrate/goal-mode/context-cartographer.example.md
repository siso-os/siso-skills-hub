# Example: Context Cartographer Goal

```text
/goal Continue Oracle code-context cartography in source/document-only mode.
```

Then send:

```text
Objective:
Inventory and expand Oracle `oracle-context` coverage in coordinated batches without launching any app/runtime.

Scope:
- docs/oracle-streaming/CODE-CONTEXT-STANDARD.md
- docs/oracle-streaming/CODE-CONTEXT-GRAPH.json
- scripts/check-code-context.mjs
- high-value non-UI source boundaries outside active UI-CODEX ownership

Do not touch:
- src/renderer/domains/webcam/cockpit/**
- src/renderer/styles/domains/stream-chat*
- src/renderer/styles/domains/cockpit*
- credentials, .env files, raw platform payloads, or live account material

Success criteria:
- Produce a ranked next-batch candidate inventory.
- Add source blocks only after a scoped batch is approved.
- Run `node scripts/check-code-context.mjs --check`.
- Report compactly to agents/agent-zero/inbox/.

Checkpoint cadence:
- Update agents/context-cartographer/memory/journal.md after each scoped batch.
- Write compact upstream reports to agents/agent-zero/inbox/.

Stop and report if:
- You need to touch active UI files.
- The graph/checker needs schema expansion.
- A candidate block would exceed the context block size limit.
- You are tempted to launch the app or preview UI.
```

