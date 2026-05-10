#!/bin/sh
# Touch listener - uses evtest to capture touch events and POSTs to /touch.
# Taps in the top-left [X] button (x < 96 && y < HEADER_HEIGHT) shut the
# dashboard down immediately, without ever leaving the device. Stop-button
# taps are NOT forwarded to the server.
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
# [X] button tap zone (must match the visual button drawn in page-view.tsx).
STOP_X=96

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
                if [ "$X" -lt "$STOP_X" ] && [ "$Y" -lt "$HEADER_HEIGHT" ]; then
                    # [X] stop button — shut down immediately.
                    "$DIR/bin/stop.sh" --skip-touch
                    exit 0
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
