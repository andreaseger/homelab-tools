#!/bin/sh
# Command listener - polls /command for server-initiated commands
DIR="$(dirname "$0")/.."
CONF="$DIR/etc/kindle-dash.conf"
. "$CONF"

SEQ=0

while true; do
    RESP=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "$SERVER_URL/command?since=$SEQ" 2>/dev/null)

    if [ -n "$RESP" ]; then
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
    fi

    sleep 2
done
