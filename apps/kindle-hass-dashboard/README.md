# Kindle HASS Dashboard

Home Assistant dashboard service for jailbroken Kindle Paperwhite (PW3, 1072×1448 e-ink display). Renders e-ink-friendly PNG dashboards with touch interaction.

## Architecture

- **Bun server** — routes for `/render` (PNG), `/touch` (tap events), `/preview/:device` (dev view)
- **Renderer** — React → Satori (SVG) → @resvg/resvg-js (PNG) → Sharp (Floyd-Steinberg 16-level dither)
- **HASS client** — `home-assistant-js-websocket` for live entity subscriptions + REST `/api/history`
- **Kindle daemon** — KUAL extension polling `/render` every 3s, `evtest` for touch capture

## Development

```bash
# Set environment
cp .env.example .env
# Edit .env with real HASS_URL, HASS_TOKEN, DASHBOARD_TOKEN

# Run dev server
pnpm nx run kindle-hass-dashboard:dev

# Typecheck
pnpm nx run kindle-hass-dashboard:typecheck

# Test
pnpm nx run kindle-hass-dashboard:test

# Build Docker image
pnpm nx run kindle-hass-dashboard:docker:build
```

## Kindle Setup

1. Jailbreak Kindle and install KUAL
2. Run `kindle/install.sh [kindle-ip]`
3. Edit `/mnt/us/extensions/kindle-dash/etc/kindle-dash.conf` on the Kindle
4. KUAL → Kindle Dashboard → Start

## Environment Variables

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `HASS_URL` | yes | — | HASS URL (e.g., `http://home-assistant.svc:8123`) |
| `HASS_TOKEN` | yes | — | HASS long-lived access token |
| `DASHBOARD_TOKEN` | yes | — | Bearer token for Kindle daemon + preview auth |
| `PORT` | no | 8080 | HTTP port |
| `LOG_LEVEL` | no | info | Logging level |
| `RENDER_DEBOUNCE_MS` | no | 500 | Coalesce burst HASS events |
| `NODE_ENV` | no | development | Toggles dev meta-refresh |
