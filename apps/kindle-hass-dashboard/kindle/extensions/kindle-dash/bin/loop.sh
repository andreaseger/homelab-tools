#!/bin/sh
# Render loop - polls /render every 3s and updates screen via eips
DIR="$(dirname "$0")/.."
CONF="$DIR/etc/kindle-dash.conf"
. "$CONF"

ETAG=""
OUT_PNG="/var/tmp/kindle-dash-out.png"
HEADERS="/var/tmp/kindle-dash-headers.txt"

while true; do
    if [ -n "$ETAG" ]; then
        HTTP_CODE=$(curl -s -D "$HEADERS" -w "%{http_code}" \
            -H "If-None-Match: $ETAG" \
            -H "Authorization: Bearer $TOKEN" \
            "$SERVER_URL/render?device=$DEVICE_ID" -o "$OUT_PNG" 2>/dev/null)
    else
        HTTP_CODE=$(curl -s -D "$HEADERS" -w "%{http_code}" \
            -H "Authorization: Bearer $TOKEN" \
            "$SERVER_URL/render?device=$DEVICE_ID" -o "$OUT_PNG" 2>/dev/null)
    fi

    if [ "$HTTP_CODE" = "200" ]; then
        NEW_ETAG=$(grep -i '^etag:' "$HEADERS" | tr -d '\r' | awk '{print $2}')
        [ -n "$NEW_ETAG" ] && ETAG="$NEW_ETAG"
        eips -g "$OUT_PNG"
    fi

    sleep 3
done
