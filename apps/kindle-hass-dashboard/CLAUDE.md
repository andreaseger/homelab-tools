# kindle-hass-dashboard

## Cross-language constants

`HEADER_HEIGHT` (px) is duplicated across two languages with no shared source:

- `server/render/page-view.tsx` — used by Satori/PNG and HTML rendering to
  reserve the top band for title/clock and offset widget bboxes.
- `kindle/extensions/kindle-dash/bin/touch-listener.sh` — used by the Kindle
  exit gesture (3 taps in `y < HEADER_HEIGHT` within 3s shuts the dashboard
  down without forwarding to the server).

If you change the value in one place, change it in the other. There is no
import/build step that catches a mismatch.
