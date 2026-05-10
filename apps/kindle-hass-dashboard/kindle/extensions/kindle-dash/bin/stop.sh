#!/bin/sh
# Stop Kindle HASS Dashboard.
# Pass --skip-touch when invoked from the touch listener's exit gesture so we
# don't kill our own caller mid-execution; the listener exits itself afterward.
DIR="$(dirname "$0")/.."
SKIP_TOUCH=""
[ "$1" = "--skip-touch" ] && SKIP_TOUCH=1

for name in render touch command; do
    [ "$SKIP_TOUCH" = "1" ] && [ "$name" = "touch" ] && continue
    PID_FILE="/var/run/kindle-dash/${name}.pid"
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE" 2>/dev/null)
        [ -n "$PID" ] && kill "$PID" 2>/dev/null
    fi
done

# Allow screensaver again
lipc-set-prop com.lab126.powerd preventScreenSaver 0

# Restore original screen
eips -c

rm -f /var/run/kindle-dash/render.pid /var/run/kindle-dash/touch.pid /var/run/kindle-dash/command.pid /var/run/kindle-dash/pid

eips "Dashboard stopped"
sleep 1
