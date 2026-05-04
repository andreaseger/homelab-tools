Kindle HASS Dashboard - KUAL Extension
=======================================

Installation:
1. Ensure your Kindle is jailbroken with KUAL installed.
2. Run: ./install.sh [kindle-ip] (default: "kindle")
3. Edit /mnt/us/extensions/kindle-dash/etc/kindle-dash.conf on the Kindle:
   - SERVER_URL: URL of the dashboard service (e.g., http://192.168.1.100:8080)
   - DEVICE_ID: Device identifier (default: kindle1)
   - TOKEN: Bearer token matching DASHBOARD_TOKEN on the server
   - EVENT_DEV: Touch device path (auto-detected from cyttsp, or leave empty)
4. Restart KUAL (or reboot Kindle).
5. Open KUAL → Kindle Dashboard → Start Dashboard.

Usage:
- The screen updates within ~3 seconds of any HASS state change.
- Tap buttons/tabs to interact (light toggle, page navigation).
- KUAL → Kindle Dashboard → Stop Dashboard to return to normal Kindle operation.

Troubleshooting:
- Screen not updating: Check SERVER_URL and TOKEN in kindle-dash.conf.
- Touches not working: Verify EVENT_DEV with `cat /proc/bus/input/devices`.
- E-ink ghosting: Normal; full refresh happens every few updates.
- Status check: KUAL → Kindle Dashboard → Status.

Requirements:
- Jailbroken Kindle Paperwhite (PW3/7th gen or compatible)
- KUAL (Kindle Unified Application Launcher)
- curl and evtest installed on Kindle (via KUAL extensions or USBNetwork)
