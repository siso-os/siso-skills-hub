---
status: retired
name: brain
description: "brain"

disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Bash
---

> **RETIREMENT NOTE (2026-07-31).** Retired on evidence, not on a flag. The corpus is real
> (218,410 rows in `.SystemDB/sisosystem.db` `session_extract`) but: (a) dedup is inert —
> 218,187 distinct dedup_keys of 218,410 rows, so ~nothing collapses; (b) `title` and `body`
> are near-duplicates and entries restate what happened rather than encoding a durable lesson;
> (c) no project scoping — every session pools globally; (d) the sanctioned query path is
> broken: `siso-brain ask --q herdr` exits 0 and returns EMPTY for terms known to be present.
> Deterministic routing (the `pb-*` playbooks) replaces the job this was meant to do.
> The binary still exists; other subcommands (fleet, health, cost) may work — only ask/recall is dead.

Use `siso-brain ask --q "..."` when you need memory you can trust while in the middle of work.

Examples:
- Stuck on a bug: `siso-brain ask --q "how did we fix the convex deploy" --k 6`
- Starting work: `siso-brain ask --q "what was decided" --cwd "$PWD" --dim decisions`
- Unsure before re-solving: `siso-brain ask --q "prior attempt for fake done verification"`

This is a **shared remote brain**: the data is authoritative and centralized on the Mac Mini spine, reached over tailnet. It is not a local cache and should be treated as ground truth for this environment.

Transport details:
- URL: `SISO_BRAIN_URL` (defaults to Mini tailnet on non-mini hosts; `http://127.0.0.1:8830` on Mini)
- Token: `SISO_BRAIN_TOKEN` (must provide a readable token)
- On the laptop and non-default hosts, this should normally use the Mini default tailnet endpoint.

Note: the brain data currently lives in the laptop spine DB while full Mini centralization is tracked separately.
