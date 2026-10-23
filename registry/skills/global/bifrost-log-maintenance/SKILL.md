---
name: bifrost-log-maintenance
description: Inspect, archive, verify, rotate, and bound Maxim Bifrost SQLite request logs without losing prompts, responses, tool calls, or training data. Use when logs.db is large, disk space is low, Bifrost log growth needs diagnosis, logs must be compressed or moved between the MacBook and Mac Mini, retention/object-storage settings are being considered, or recurring Bifrost log maintenance is requested.
---

# Bifrost Log Maintenance

Preserve complete Bifrost request history while keeping the live SQLite database bounded. Treat deletion as the final step of a verified archive workflow, never as cleanup by itself.

## Safety contract

- Preserve every `logs`, `mcp_tool_logs`, `async_jobs`, and `migrations` row unless the user explicitly requests content removal.
- Never use `disable_content_logging` when prompts and responses are wanted for training; it deliberately strips content.
- Never lower retention until a tested archive pipeline runs more frequently than the retention window.
- Never trust a `/Volumes/...` directory name. Prove an external drive with `diskutil list external physical` and its backing device with `df`/`diskutil info`.
- Never delete a source or rotated raw database until the compressed frame, SHA-256, full restore, row counts, schema hash, timestamps, and restored `PRAGMA quick_check` pass.
- Stop only the Bifrost launchd service. Do not kill `codex-bifrost-shim.mjs` or other similarly named processes.
- Preserve unrelated user files and stale historical scripts. Do not reactivate hard-coded shippers without auditing their destination and schema assumptions.

## Workflow

### 1. Inspect first

Run the read-only inspector on the target machine:

```bash
bash scripts/inspect.sh
bash scripts/inspect.sh --deep
```

Use `--bifrost-dir PATH` for a non-default installation. `--deep` adds SQLite `quick_check`, which can take minutes on a large database.

Record:

- database bytes, rows, timestamps, bytes per row, and free disk;
- the largest text columns;
- `enable_logging`, `disable_content_logging`, and `log_retention_days`;
- loaded rotation/shipper jobs;
- whether an external disk is physically present.

Read [references/storage-options.md](references/storage-options.md) when choosing a long-term policy or changing Bifrost configuration.

### 2. Choose the least destructive strategy

1. Prefer Bifrost object-storage offload with compression for continuous full-content logging. S3, GCS, and S3-compatible MinIO/R2 keep large payloads outside SQLite while retaining searchable metadata.
2. Otherwise rotate at a small threshold, normally 3-5 GiB, and retain compressed, fully verified chunks.
3. Use retention only after archival is proven. A one-day setting can still leave several GiB at observed SISO traffic rates.
4. Use metadata-only logging only when the user accepts losing prompt/response training content.

### 3. Archive a static database

For a database that has no writers:

```bash
bash scripts/archive-static.sh --db /path/to/logs-rotated.db --archive-dir /path/to/archives --confirm-static
```

The explicit `--confirm-static` assertion is required because Bifrost may open SQLite intermittently and `lsof` alone cannot prove immutability. The script also refuses an observed open handle, creates a logical SQLite dump compressed with `zstd -10 --long=30`, writes a SHA-256 manifest, performs a full restore, compares counts/schema/timestamps, runs `quick_check`, and removes only its temporary restore database. It never deletes the source.

Use `--frame-only` only when free space cannot hold a restore and the raw source will be retained. A frame-only archive is not sufficient evidence for deleting the source.

### 4. Rotate a live Mac installation

Preview first:

```bash
bash scripts/rotate-live.sh --min-gib 5
```

Execute only after reviewing the preview:

```bash
bash scripts/rotate-live.sh --execute --min-gib 5
```

The rotation script:

1. checks the live database and available space;
2. stops the exact Bifrost launchd unit;
3. checkpoints WAL and atomically renames `logs.db` to a static rotated database;
4. restarts Bifrost immediately with a fresh live database;
5. archives and fully restores the static database;
6. deletes the raw rotated copy only after every verification passes.

If any verification fails, keep the raw rotated database and the live service continues on its fresh database.

### 5. Verify and report

Report exact paths, original/compressed bytes, reduction, SHA-256, row counts, timestamp range, `quick_check`, current free disk, service health, and whether the raw source remains.

Restore a logical archive with:

```bash
zstd -d --long=30 -c archive.sql.zst | sqlite3 restored.db
```

After restore, run `PRAGMA quick_check`, compare table counts and timestamps, and merge overlapping archives by immutable `logs.id`, not by rowid.

## MacBook and Mac Mini routing

- Use the MacBook as the control surface and the Mac Mini as the long-term archive host.
- Follow the `mac-mini-herdr-control` skill before remote work.
- Keep transfers resumable and hash both sides.
- Retain two verified copies while the external vault is absent.
- When the external vault returns, verify its physical backing device before placing archives there.
