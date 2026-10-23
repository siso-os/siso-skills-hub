#!/usr/bin/env bash
# Dispatch Viewer — launch server + open browser
# Usage: ./launch.sh [--port PORT]

set -euo pipefail

PORT=8765

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="$2"
      shift 2
      ;;
    --port=*)
      PORT="${1#--port=}"
      shift
      ;;
    --help|-h)
      echo "Usage: launch.sh [--port PORT]"
      echo ""
      echo "Starts the Dispatch Viewer server and opens it in your browser."
      echo "Default port: 8765"
      echo ""
      echo "Options:"
      echo "  --port PORT   Use a custom port (default 8765)"
      echo "  --help        Show this help"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="$SCRIPT_DIR/server.py"

if [[ ! -f "$SERVER" ]]; then
  echo "Error: server.py not found at $SERVER" >&2
  exit 1
fi

# Check python3
if ! command -v python3 &>/dev/null; then
  echo "Error: python3 is required but not found in PATH" >&2
  exit 1
fi

URL="http://localhost:$PORT"

echo "Starting Dispatch Viewer on $URL" >&2
echo "Press Ctrl-C to stop" >&2
echo "" >&2

# Start server in background briefly to let it bind, then open browser
python3 "$SERVER" --port "$PORT" &
SERVER_PID=$!

# Give server a moment to bind
sleep 0.5

# Open browser (Mac)
if command -v open &>/dev/null; then
  open "$URL"
fi

# Wait for server — forward signals cleanly
trap 'kill $SERVER_PID 2>/dev/null; exit 0' INT TERM

wait $SERVER_PID
