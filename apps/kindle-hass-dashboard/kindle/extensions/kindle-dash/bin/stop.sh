#!/bin/sh
# Stop Kindle HASS Dashboard
DIR="$(dirname "$0")/.."

kill $(cat /var/run/kindle-dash/render.pid 2>/dev/null) 2>/dev/null
kill $(cat /var/run/kindle-dash/touch.pid 2>/dev/null) 2>/dev/null

# Allow screensaver again
lipc-set-prop com.lab126.powerd preventScreenSaver 0

# Restore original screen
eips -c

rm -f /var/run/kindle-dash/render.pid /var/run/kindle-dash/touch.pid /var/run/kindle-dash/pid

eips "Dashboard stopped"
sleep 1
