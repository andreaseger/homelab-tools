Kindle HASS Dashboard - KUAL Extension
=======================================

Tested on a 7th-generation Kindle Paperwhite (PW3, 1072x1448 @ 300dpi).
Other Kindle models will render at the wrong resolution unless
config/dashboard.ts on the server is updated to match the device's
native screen size.

Installation:
1. Ensure your Kindle is jailbroken with KUAL installed and the binaries
   listed under "Requirements" below are available.
2. Run: ./install.sh [kindle-ip]   (default host: "kindle")
3. Edit /mnt/us/extensions/kindle-dash/etc/kindle-dash.conf on the Kindle:
   - SERVER_URL:   URL of the dashboard service
                   (e.g., http://192.168.1.100:8080 or https://...)
   - TOKEN:        Bearer token matching DASHBOARD_TOKEN on the server
   - EVENT_DEV:    Touch device path (auto-detected from cyttsp; override
                   if your model uses a different driver)
   - INSECURE_TLS: Set to 1 to skip TLS cert validation (for self-signed
                   or internal-CA https endpoints). Leave 0 for plain http
                   or real public certs.
4. Restart KUAL (or reboot the Kindle).
5. Open KUAL -> Kindle Dashboard -> Start Dashboard.

Usage:
- Start probes the server (5 retries, ~3s apart) before launching the
  background pollers. If it can't reach SERVER_URL, or the TOKEN is
  rejected, it exits immediately with an eips error message instead of
  leaving silent loops running.
- After a successful start, screen updates within ~3s of any HASS state
  change. On connection failure the render loop backs off (15s after a
  transient error, 60s after sustained outage) so the battery isn't
  drained, and recovers automatically when the server returns.
- Tap buttons/tabs to interact (light toggle, page navigation).
- To stop and return to normal Kindle operation, EITHER:
    * tap the [X] button in the top-left of the screen — this is the
      only stop gesture reachable while the dashboard owns the screen
      and touch input, OR
    * SSH in and run /mnt/us/extensions/kindle-dash/bin/stop.sh, OR
    * use KUAL -> Kindle Dashboard -> Stop Dashboard (only reachable if
      KUAL is somehow on top, e.g. after a power-button restart).

Troubleshooting:
- Screen not updating: check SERVER_URL and TOKEN in kindle-dash.conf.
- Touches not working: verify EVENT_DEV with
    cat /proc/bus/input/devices
  and look for the touch panel device.
- E-ink ghosting: normal; full refresh happens periodically.
- Status check: KUAL -> Kindle Dashboard -> Status.

Requirements:
- Jailbroken Kindle Paperwhite (7th-gen / PW3) with KUAL installed.
- Root SSH access to the Kindle (typically via the USBNetwork extension)
  for ./install.sh to scp files into /mnt/us/extensions/.
- `curl` and `evtest` available in $PATH on the device. Stock busybox
  does NOT ship them; both are commonly bundled with one of:
    * USBNetwork
    * kterm
    * mrpi
  Verify with `which curl evtest` over SSH before running install.sh.
- `eips` and `lipc-set-prop` are provided by Kindle firmware (no setup).

Notes:
- KUAL does not autostart extensions on boot. After a reboot, re-tap
  "Start Dashboard" from the KUAL menu.
- The optional /command poll (server-initiated backlight control)
  requires EXPOSE_ENABLED=true on the server. With it off the listener
  rechecks every 5 minutes and otherwise idles.
- TLS: https SERVER_URL works as long as the on-device curl is built
  with SSL (most jailbreak distributions are). For self-signed or
  internal-CA certs, set INSECURE_TLS=1; the device CA bundle is often
  outdated/missing, so verification against real public certs may also
  need this. Plain http on the LAN is fine — the bearer token still
  guards every endpoint.
