#!/bin/sh
# Command listener - polls /command for server-initiated commands (e.g. backlight).
# /command only exists when EXPOSE_ENABLED=true on the server; on 404 we sleep
# long enough that the listener is effectively idle but still recovers if the
# server is later restarted with the flag enabled.
DIR="$(dirname "$0")/.."
CONF="$DIR/etc/kindle-dash.conf"
. "$CONF"

# Inherit CURL_OPTS from start.sh; fall back when invoked standalone.
if [ -z "$CURL_OPTS" ]; then
    CURL_OPTS="-m 10"
    [ "$INSECURE_TLS" = "1" ] && CURL_OPTS="$CURL_OPTS -k"
fi

SEQ=0
RESP_FILE="/var/tmp/kindle-dash-cmd.json"

while true; do
    HTTP_CODE=$(curl -s -o "$RESP_FILE" -w "%{http_code}" $CURL_OPTS \
        -H "Authorization: Bearer $TOKEN" \
        "$SERVER_URL/command?since=$SEQ" 2>/dev/null)

    case "$HTTP_CODE" in
        200)
            RESP=$(cat "$RESP_FILE" 2>/dev/null)
            CMDS=$(echo "$RESP" | grep -o '"kind":"[^"]*"' | cut -d'"' -f4)
            VALS=$(echo "$RESP" | grep -o '"value":[0-9]*' | cut -d: -f2)

            if [ -n "$CMDS" ]; then
                SEQ=$(echo "$RESP" | grep -o '"nextSince":[0-9]*' | cut -d: -f2)

                echo "$CMDS" | while read -r cmd; do
                    case "$cmd" in
                        set_backlight)
                            val=$(echo "$VALS" | head -1)
                            lipc-set-prop com.lab126.powerd flIntensity "$val" 2>/dev/null
                            ;;
                    esac
                done
            fi
            sleep 2
            ;;
        404)
            # EXPOSE_ENABLED=false on the server — feature disabled, idle.
            sleep 300
            ;;
        *)
            # Network error / transient server issue.
            sleep 30
            ;;
    esac
done
