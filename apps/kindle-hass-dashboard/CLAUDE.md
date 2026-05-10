# kindle-hass-dashboard

## Cross-language constants

`HEADER_HEIGHT` (px) and `STOP_X` (px) are duplicated across two languages with
no shared source:

- `server/render/page-view.tsx` — `HEADER_HEIGHT` reserves the top band for
  title/clock/[X] button and offsets widget bboxes. The [X] stop button is
  drawn at the left edge of the header.
- `kindle/extensions/kindle-dash/bin/touch-listener.sh` — `HEADER_HEIGHT` and
  `STOP_X` define the stop-button tap zone. A single tap inside
  `x < STOP_X && y < HEADER_HEIGHT` immediately runs stop.sh without
  forwarding to the server.

If you change the value in one place, change it in the other. There is no
import/build step that catches a mismatch.
