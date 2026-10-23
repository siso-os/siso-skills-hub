# ADR-009 — Files are canonical; the DB is a mirror (single-writer spine)

- **Principle:** P6
- **Status:** ACCEPTED · **Classification: UNIVERSAL** (write/read split corroborated) — with a SISO-specific inversion the workspace's own evolution adjudicated
- **Layer:** Universal code-layout / workspace coordination

## Context

SISO carried two contradictory doctrines at once. One said **"nothing is true unless it's in the DB"** — the SQLite spine as the read source of truth. The trajectory adjudicated and **files won, decisively.** The evidence is brutal: 90,869 memories in the DB, **ZERO distilled**, no boot path reads it; the memory-quality-tiering retrieval mechanism is VERIFIED DEAD (`distilled=1` count is zero, so the retrieval can never fire). The DB-as-truth doctrine manufactured false trust — a pointer into a dead store.

What survived adversarial review was the **single-writer correctness** half, not the read-source half.

## Decision

**Files are canonical; the DB is a discovery/event MIRROR.** The task FOLDER (`.tasks/TASK-NNNN/`) is the source of truth; the SQLite DB and any dashboard are explicitly *derived* projections for discovery and event queries. Concretely:

- **Single WRITER** to the coordination spine (append-only), with per-project READ/route autonomy. The write/read split is the durable, corroborated part.
- The canonical state lives in **files**, in git, falsifiable by diff. The DB is rebuilt from files, never the reverse.
- "Nothing is true unless in the DB" is **DROPPED.** Truth is the file; the DB is a convenience index over it.

## Consequences

- State is git-native: versioned, diffable, falsifiable, survivable. A "proof" is a commit + the paths it depends on, so "is this still true?" reduces to "have those files changed since?" (see ADR-014 detect≠repair).
- The DB can be wiped and regenerated from files with no loss — it holds no canonical truth, so a corrupt mirror is an inconvenience, not a disaster.
- Forbids the dead-pointer failure: no boot path may depend on the DB as a read source of truth. If a feature needs DB-read-on-the-hot-path, that is a smell pointing back at this ADR.
- **Dropped half (do not re-introduce):** DB-as-read-source, memory quality tiering (tier/confidence/distilled/expires_at boot-injection), and Registry-Reality-Parity scripts that don't exist — all governance theater.

## When this applies

Any system with both a file spine and a database/index. The DB earns its place as a mirror for discovery/events; it never earns canonical-truth status. The single-writer rule applies to any shared coordination spine.

## Evidence

UNIVERSAL (write/read split) — `spring-petclinic`'s config-server lives in a separate git repo, read-only to N services. The files-win inversion is adjudicated by **SISO's own evolution** (the newest era inverted DB-as-truth). Reference wiring: oracle's file-canonical `.tasks/`, DB/dashboard explicitly derived. Source: GQ-001 ANSWER.html, surviving principle #6, KILLED list (DB-as-truth, memory tiering, Registry-Reality-Parity), Trajectory lesson ("DB-as-truth LOST to files-as-truth"), External Corpus Pass CORROBORATED (P6).
