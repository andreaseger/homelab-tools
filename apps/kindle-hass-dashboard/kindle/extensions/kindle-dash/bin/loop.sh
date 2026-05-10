#!/bin/sh
# Render loop - polls /render and updates screen via eips.
# Backs off on connection errors so a server outage doesn't drain the battery.
DIR="$(dirname "$0")/.."
CONF="$DIR/etc/kindle-dash.conf"
. "$CONF"

# Inherit CURL_OPTS from start.sh; fall back when invoked standalone.
if [ -z "$CURL_OPTS" ]; then
    CURL_OPTS="-m 10"
    [ "$INSECURE_TLS" = "1" ] && CURL_OPTS="$CURL_OPTS -k"
fi

ETAG=""
OUT_PNG="/var/tmp/kindle-dash-out.png"
HEADERS="/var/tmp/kindle-dash-headers.txt"
FAIL=0
FRAME=0
FULL_REFRESH_EVERY="${FULL_REFRESH_EVERY:-10}"

while true; do
    if [ -n "$ETAG" ]; then
        HTTP_CODE=$(curl -s -D "$HEADERS" -w "%{http_code}" $CURL_OPTS \
            -H "If-None-Match: $ETAG" \
            -H "Authorization: Bearer $TOKEN" \
            "$SERVER_URL/render" -o "$OUT_PNG" 2>/dev/null)
    else
        HTTP_CODE=$(curl -s -D "$HEADERS" -w "%{http_code}" $CURL_OPTS \
            -H "Authorization: Bearer $TOKEN" \
            "$SERVER_URL/render" -o "$OUT_PNG" 2>/dev/null)
    fi

    case "$HTTP_CODE" in
        200)
            NEW_ETAG=$(grep -i '^etag:' "$HEADERS" | tr -d '\r' | awk '{print $2}')
            [ -n "$NEW_ETAG" ] && ETAG="$NEW_ETAG"
            FRAME=$((FRAME + 1))
            if [ "$FULL_REFRESH_EVERY" -gt 0 ] \
               && [ $((FRAME % FULL_REFRESH_EVERY)) -eq 0 ]; then
                eips -f -g "$OUT_PNG"
            else
                eips -g "$OUT_PNG"
            fi
            FAIL=0
            sleep 3
            ;;
        304)
            FAIL=0
            sleep 3
            ;;
        *)
            # 0 (no connection), 5xx, 401, etc. — back off so we don't spin.
            FAIL=$((FAIL + 1))
            if [ $FAIL -ge 3 ]; then
                sleep 60
            else
                sleep 15
            fi
            ;;
    esac
done
