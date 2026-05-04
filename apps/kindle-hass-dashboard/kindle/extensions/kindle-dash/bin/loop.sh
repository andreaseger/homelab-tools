#!/bin/sh
# Render loop - polls /render every 3s and updates screen via eips
DIR="$(dirname "$0")/.."
CONF="$DIR/etc/kindle-dash.conf"
. "$CONF"

ETAG=""
OUT_PNG="/var/tmp/kindle-dash-out.png"

while true; do
    if [ -n "$ETAG" ]; then
        RESP=$(curl -s -w "\n%{http_code}" -H "If-None-Match: $ETAG" \
            -H "Authorization: Bearer $TOKEN" \
            "$SERVER_URL/render?device=$DEVICE_ID" -o "$OUT_PNG" 2>/dev/null)
    else
        RESP=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $TOKEN" \
            "$SERVER_URL/render?device=$DEVICE_ID" -o "$OUT_PNG" 2>/dev/null)
    fi

    HTTP_CODE=$(echo "$RESP" | tail -1)

    if [ "$HTTP_CODE" = "200" ]; then
        ETAG=$(curl -s -I -H "Authorization: Bearer $TOKEN" \
            "$SERVER_URL/render?device=$DEVICE_ID" 2>/dev/null | grep -i etag | tr -d '\r' | awk '{print $2}')
        eips -g "$OUT_PNG"
    fi

    sleep 3
done
