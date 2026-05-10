#!/bin/sh
# Touch listener - uses evtest to capture touch events and POSTs to /touch.
# Taps on the top-right [X] button (x >= STOP_X && y < HEADER_HEIGHT) shut
# the dashboard down immediately. Stop-button taps are NOT forwarded.
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
# [X] button tap zone — button is drawn at right: 28, width: 72 in the header.
# STOP_X = 1072 - 96 = 976 (generous zone that covers the button).
STOP_X=976

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

# Use script -f to force line-buffered output from evtest, otherwise stdio
# full-buffer mode (4096 bytes) causes long delays before events are seen.
# Track touch state so we only send one POST per physical tap.
# evtest emits a Report Sync for every position update (10+ per tap).
SENT=0
LAST_TRACK=""

script -f /dev/null -c "evtest $EVENT_DEV" | while read -r line; do
    # Parse evtest output. Two known formats:
    #   EV_ABS ABS_MT_POSITION_X  value 53  (busybox evtest)
    #   code 53 (MT X),           value 53  (Kindle firmware evtest)
    case "$line" in
        *"code 53"*)
            X=$(echo "$line" | grep -o 'value [0-9-]*' | awk '{print $2}')
            ;;
        *"code 54"*)
            Y=$(echo "$line" | grep -o 'value [0-9-]*' | awk '{print $2}')
            ;;
        *"code 57"*)
            # MT Tracking ID: new value >= 0 means a new finger touch started.
            TRACK=$(echo "$line" | grep -o 'value [0-9-]*' | awk '{print $2}')
            if [ "$TRACK" != "$LAST_TRACK" ] && [ "$TRACK" != "-1" ]; then
                LAST_TRACK="$TRACK"
                SENT=0
            fi
            ;;
        *"Report Sync"*|*"SYN_REPORT"*)
            if [ -n "$X" ] && [ -n "$Y" ] && [ "$SENT" = "0" ]; then
                SENT=1
                if [ "$X" -ge "$STOP_X" ] && [ "$Y" -lt "$HEADER_HEIGHT" ]; then
                    # [X] stop button — shut down immediately.
                    "$DIR/bin/stop.sh" --skip-touch
                    exit 0
                fi
                ETAG=$(get_etag)
                curl -s -X POST $CURL_OPTS -H "Content-Type: application/json" \
                    -H "Authorization: Bearer $TOKEN" \
                    -d "{\"x\":$X,\"y\":$Y,\"etag\":\"$ETAG\"}" \
                    "$SERVER_URL/touch" >/dev/null 2>&1 &
            fi
            X=""
            Y=""
            ;;
    esac
done
