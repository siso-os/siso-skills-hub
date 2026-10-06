---
name: agent-widgets
description: Publish bounded data-only agent widgets from explicit operational sources and verify same-data fallback migration.
---

# Agent widgets

Use for an agent's Agent Base widget publications or a migration from a standalone
board. Reuse the existing widget reader, renderers, action delivery and notes CLI.
No HTML, executable code, new daemon, provider, task store or inferred recipient.

1. Read the producer owner's AGENTS.md and current widget schema. Confirm exact
   agent ID, authorized operational input files, output root and fallback owner.
   Never search private chat, Life or WhatsApp corpora to manufacture widget data.
   For A0, use its existing `bin/a0-widgets` with an explicit source manifest and
   output root. Its default invocation validates and summarizes without writing.
2. Write JSON envelopes `{id,agent,title,shape,updated,data,actions}` under
   `<widget-root>/<agent>/<id>.json`. IDs match `[A-Za-z0-9][A-Za-z0-9_-]{0,63}`;
   `events` is reserved. Use an ISO timestamp, at most 256 KiB per file, 128 rows
   per known shape and 128 files per agent. Fail clearly on overflow; never silently
   truncate. Partition larger groups into numbered widgets carrying page count
   and full source row count; repeat truthful aggregate progress counts. Preserve last-good files on source failure, validate the whole input
   set first, then write temporary files and atomically rename each publication.
   A filesystem failure can leave a mixed generation; each file stays complete.
   Preserve bytes and timestamp when semantics are unchanged; refuse collisions.
3. Reuse shapes: `needs.items`, `announcements.items`, `list.rows`,
   `progress.{checked,total,counts,items}`, `team.members`, and `systems` with
   `{source:"servers"}`. Read current validators for exact fields. Keep historical
   task records in a labelled list with liveness unknown. A claimed task does not
   prove an agent is running. The A0 producer uses uppercase `A0` exactly.
4. Enable only `seen`, `reply`, `voice`. Action requests carry the current server
   revision. Announcement actions also carry an existing `itemId`; no arbitrary
   target or file path is accepted. The existing inbox receives exactly
   `announcement <id>: seen` or `announcement <id>: <reply>`. Preserve draft text
   on delivery failure. Keep project, timestamp, needs and seen state visible.
   Use the existing console transport or explicitly provided owner callback.
5. Test in a disposable root and fake inbox first: same source IDs/counts/fields,
   malformed/missing inputs, ownership/collision guards, overflow and last-good
   retention, unchanged-file stability, item Seen/reply round-trip, and file
   replacement visible within two seconds in an already-open selected widget.
   Inspect desktop and phone renders. Publish to the real output only within the
   user's authorized scope. Retire only the exact confirmed fallback invocation
   after current same-data parity; preserve old source and recovery pointer.

## A0 source manifest

Paths are explicit and relative to the manifest (or absolute local paths). Keep
machine paths and runtime data with the consumer, outside the reusable skill.

```json
{
  "announcements": "announcements.jsonl",
  "inbox": "synthetic-inbox.jsonl",
  "plans": ["owner-plan.json"],
  "tasks": [{"id": "task-1", "state": "STATE.json", "log": "LOG.md"}],
  "issues": "issues.jsonl"
}
```

`issues` and task `log` are optional; explicit empty plans/tasks are allowed.
Missing declared sources fail. Inbox input must be an authorized operational
receipt log. Run `bin/a0-widgets --manifest <file> --output-root <root>` first;
append `--publish` only for the intended target. Publications contain producer
ownership markers; another producer's file is a collision. A removed managed
widget needs explicit archival before changing the manifest. Never loop against
an error or silently overwrite a different producer. The producer refuses a
concurrent publisher through its writer lock. For a reviewed live snapshot, pass
`--source-guard <file>` containing the expected absolute-path-to-SHA256 map,
including the manifest; changed source hashes refuse publication.

## Notes use their own writer

Use Agent Base's `services/node/bin/ab-note.mjs apply` with JSON on stdin; never
append directly to its notes log. A create request includes `action:"create"`,
`requestId`, `by`, `source`, `text` and optionally `why`. Reuse the exact request
ID for a retry of the same payload. For update, retire or restore, read the current
record with `ab-note.mjs list`, provide its `id` and `expectedRevision`, and use a
new request ID. A conflict means read again; do not overwrite another writer.
Keep text out of process arguments and receipts. Test using the note writer's
configured disposable storage root before any authorized live write.
