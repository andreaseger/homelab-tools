#!/bin/sh
# Start Kindle HASS Dashboard
DIR="$(dirname "$0")/.."
CONF="$DIR/etc/kindle-dash.conf"
. "$CONF"

export SERVER_URL DEVICE_ID TOKEN EVENT_DEV

mkdir -p /var/run/kindle-dash
echo $$ > /var/run/kindle-dash/pid

# Suppress screensaver
lipc-set-prop com.lab126.powerd preventScreenSaver 1

# Start render loop in background
$DIR/bin/loop.sh &
echo $! > /var/run/kindle-dash/render.pid

# Start touch listener in background
$DIR/bin/touch-listener.sh &
echo $! > /var/run/kindle-dash/touch.pid

eips "Dashboard started"
sleep 1
