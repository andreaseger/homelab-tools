#!/bin/sh
# Touch listener - uses evtest to capture touch events and POSTs to /touch
DIR="$(dirname "$0")/.."
CONF="$DIR/etc/kindle-dash.conf"
. "$CONF"

# Auto-detect touch device if not set
if [ -z "$EVENT_DEV" ]; then
    EVENT_DEV=$(grep -l "cyttsp" /sys/class/input/event*/device/name 2>/dev/null | head -1 | sed 's|/sys/class/input/|/dev/input/|' | sed 's|/device/name||')
    if [ -z "$EVENT_DEV" ]; then
        EVENT_DEV="/dev/input/event1"
    fi
fi

# Read current etag from render loop
get_etag() {
    curl -s -I -H "Authorization: Bearer $TOKEN" \
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
                ETAG=$(get_etag)
                curl -s -X POST -H "Content-Type: application/json" \
                    -H "Authorization: Bearer $TOKEN" \
                    -d "{\"x\":$X,\"y\":$Y,\"etag\":\"$ETAG\"}" \
                    "$SERVER_URL/touch" >/dev/null 2>&1
                X=""
                Y=""
            fi
            ;;
    esac
done
