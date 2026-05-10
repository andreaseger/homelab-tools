#!/bin/sh
# Start Kindle HASS Dashboard.
# Probes the server before launching the background loops so we fail fast on
# bad SERVER_URL / TOKEN / TLS rather than leaving polls running into a void.
DIR="$(dirname "$0")/.."
CONF="$DIR/etc/kindle-dash.conf"
. "$CONF"

CURL_OPTS="-m 10"
[ "$INSECURE_TLS" = "1" ] && CURL_OPTS="$CURL_OPTS -k"

export SERVER_URL TOKEN EVENT_DEV CURL_OPTS

PROBE_RETRIES=5
PROBE_DELAY=3
i=0
PROBE_OK=0
while [ $i -lt $PROBE_RETRIES ]; do
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" $CURL_OPTS \
        -H "Authorization: Bearer $TOKEN" \
        "$SERVER_URL/render" 2>/dev/null)
    case "$HTTP" in
        200|304)
            PROBE_OK=1
            break
            ;;
        401|403)
            eips "Dashboard: auth failed (check TOKEN)"
            exit 1
            ;;
    esac
    i=$((i + 1))
    [ $i -lt $PROBE_RETRIES ] && sleep $PROBE_DELAY
done

if [ "$PROBE_OK" != "1" ]; then
    eips "Dashboard: cannot reach $SERVER_URL"
    eips "Check SERVER_URL / INSECURE_TLS / network."
    exit 1
fi

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

# Start command listener in background (M7)
$DIR/bin/command-listener.sh &
echo $! > /var/run/kindle-dash/command.pid

eips "Dashboard started"
sleep 1

# Lock orientation to portrait so the framebuffer rotation stays at 0 after
# the Kindle UI framework stops. Without this, the fb may be stuck at
# rotate: 3 (landscape) from a previous UI rotation, causing the 1072×1448
# portrait PNG to display stretched or clipped.
lipc-set-prop com.lab126.winmgr orientationLock P 2>/dev/null

# Stop the Kindle UI framework so its native UI doesn't compete for the
# screen and react to taps that bleed through evtest. Delayed so KUAL
# (which runs inside framework) has time to close its launcher cleanly
# first — otherwise KUAL crashes mid-action.
if [ "${STOP_FRAMEWORK:-1}" = "1" ]; then
    ( sleep 5; stop framework 2>/dev/null ) &
fi
