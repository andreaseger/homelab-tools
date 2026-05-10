# kindle-hass-dashboard

## Cross-language constants

`HEADER_HEIGHT` (px) and `STOP_X` (px) are duplicated across two languages with
no shared source:

- `server/render/page-view.tsx` — `HEADER_HEIGHT` reserves the top band for
  clock/date/[X] button and offsets widget bboxes. The [X] stop button is
  drawn at the right edge of the header (position: absolute, right: 28,
  width: 72).
- `kindle/extensions/kindle-dash/bin/touch-listener.sh` — `HEADER_HEIGHT` and
  `STOP_X` define the stop-button tap zone. A single tap inside
  `x >= STOP_X && y < HEADER_HEIGHT` (top-right corner) immediately runs
  stop.sh without forwarding to the server.

If you change the value in one place, change it in the other. There is no
import/build step that catches a mismatch.

## Touch debugging

There is a standalone debug script on the Kindle that prints raw touch
coordinates to stdout:

    /mnt/us/extensions/kindle-dash/bin/touch-debug.sh

Run it over SSH, tap the screen, and verify:

- Top-left is near (0, 0)
- Bottom-right is near (1072, 1448)
- The [X] button zone (x >= 976, y < 96) corresponds to the visual button

If coordinates are wrong (inverted axes, wrong range, swapped X/Y), the
touch-listener.sh may need a coordinate transform before forwarding taps
to the server.
