#!/bin/bash
# Usage: serve-board.sh [PORT]
set -euo pipefail
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$SCRIPT_DIR/lib.sh"
port=${1:-8778}
rd=$(run_dir)
url="http://127.0.0.1:$port/board.html"
set +e
python3 - "$port" <<'PY'
import socket, sys
s = socket.socket()
s.settimeout(0.2)
try:
    s.connect(("127.0.0.1", int(sys.argv[1])))
    sys.exit(0)
except OSError:
    sys.exit(1)
finally:
    s.close()
PY
rc=$?
set -e
if [ "$rc" -eq 0 ]; then
  printf '%s\n' "$url"
  exit 0
fi
printf '%s\n' "$url"
cd "$rd"
exec python3 -m http.server "$port" --bind 127.0.0.1
