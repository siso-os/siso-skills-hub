#!/usr/bin/env bash
set -euo pipefail

DB=""
ARCHIVE_DIR=""
TAG="$(date -u '+%Y%m%dT%H%M%SZ')"
FULL_RESTORE=1
ZSTD_LEVEL=10
ZSTD_LONG=30
CONFIRM_STATIC=0

usage() {
  cat <<'USAGE'
Usage: archive-static.sh --db PATH --confirm-static [--archive-dir PATH] [--tag TAG] [--frame-only]

Archive a static Bifrost SQLite database as a compressed logical dump. By
default, fully restore and verify it. This script never deletes the source.
--confirm-static asserts that no service can write to the source during capture.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db)
      [[ $# -ge 2 ]] || { echo "missing value for --db" >&2; exit 2; }
      DB="$2"
      shift 2
      ;;
    --archive-dir)
      [[ $# -ge 2 ]] || { echo "missing value for --archive-dir" >&2; exit 2; }
      ARCHIVE_DIR="$2"
      shift 2
      ;;
    --tag)
      [[ $# -ge 2 ]] || { echo "missing value for --tag" >&2; exit 2; }
      TAG="$2"
      shift 2
      ;;
    --frame-only)
      FULL_RESTORE=0
      shift
      ;;
    --confirm-static)
      CONFIRM_STATIC=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[[ -n "$DB" ]] || { echo "--db is required" >&2; exit 2; }
[[ -f "$DB" ]] || { echo "database not found: $DB" >&2; exit 1; }
(( CONFIRM_STATIC == 1 )) || {
  echo "refusing without --confirm-static: the source must be immutable during capture" >&2
  exit 1
}
[[ -n "$ARCHIVE_DIR" ]] || ARCHIVE_DIR="$(dirname "$DB")/archives"

for command_name in sqlite3 zstd shasum stat df awk; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "missing required command: $command_name" >&2
    exit 1
  }
done

if command -v lsof >/dev/null 2>&1 && lsof "$DB" >/dev/null 2>&1; then
  echo "refusing open database: $DB" >&2
  echo "use rotate-live.sh to create a static cutover first" >&2
  exit 1
fi

mkdir -p "$ARCHIVE_DIR"
HOST_TAG=$(scutil --get LocalHostName 2>/dev/null || hostname -s)
HOST_TAG=$(printf '%s' "$HOST_TAG" | tr -cs 'A-Za-z0-9._-' '-')
ARCHIVE="$ARCHIVE_DIR/logs-${HOST_TAG}-through-${TAG}.sql.zst"
MANIFEST="$ARCHIVE_DIR/logs-${HOST_TAG}-through-${TAG}.manifest.txt"
PARTIAL="$ARCHIVE.partial"
TMP_MANIFEST="$MANIFEST.partial"
RESTORE_DB="$ARCHIVE_DIR/.restore-verify-${HOST_TAG}-${TAG}.db"
ARCHIVE_CREATED=0
MANIFEST_CREATED=0

[[ ! -e "$ARCHIVE" ]] || { echo "archive already exists: $ARCHIVE" >&2; exit 1; }
[[ ! -e "$MANIFEST" ]] || { echo "manifest already exists: $MANIFEST" >&2; exit 1; }
[[ ! -e "$PARTIAL" ]] || { echo "partial archive already exists: $PARTIAL" >&2; exit 1; }
[[ ! -e "$TMP_MANIFEST" ]] || { echo "partial manifest already exists: $TMP_MANIFEST" >&2; exit 1; }
[[ ! -e "$RESTORE_DB" ]] || { echo "restore path already exists: $RESTORE_DB" >&2; exit 1; }

LOCKDIR="$ARCHIVE_DIR/.bifrost-archive.lock.d"
if ! mkdir "$LOCKDIR" 2>/dev/null; then
  echo "another Bifrost archive operation is active: $LOCKDIR" >&2
  exit 1
fi

cleanup() {
  local rc=$?
  rmdir "$LOCKDIR" 2>/dev/null || true
  if (( rc != 0 )); then
    [[ ! -e "$PARTIAL" ]] || /bin/unlink "$PARTIAL"
    [[ ! -e "$TMP_MANIFEST" ]] || /bin/unlink "$TMP_MANIFEST"
    if (( ARCHIVE_CREATED == 1 )) && [[ -e "$ARCHIVE" ]]; then /bin/unlink "$ARCHIVE"; fi
    if (( MANIFEST_CREATED == 1 )) && [[ -e "$MANIFEST" ]]; then /bin/unlink "$MANIFEST"; fi
    for restore_file in "$RESTORE_DB" "$RESTORE_DB-journal" "$RESTORE_DB-wal" "$RESTORE_DB-shm"; do
      [[ ! -e "$restore_file" ]] || /bin/unlink "$restore_file"
    done
  fi
}
trap cleanup EXIT

schema_sha() {
  sqlite3 -separator '|' "$1" \
    "SELECT type,name,tbl_name,coalesce(sql,'')
     FROM sqlite_schema
     WHERE name NOT LIKE 'sqlite_%'
     ORDER BY type,name,tbl_name,sql;" \
    | shasum -a 256 | awk '{print $1}'
}

SOURCE_BYTES=$(stat -f '%z' "$DB")
if (( FULL_RESTORE == 1 )); then
  FREE_BYTES=$(df -Pk "$ARCHIVE_DIR" | awk 'NR==2 {printf "%.0f", $4 * 1024}')
  REQUIRED_BYTES=$((SOURCE_BYTES + SOURCE_BYTES / 5 + 2 * 1024 * 1024 * 1024))
  if (( FREE_BYTES < REQUIRED_BYTES )); then
    echo "insufficient free space for a full restore" >&2
    echo "free_bytes=$FREE_BYTES required_bytes=$REQUIRED_BYTES" >&2
    echo "retain the raw source and use --frame-only, or move the operation to larger storage" >&2
    exit 1
  fi
fi

CHECK=$(sqlite3 "$DB" "PRAGMA quick_check;")
[[ "$CHECK" == "ok" ]] || { echo "source quick_check failed: $CHECK" >&2; exit 1; }

SCHEMA_SHA=$(schema_sha "$DB")
LOG_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM logs;")
MIGRATION_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM migrations;")
MCP_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM mcp_tool_logs;")
ASYNC_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM async_jobs;")
RANGE=$(sqlite3 -separator '|' "$DB" \
  "SELECT coalesce(min(created_at),'none'), coalesce(max(created_at),'none') FROM logs;")
OLDEST=${RANGE%%|*}
NEWEST=${RANGE#*|}

echo "archiving $DB"
echo "source_bytes=$SOURCE_BYTES logs=$LOG_ROWS range=$OLDEST -> $NEWEST"
sqlite3 "$DB" ".dump" \
  | zstd "-$ZSTD_LEVEL" "--long=$ZSTD_LONG" -T2 -q -c > "$PARTIAL"
chmod 600 "$PARTIAL"
mv "$PARTIAL" "$ARCHIVE"
ARCHIVE_CREATED=1

zstd -t "--long=$ZSTD_LONG" "$ARCHIVE" >/dev/null
ARCHIVE_SHA=$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')
COMPRESSED_BYTES=$(stat -f '%z' "$ARCHIVE")
DECOMPRESSED_SQL_BYTES=$(zstd -d -q "--long=$ZSTD_LONG" -c "$ARCHIVE" | wc -c | tr -d '[:space:]')
REDUCTION=$(awk -v source="$SOURCE_BYTES" -v archive="$COMPRESSED_BYTES" \
  'BEGIN { if (source > 0) printf "%.6f", (1 - archive/source) * 100; else print "0" }')

RESTORE_STATUS="not_run_frame_only"
RESTORED_BYTES=0
if (( FULL_RESTORE == 1 )); then
  echo "restoring archive for end-to-end verification"
  zstd -d -q "--long=$ZSTD_LONG" -c "$ARCHIVE" | sqlite3 "$RESTORE_DB"
  RESTORE_CHECK=$(sqlite3 "$RESTORE_DB" "PRAGMA quick_check;")
  [[ "$RESTORE_CHECK" == "ok" ]] || { echo "restored quick_check failed: $RESTORE_CHECK" >&2; exit 1; }

  RESTORED_SCHEMA_SHA=$(schema_sha "$RESTORE_DB")
  [[ "$RESTORED_SCHEMA_SHA" == "$SCHEMA_SHA" ]] || { echo "restored schema hash mismatch" >&2; exit 1; }

  RESTORED_COUNTS=$(sqlite3 -separator '|' "$RESTORE_DB" \
    "SELECT (SELECT count(*) FROM logs), (SELECT count(*) FROM migrations),
            (SELECT count(*) FROM mcp_tool_logs), (SELECT count(*) FROM async_jobs);")
  EXPECTED_COUNTS="$LOG_ROWS|$MIGRATION_ROWS|$MCP_ROWS|$ASYNC_ROWS"
  [[ "$RESTORED_COUNTS" == "$EXPECTED_COUNTS" ]] || {
    echo "restored counts mismatch: $RESTORED_COUNTS != $EXPECTED_COUNTS" >&2
    exit 1
  }

  RESTORED_RANGE=$(sqlite3 -separator '|' "$RESTORE_DB" \
    "SELECT coalesce(min(created_at),'none'), coalesce(max(created_at),'none') FROM logs;")
  [[ "$RESTORED_RANGE" == "$RANGE" ]] || { echo "restored timestamp range mismatch" >&2; exit 1; }

  MISSING_IDS=$(sqlite3 "$RESTORE_DB" \
    "ATTACH '$DB' AS src;
     SELECT
       (SELECT count(*) FROM src.logs s WHERE NOT EXISTS (SELECT 1 FROM main.logs r WHERE r.id=s.id)) +
       (SELECT count(*) FROM main.logs r WHERE NOT EXISTS (SELECT 1 FROM src.logs s WHERE s.id=r.id));
     DETACH src;")
  [[ "$MISSING_IDS" == "0" ]] || { echo "restored log ID set mismatch: $MISSING_IDS" >&2; exit 1; }

  RESTORED_BYTES=$(stat -f '%z' "$RESTORE_DB")
  RESTORE_STATUS="pass"
  for restore_file in "$RESTORE_DB" "$RESTORE_DB-journal" "$RESTORE_DB-wal" "$RESTORE_DB-shm"; do
    [[ ! -e "$restore_file" ]] || /bin/unlink "$restore_file"
  done
fi

printf '%s\n' \
  "Bifrost logical archive manifest" \
  "================================" \
  "" \
  "Created UTC: $(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  "Source path: $DB" \
  "Source bytes: $SOURCE_BYTES" \
  "Source SQLite quick_check: ok" \
  "Source schema SHA-256: $SCHEMA_SHA" \
  "Source log rows: $LOG_ROWS" \
  "Source migration rows: $MIGRATION_ROWS" \
  "Source MCP tool rows: $MCP_ROWS" \
  "Source async job rows: $ASYNC_ROWS" \
  "Oldest log timestamp: $OLDEST" \
  "Newest log timestamp: $NEWEST" \
  "" \
  "Archive path: $ARCHIVE" \
  "Format: SQLite logical .dump compressed with Zstandard" \
  "Compression: zstd -$ZSTD_LEVEL --long=$ZSTD_LONG -T2" \
  "Compressed bytes: $COMPRESSED_BYTES" \
  "Decompressed SQL bytes: $DECOMPRESSED_SQL_BYTES" \
  "Source reduction: $REDUCTION%" \
  "Zstandard frame test: pass" \
  "SHA-256: $ARCHIVE_SHA" \
  "" \
  "Full restore verification: $RESTORE_STATUS" \
  "Restored SQLite bytes: $RESTORED_BYTES" \
  "Restored counts/schema/timestamps/log IDs: $RESTORE_STATUS" \
  "Restored SQLite quick_check: $RESTORE_STATUS" \
  "Source database retained by archive-static.sh: yes" > "$TMP_MANIFEST"
chmod 600 "$TMP_MANIFEST"
mv "$TMP_MANIFEST" "$MANIFEST"
MANIFEST_CREATED=1

echo "archive_complete"
echo "archive=$ARCHIVE"
echo "manifest=$MANIFEST"
echo "sha256=$ARCHIVE_SHA"
echo "compressed_bytes=$COMPRESSED_BYTES"
echo "reduction_percent=$REDUCTION"
echo "full_restore=$RESTORE_STATUS"
