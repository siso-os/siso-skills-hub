#!/usr/bin/env bash
set -euo pipefail

BIFROST_DIR="${HOME}/.config/bifrost"
DEEP=0

usage() {
  cat <<'USAGE'
Usage: inspect.sh [--bifrost-dir PATH] [--deep]

Read-only Bifrost log-store inspection. --deep runs PRAGMA quick_check.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bifrost-dir)
      [[ $# -ge 2 ]] || { echo "missing value for --bifrost-dir" >&2; exit 2; }
      BIFROST_DIR="$2"
      shift 2
      ;;
    --deep)
      DEEP=1
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

for command_name in sqlite3 stat df; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "missing required command: $command_name" >&2
    exit 1
  }
done

DB="$BIFROST_DIR/logs.db"
CONFIG_DB="$BIFROST_DIR/config.db"

echo "bifrost_dir=$BIFROST_DIR"
echo "host=$(scutil --get LocalHostName 2>/dev/null || hostname -s)"
echo "checked_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo
echo "[disk]"
df -h "$BIFROST_DIR" | sed -n '1,2p'

echo
echo "[service]"
if launchctl print "gui/$(id -u)/com.maximhq.bifrost" >/dev/null 2>&1; then
  echo "launchd=com.maximhq.bifrost loaded"
  launchctl print "gui/$(id -u)/com.maximhq.bifrost" 2>/dev/null \
    | awk '/state =|pid =|program =/ {sub(/^[[:space:]]+/, ""); print}'
else
  echo "launchd=com.maximhq.bifrost not_loaded"
fi

echo
echo "[logs_db]"
if [[ ! -f "$DB" ]]; then
  echo "status=missing"
else
  DB_BYTES=$(stat -f '%z' "$DB")
  ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM logs;" 2>/dev/null || echo 0)
  echo "path=$DB"
  echo "bytes=$DB_BYTES"
  echo "human=$(du -h "$DB" | awk '{print $1}')"
  echo "rows=$ROWS"
  if [[ "$ROWS" =~ ^[0-9]+$ ]] && (( ROWS > 0 )); then
    echo "bytes_per_log_row=$((DB_BYTES / ROWS))"
  fi
  sqlite3 -header -column "$DB" \
    "SELECT min(created_at) AS oldest, max(created_at) AS newest, max(rowid) AS max_rowid FROM logs;"
  sqlite3 -header -column "$DB" \
    "SELECT (SELECT count(*) FROM migrations) AS migrations,
            (SELECT count(*) FROM mcp_tool_logs) AS mcp_tool_logs,
            (SELECT count(*) FROM async_jobs) AS async_jobs;"
  sqlite3 -header -column "$DB" \
    "SELECT (SELECT page_size FROM pragma_page_size) AS page_size,
            (SELECT page_count FROM pragma_page_count) AS page_count,
            (SELECT freelist_count FROM pragma_freelist_count) AS freelist_count,
            (SELECT auto_vacuum FROM pragma_auto_vacuum) AS auto_vacuum;"

  echo
  echo "[largest_text_columns_sum_bytes|max_bytes|nonempty_rows]"
  sqlite3 "$DB" \
    "SELECT 'SELECT ' || quote(name) ||
      ', coalesce(sum(length(\"' || replace(name,'\"','\"\"') || '\")),0),
       coalesce(max(length(\"' || replace(name,'\"','\"\"') || '\")),0),
       sum(CASE WHEN length(\"' || replace(name,'\"','\"\"') || '\")>0 THEN 1 ELSE 0 END)
       FROM logs;'
     FROM pragma_table_info('logs')
     WHERE lower(type) LIKE '%text%' OR lower(type) LIKE '%char%';" \
    | sqlite3 -separator '|' "$DB" \
    | sort -t'|' -k2,2nr \
    | sed -n '1,20p'

  if (( DEEP == 1 )); then
    echo
    echo "[quick_check]"
    sqlite3 "$DB" "PRAGMA quick_check;"
  fi
fi

echo
echo "[config]"
if [[ ! -f "$CONFIG_DB" ]]; then
  echo "status=missing"
else
  sqlite3 -header -column "$CONFIG_DB" \
    "SELECT enable_logging, disable_content_logging, log_retention_days,
            allow_per_request_content_storage_override, allow_per_request_raw_override
     FROM config_client ORDER BY id LIMIT 1;" 2>/dev/null || true
  sqlite3 -header -column "$CONFIG_DB" \
    "SELECT enabled, type, config FROM config_log_store ORDER BY id;" 2>/dev/null || true
fi

echo
echo "[archive_jobs]"
launchctl list 2>/dev/null \
  | grep -Ei 'bifrost.*(ship|rotat|archiv)|(?:ship|rotat|archiv).*bifrost' \
  || echo "none_loaded"

echo
echo "[external_disks]"
if command -v diskutil >/dev/null 2>&1; then
  EXTERNAL=$(diskutil list external physical 2>/dev/null || true)
  if [[ -n "$EXTERNAL" ]]; then
    printf '%s\n' "$EXTERNAL"
  else
    echo "none"
  fi
else
  echo "diskutil_unavailable"
fi

echo
echo "[vault_named_mounts]"
shopt -s nullglob
vault_paths=(/Volumes/SISO-STORAGE-VAULT*)
if (( ${#vault_paths[@]} == 0 )); then
  echo "none"
else
  for vault_path in "${vault_paths[@]}"; do
    echo "path=$vault_path"
    df -h "$vault_path" | sed -n '1,2p'
  done
fi

echo
echo "[archives]"
if [[ -d "$BIFROST_DIR/archives" ]]; then
  find "$BIFROST_DIR/archives" -maxdepth 1 -type f \
    \( -name '*.zst' -o -name '*.manifest.txt' \) -print0 \
    | xargs -0 stat -f '%N|%z' 2>/dev/null \
    | sort || true
else
  echo "none"
fi
