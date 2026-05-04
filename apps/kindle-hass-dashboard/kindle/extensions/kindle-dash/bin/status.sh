#!/bin/sh
# Show dashboard status
DIR="$(dirname "$0")/.."
CONF="$DIR/etc/kindle-dash.conf"
. "$CONF"

RENDER_PID=$(cat /var/run/kindle-dash/render.pid 2>/dev/null)
TOUCH_PID=$(cat /var/run/kindle-dash/touch.pid 2>/dev/null)

if [ -n "$RENDER_PID" ] && kill -0 "$RENDER_PID" 2>/dev/null; then
    eips "Dashboard: RUNNING"
    eips "Server: $SERVER_URL"
    eips "Device: $DEVICE_ID"
else
    eips "Dashboard: STOPPED"
fi
sleep 2
