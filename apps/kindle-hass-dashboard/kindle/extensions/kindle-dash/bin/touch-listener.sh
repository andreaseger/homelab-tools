#!/bin/sh
# Touch listener - uses evtest to capture touch events and POSTs to /touch.
# Reserves the page header (y < HEADER_HEIGHT) as a local exit gesture: three
# taps in the header within EXIT_WINDOW seconds shut the dashboard down,
# without ever leaving the device. Header taps are NOT forwarded to the server.
DIR="$(dirname "$0")/.."
CONF="$DIR/etc/kindle-dash.conf"
. "$CONF"

# Inherit CURL_OPTS from start.sh; fall back when invoked standalone.
if [ -z "$CURL_OPTS" ]; then
    CURL_OPTS="-m 10"
    [ "$INSECURE_TLS" = "1" ] && CURL_OPTS="$CURL_OPTS -k"
fi

# Must match HEADER_HEIGHT in server/render/page-view.tsx.
HEADER_HEIGHT=96
EXIT_TAPS_REQUIRED=3
EXIT_WINDOW=3
EXIT_STATE="/var/tmp/kindle-dash-exit-taps"

# Auto-detect touch device if not set
if [ -z "$EVENT_DEV" ]; then
    EVENT_DEV=$(grep -l "cyttsp" /sys/class/input/event*/device/name 2>/dev/null | head -1 | sed 's|/sys/class/input/|/dev/input/|' | sed 's|/device/name||')
    if [ -z "$EVENT_DEV" ]; then
        EVENT_DEV="/dev/input/event1"
    fi
fi

# Read current etag from render loop
get_etag() {
    curl -s -I $CURL_OPTS -H "Authorization: Bearer $TOKEN" \
        "$SERVER_URL/render" 2>/dev/null | grep -i etag | tr -d '\r' | awk '{print $2}'
}

handle_header_tap() {
    NOW=$(date +%s)
    COUNT=1
    if [ -f "$EXIT_STATE" ]; then
        PREV=$(awk '{print $1}' "$EXIT_STATE" 2>/dev/null)
        PCOUNT=$(awk '{print $2}' "$EXIT_STATE" 2>/dev/null)
        if [ -n "$PREV" ] && [ $((NOW - PREV)) -le "$EXIT_WINDOW" ]; then
            COUNT=$((PCOUNT + 1))
        fi
    fi
    echo "$NOW $COUNT" > "$EXIT_STATE"

    if [ "$COUNT" -ge "$EXIT_TAPS_REQUIRED" ]; then
        rm -f "$EXIT_STATE"
        # Run stop.sh with --skip-touch so it doesn't try to kill us mid-cleanup.
        # We exit the subshell ourselves once stop.sh returns, which terminates
        # the evtest|while pipeline and lets the script wind down cleanly.
        "$DIR/bin/stop.sh" --skip-touch
        exit 0
    fi
}

evtest "$EVENT_DEV" 2>/dev/null | while read -r line; do
    # Parse EV_ABS ABS_MT_POSITION_X and Y
    case "$line" in
        *ABS_MT_POSITION_X*)
            X=$(echo "$line" | grep -o 'value [0-9]*' | awk '{print $2}')
            ;;
        *ABS_MT_POSITION_Y*)
            Y=$(echo "$line" | grep -o 'value [0-9]*' | awk '{print $2}')
            ;;
        *SYN_REPORT*)
            if [ -n "$X" ] && [ -n "$Y" ]; then
                if [ "$Y" -lt "$HEADER_HEIGHT" ]; then
                    handle_header_tap
                else
                    ETAG=$(get_etag)
                    curl -s -X POST $CURL_OPTS -H "Content-Type: application/json" \
                        -H "Authorization: Bearer $TOKEN" \
                        -d "{\"x\":$X,\"y\":$Y,\"etag\":\"$ETAG\"}" \
                        "$SERVER_URL/touch" >/dev/null 2>&1
                fi
                X=""
                Y=""
            fi
            ;;
    esac
done
