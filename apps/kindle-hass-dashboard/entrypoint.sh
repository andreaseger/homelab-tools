#!/usr/bin/env bash
set -e

export KINDLE_DASH_URL="${KINDLE_DASH_URL:-http://127.0.0.1:8080}"
export DASHBOARD_TOKEN="${DASHBOARD_TOKEN:-}"
export MATTERBRIDGE_DIR="${MATTERBRIDGE_DIR:-/root/.matterbridge}"

MATTERBRIDGE_PID=""
BUN_PID=""

cleanup() {
  if [ -n "$BUN_PID" ]; then
    kill -TERM "$BUN_PID" 2>/dev/null || true
  fi
  if [ -n "$MATTERBRIDGE_PID" ]; then
    kill -TERM "$MATTERBRIDGE_PID" 2>/dev/null || true
    wait "$MATTERBRIDGE_PID" 2>/dev/null || true
  fi
}
trap cleanup TERM INT

if [ "${EXPOSE_ENABLED:-false}" = "true" ]; then
  echo "Starting matterbridge..."
  bun /app/node_modules/matterbridge/dist/cjs/cli.js --add /app/matter-plugin --bridge &
  MATTERBRIDGE_PID=$!
  echo "matterbridge started (PID: $MATTERBRIDGE_PID)"
fi

bun run server/index.ts &
BUN_PID=$!
wait "$BUN_PID"
EXIT=$?
cleanup
exit $EXIT
