#!/usr/bin/env bash
set -euo pipefail

BIFROST_DIR="${HOME}/.config/bifrost"
ARCHIVE_DIR=""
LABEL="com.maximhq.bifrost"
PLIST="${HOME}/Library/LaunchAgents/com.maximhq.bifrost.plist"
HEALTH_URL="http://127.0.0.1:8080/health"
MIN_GIB=5
EXECUTE=0
FORCE=0

usage() {
  cat <<'USAGE'
Usage: rotate-live.sh [options]

Options:
  --execute                 Perform the rotation; default is read-only preview
  --force                   Rotate even when logs.db is below --min-gib
  --min-gib N               Minimum live DB size to rotate (default: 5)
  --bifrost-dir PATH        Bifrost data directory
  --archive-dir PATH        Archive destination (default: DIR/archives)
  --label LABEL             Exact launchd label
  --plist PATH              Exact launchd plist
  --health-url URL          Health endpoint checked after cutover
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute) EXECUTE=1; shift ;;
    --force) FORCE=1; shift ;;
    --min-gib)
      [[ $# -ge 2 ]] || { echo "missing value for --min-gib" >&2; exit 2; }
      MIN_GIB="$2"; shift 2 ;;
    --bifrost-dir)
      [[ $# -ge 2 ]] || { echo "missing value for --bifrost-dir" >&2; exit 2; }
      BIFROST_DIR="$2"; shift 2 ;;
    --archive-dir)
      [[ $# -ge 2 ]] || { echo "missing value for --archive-dir" >&2; exit 2; }
      ARCHIVE_DIR="$2"; shift 2 ;;
    --label)
      [[ $# -ge 2 ]] || { echo "missing value for --label" >&2; exit 2; }
      LABEL="$2"; shift 2 ;;
    --plist)
      [[ $# -ge 2 ]] || { echo "missing value for --plist" >&2; exit 2; }
      PLIST="$2"; shift 2 ;;
    --health-url)
      [[ $# -ge 2 ]] || { echo "missing value for --health-url" >&2; exit 2; }
      HEALTH_URL="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ "$MIN_GIB" =~ ^[0-9]+$ ]] || { echo "--min-gib must be a non-negative integer" >&2; exit 2; }
[[ -n "$ARCHIVE_DIR" ]] || ARCHIVE_DIR="$BIFROST_DIR/archives"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ARCHIVER="$SCRIPT_DIR/archive-static.sh"
DB="$BIFROST_DIR/logs.db"
UID_VALUE=$(id -u)
SERVICE_TARGET="gui/$UID_VALUE/$LABEL"
DOMAIN_TARGET="gui/$UID_VALUE"
MIN_BYTES=$((MIN_GIB * 1024 * 1024 * 1024))

for command_name in sqlite3 stat df launchctl; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "missing required command: $command_name" >&2
    exit 1
  }
done
[[ -x "$ARCHIVER" ]] || { echo "archive helper is not executable: $ARCHIVER" >&2; exit 1; }
[[ -f "$DB" ]] || { echo "live database not found: $DB" >&2; exit 1; }

DB_BYTES=$(stat -f '%z' "$DB")
FREE_BYTES=$(df -Pk "$BIFROST_DIR" | awk 'NR==2 {printf "%.0f", $4 * 1024}')
REQUIRED_BYTES=$((DB_BYTES + DB_BYTES / 5 + 2 * 1024 * 1024 * 1024))
ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM logs;" 2>/dev/null || echo unknown)
SERVICE_LOADED=0
launchctl print "$SERVICE_TARGET" >/dev/null 2>&1 && SERVICE_LOADED=1
HEALTH_CODE="unavailable"
if command -v curl >/dev/null 2>&1; then
  HEALTH_CODE=$(curl -sS -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || true)
fi

echo "mode=$([[ $EXECUTE -eq 1 ]] && echo execute || echo preview)"
echo "database=$DB"
echo "database_bytes=$DB_BYTES"
echo "log_rows=$ROWS"
echo "minimum_bytes=$MIN_BYTES"
echo "free_bytes=$FREE_BYTES"
echo "required_verification_bytes=$REQUIRED_BYTES"
echo "archive_dir=$ARCHIVE_DIR"
echo "service_target=$SERVICE_TARGET"
echo "service_loaded=$SERVICE_LOADED"
echo "service_health_http=$HEALTH_CODE"

if (( DB_BYTES < MIN_BYTES && FORCE == 0 )); then
  echo "decision=skip_below_threshold"
  exit 0
fi

if (( EXECUTE == 0 )); then
  echo "decision=eligible_no_changes_made"
  echo "rerun with --execute after reviewing this preview"
  exit 0
fi

(( SERVICE_LOADED == 1 )) || {
  echo "refusing live rotation because the exact Bifrost service is not loaded" >&2
  echo "use archive-static.sh for an offline database" >&2
  exit 1
}
[[ -f "$PLIST" ]] || { echo "launchd plist missing: $PLIST" >&2; exit 1; }
[[ "$HEALTH_CODE" == "200" ]] || { echo "Bifrost health preflight failed: HTTP $HEALTH_CODE" >&2; exit 1; }
(( FREE_BYTES >= REQUIRED_BYTES )) || {
  echo "insufficient free space for full archive restore verification" >&2
  echo "free_bytes=$FREE_BYTES required_bytes=$REQUIRED_BYTES" >&2
  exit 1
}

mkdir -p "$ARCHIVE_DIR"
LOCKDIR="$BIFROST_DIR/.rotate.lock.d"
if ! mkdir "$LOCKDIR" 2>/dev/null; then
  echo "another Bifrost rotation is active: $LOCKDIR" >&2
  exit 1
fi

SERVICE_STOPPED=0
SERVICE_RESTARTED=0
ROTATED_DB=""

restart_service() {
  if (( SERVICE_LOADED == 1 && SERVICE_STOPPED == 1 && SERVICE_RESTARTED == 0 )); then
    launchctl bootstrap "$DOMAIN_TARGET" "$PLIST" >/dev/null 2>&1 || true
    launchctl kickstart -k "$SERVICE_TARGET" >/dev/null 2>&1 || true
  fi
}

cleanup() {
  local rc=$?
  restart_service
  rmdir "$LOCKDIR" 2>/dev/null || true
  if (( rc != 0 )) && [[ -n "$ROTATED_DB" && -f "$ROTATED_DB" ]]; then
    echo "rotation_failed_raw_source_retained=$ROTATED_DB" >&2
  fi
}
trap cleanup EXIT

PRECHECK=$(sqlite3 "$DB" "PRAGMA quick_check;")
[[ "$PRECHECK" == "ok" ]] || { echo "live quick_check failed: $PRECHECK" >&2; exit 1; }

if (( SERVICE_LOADED == 1 )); then
  if ! launchctl bootout "$SERVICE_TARGET" >/dev/null 2>&1; then
    launchctl bootout "$DOMAIN_TARGET" "$PLIST" >/dev/null 2>&1 || {
      echo "failed to stop exact Bifrost launchd service" >&2
      exit 1
    }
  fi
  SERVICE_STOPPED=1
fi

if command -v lsof >/dev/null 2>&1; then
  for _ in $(seq 1 30); do
    lsof "$DB" >/dev/null 2>&1 || break
    sleep 1
  done
  if lsof "$DB" >/dev/null 2>&1; then
    echo "database still has open handles after service stop" >&2
    exit 1
  fi
fi

sqlite3 "$DB" "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null
WAL_BYTES=0
[[ ! -e "$DB-wal" ]] || WAL_BYTES=$(stat -f '%z' "$DB-wal")
(( WAL_BYTES == 0 )) || { echo "WAL is not empty after checkpoint: $WAL_BYTES bytes" >&2; exit 1; }

POSTCHECK=$(sqlite3 "$DB" "PRAGMA quick_check;")
[[ "$POSTCHECK" == "ok" ]] || { echo "post-checkpoint quick_check failed: $POSTCHECK" >&2; exit 1; }

TAG=$(date -u '+%Y%m%dT%H%M%SZ')
ROTATED_DB="$BIFROST_DIR/logs-rotated-$TAG.db"
[[ ! -e "$ROTATED_DB" ]] || { echo "rotated path already exists: $ROTATED_DB" >&2; exit 1; }
mv "$DB" "$ROTATED_DB"
for sidecar in "$DB-wal" "$DB-shm"; do
  [[ ! -e "$sidecar" ]] || /bin/unlink "$sidecar"
done
echo "cutover_static_database=$ROTATED_DB"

if (( SERVICE_LOADED == 1 )); then
  launchctl bootstrap "$DOMAIN_TARGET" "$PLIST" >/dev/null 2>&1 || true
  launchctl kickstart -k "$SERVICE_TARGET" >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do
    if command -v curl >/dev/null 2>&1 \
      && [[ "$(curl -sS -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || true)" == "200" ]]; then
      SERVICE_RESTARTED=1
      break
    fi
    sleep 1
  done
  (( SERVICE_RESTARTED == 1 )) || {
    echo "Bifrost did not become healthy; raw rotated database is safe at $ROTATED_DB" >&2
    exit 1
  }
  if [[ -f "$DB" ]]; then
    chmod 600 "$DB"
  fi
  echo "fresh_service_health=200"
fi

ARCHIVE_OUTPUT=$(bash "$ARCHIVER" --db "$ROTATED_DB" --archive-dir "$ARCHIVE_DIR" --tag "$TAG" --confirm-static)
printf '%s\n' "$ARCHIVE_OUTPUT"
ARCHIVE_PATH=$(printf '%s\n' "$ARCHIVE_OUTPUT" | awk -F= '$1=="archive" {print substr($0, index($0,"=")+1)}')
MANIFEST_PATH=$(printf '%s\n' "$ARCHIVE_OUTPUT" | awk -F= '$1=="manifest" {print substr($0, index($0,"=")+1)}')
[[ -f "$ARCHIVE_PATH" && -f "$MANIFEST_PATH" ]] || {
  echo "archive helper did not return verified artifacts" >&2
  exit 1
}

/bin/unlink "$ROTATED_DB"
for sidecar in "$ROTATED_DB-journal" "$ROTATED_DB-wal" "$ROTATED_DB-shm"; do
  [[ ! -e "$sidecar" ]] || /bin/unlink "$sidecar"
done
printf '%s\n' "Raw rotated source removed by rotate-live.sh after full verification: yes" >> "$MANIFEST_PATH"

echo "rotation_complete"
echo "raw_rotated_source_removed=yes"
echo "live_database=$DB"
echo "archive=$ARCHIVE_PATH"
echo "manifest=$MANIFEST_PATH"
df -h "$BIFROST_DIR" | sed -n '1,2p'
