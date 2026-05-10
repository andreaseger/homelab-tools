#!/bin/sh
# Touch coordinate debugger — prints raw touch coordinates to stdout.
# Run via SSH to verify touch coordinates match expected screen positions.
# Stops the Kindle framework temporarily (its UI grabs the touch device
# exclusively, so evtest can't read events while it's running). The
# dashboard screen image stays visible because eips writes directly to the
# framebuffer. Framework is restarted on Ctrl+C.
# Press Ctrl+C to stop.
DIR="$(dirname "$0")/.."
CONF="$DIR/etc/kindle-dash.conf"
[ -f "$CONF" ] && . "$CONF"

# List all input devices for diagnostics
list_inputs() {
    echo "Available input devices:"
    for dev in /dev/input/event*; do
        [ -e "$dev" ] || continue
        id=$(echo "$dev" | grep -o '[0-9]*')
        name=$(cat "/sys/class/input/event${id}/device/name" 2>/dev/null || echo "?")
        echo "  $dev  →  $name"
    done
}

# Find the touch device — try known names, then all event devices.
find_touch() {
    # Known Kindle touch driver names
    for name in cyttsp zforce maxtouch; do
        DEV=$(grep -l "$name" /sys/class/input/event*/device/name 2>/dev/null | head -1 | sed 's|/sys/class/input/|/dev/input/|' | sed 's|/device/name||')
        if [ -n "$DEV" ]; then echo "$DEV"; return 0; fi
    done
    # Fallback: use the first event device (often event1 on Kindle)
    DEV="/dev/input/event1"
    [ -e "$DEV" ] && echo "$DEV" && return 0
    echo ""
}

if [ -n "$EVENT_DEV" ]; then
    TOUCH_DEV="$EVENT_DEV"
else
    TOUCH_DEV=$(find_touch)
fi

# Stop the Kindle framework so evtest can grab the touch device.
# The dashboard bitmap stays on screen (eips writes directly to fb).
echo "Stopping Kindle framework to free the touch device..."
stop framework 2>/dev/null
sleep 1

# Restart framework on exit (Ctrl+C or script end).
trap 'echo; echo "Restarting framework..."; start framework 2>/dev/null' EXIT

list_inputs
echo ""

if [ -z "$TOUCH_DEV" ]; then
    echo "ERROR: No touch device found. Try setting EVENT_DEV manually in kindle-dash.conf."
    echo "Pick one from the list above that looks like a touch device."
    exit 1
fi

if [ ! -e "$TOUCH_DEV" ]; then
    echo "ERROR: Touch device $TOUCH_DEV does not exist."
    exit 1
fi

echo "Touch debug on $TOUCH_DEV (press Ctrl+C to stop)"
echo "Tap anywhere on the screen to see coordinates"
echo "Top-left should be ≈ (0, 0), bottom-right ≈ (1072, 1448)"
echo "Expected [X] button zone: x >= 976 && y < 96"
echo "---"

# Use script -f to force line-buffered output from evtest (otherwise
# stdio buffering prevents the pipe from seeing individual events).
script -f /dev/null -c "evtest $TOUCH_DEV" | while read -r line; do
    case "$line" in
        *"code 53"*)
            X=$(echo "$line" | grep -o 'value [0-9-]*' | awk '{print $2}')
            ;;
        *"code 54"*)
            Y=$(echo "$line" | grep -o 'value [0-9-]*' | awk '{print $2}')
            ;;
        *"Report Sync"*|*"SYN_REPORT"*)
            if [ -n "$X" ] && [ -n "$Y" ]; then
                printf "X=%-5s Y=%-5s  " "$X" "$Y"
                if [ "$X" -ge 976 ] && [ "$Y" -lt 96 ]; then
                    printf "[X] button zone"
                elif [ "$Y" -lt 96 ]; then
                    printf "header"
                fi
                printf "\n"
                X=""
                Y=""
            fi
            ;;
    esac
done
