# Bifrost storage and retention options

Use this reference when deciding how to reduce Bifrost log growth. Re-inspect the installed version before changing configuration; Bifrost behavior has changed across releases.

## Current SISO findings (2026-07-23)

- Installed MacBook binary: Bifrost `v1.5.0` on port 8080.
- Active `config_client`: logging enabled, content logging enabled, retention 365 days.
- `logs.db` grew to 91,014,234,112 bytes over roughly 36 days and 131,094 rows: about 694 KiB per historical row and 2.5 GiB/day on average.
- A fresh sample reached 71,602,176 bytes for 38 rows: about 1.88 MiB per row.
- The fresh sample's dominant fields were:
  - `responses_input_history`: 28,150,029 bytes;
  - `raw_request`: 27,046,682 bytes;
  - `content_summary`: 7,809,275 bytes;
  - `params` and `tools`: about 2.7 MB each.
- A full logical dump compressed with `zstd -10 --long=30` from 91.0 GB to 749.7 MB (99.18% reduction).
- The loaded `com.siso.bifrost-log-shipper` job targets `/Volumes/SISO-STORAGE-VAULT 1` and safely aborts while that external drive is absent. Its raw SQLite master design is superseded by compressed chunks/object offload.

## Why the database grows so quickly

One request can store the same expanding conversation context in multiple fields: response input history, raw request, params, tool schemas, summaries, output, and raw response. Agent conversations resend their full context and large tool schemas, so row size grows with conversation length rather than remaining constant.

SQLite stores this content uncompressed. Deleting rows does not necessarily return space to macOS when `auto_vacuum=0`; freed pages are normally reused, but a `VACUUM` or fresh-database rotation is required to shrink the file itself.

## Strategy comparison

### Compressed rotation: recommended immediate option

Keep content logging enabled. Rotate the live DB at 3-5 GiB into immutable, verified `.sql.zst` chunks. This preserves training data, keeps the live DB fast, and achieves the observed 97-99% compression.

Schedule an inspector daily or twice daily. Run rotation only above the threshold. Do not enable automatic destructive rotation until one manual `rotate-live.sh --execute` run passes end to end.

### Object-storage offload: recommended long-term option

Bifrost v1.5.0 supports `logs_store.object_storage` using S3, GCS, or an S3-compatible endpoint such as MinIO/R2. Large request/response payloads move to compressed objects while SQLite retains searchable metadata and pointers.

Illustrative configuration shape:

```json
{
  "logs_store": {
    "enabled": true,
    "type": "sqlite",
    "config": { "path": "./logs.db" },
    "object_storage": {
      "type": "s3",
      "bucket": "env.BIFROST_LOG_BUCKET",
      "endpoint": "env.BIFROST_LOG_S3_ENDPOINT",
      "access_key_id": "env.BIFROST_LOG_S3_ACCESS_KEY",
      "secret_access_key": "env.BIFROST_LOG_S3_SECRET_KEY",
      "prefix": "bifrost/logs",
      "force_path_style": true,
      "compress": true
    }
  }
}
```

Run MinIO on the Mac Mini only after selecting durable storage. Prefer the physical 5 TB vault once it is mounted; otherwise MinIO on the Mini's internal SSD is still bounded by that SSD's capacity. Test payload retrieval before enabling retention or lifecycle deletion.

Official references:

- https://docs.getbifrost.ai/deployment-guides/config-json/storage
- https://docs.getbifrost.ai/deployment-guides/config-json/client
- https://docs.getbifrost.ai/enterprise/log-exports
- https://github.com/maximhq/bifrost/blob/v1.5.0/transports/config.schema.json

### Built-in retention: useful only after archival

The active v1.5.0 field is `client.log_retention_days` / `config_client.log_retention_days`. The cleaner runs at startup and about every 24 hours, deleting rows older than the cutoff in batches.

Version nuance: the v1.5.0 JSON schema requires at least 1 day, and `framework/logstore/cleaner.go` substitutes 365 days when the value is below 1. Current documentation describes `0` as disabling cleanup. Treat this as version-specific and verify source/config for the installed release.

At observed traffic, one day can still mean several GiB. Use retention as a backstop after compressed rotation/object offload is proven, not as the preservation mechanism.

Source:

- https://github.com/maximhq/bifrost/blob/v1.5.0/framework/logstore/cleaner.go

### Metadata-only logging: smallest but lossy

`client.disable_content_logging: true` retains usage/latency/cost metadata but strips inputs, outputs, embeddings, and related content. Do not use it when prompts and responses are wanted for training or agent debugging.

`client.enable_logging: false` disables the log trail and is also incompatible with the preservation goal.

## External-drive guard

Before writing to a named vault path:

1. Run `diskutil list external physical`.
2. Resolve the candidate path with `df -h /Volumes/<name>`.
3. Inspect its whole disk with `diskutil info` and require an external device location.
4. Refuse a path backed by `/System/Volumes/Data` or the internal `disk3s*` device.

A stale directory under `/Volumes` is not evidence that a drive is mounted.

## Activation order

1. Run `scripts/inspect.sh --deep`.
2. Run `scripts/rotate-live.sh --min-gib 5` in preview mode.
3. Complete one manual `--execute` rotation and restore test.
4. Install a schedule only after that pass.
5. Configure object storage and verify readback if continuous offload is desired.
6. Lower retention only after archives or objects are independently recoverable.
