# Kindle HASS Dashboard

Home Assistant dashboard for a single jailbroken Kindle Paperwhite (PW3, 1072×1448 e-ink).

## How rendering works

Two render paths share the same React widget tree:

- **`/`** – `react-dom/server` → HTML, served straight to a browser. Auto-refreshes via SSE on `/events`. This is the development view; iterate styling here.
- **`/render`** – React → satori (SVG) → resvg (PNG) → sharp (Floyd-Steinberg dither). Fed to the Kindle daemon.

Touch input from either path uses `/touch` and resolves against the most recently rendered touchmap.

## Configuring the dashboard

Pick what's on screen by editing **`config/pages.ts`** — see the comment at the top of that file for the widget catalog. Each entry is a widget id, a pixel `bbox`, and the widget's config (which usually includes a HASS `entity`). The Kindle resolution and start page live in `config/dashboard.ts`.

## Development

```bash
cp .env.example .env       # set HASS_URL, HASS_TOKEN, DASHBOARD_TOKEN
pnpm nx run kindle-hass-dashboard:dev
# open http://localhost:8080/  → live HTML preview
```

```bash
pnpm nx run kindle-hass-dashboard:typecheck
pnpm nx run kindle-hass-dashboard:test
pnpm nx run kindle-hass-dashboard:docker:build
```

## Kindle setup

1. Jailbreak the Kindle and install KUAL.
2. `kindle/install.sh [kindle-ip]`.
3. Edit `/mnt/us/extensions/kindle-dash/etc/kindle-dash.conf` on the device.
4. KUAL → Kindle Dashboard → Start.

## Environment

| Var                  | Required | Default     | Purpose                                        |
| -------------------- | -------- | ----------- | ---------------------------------------------- |
| `HASS_URL`           | yes      | —           | HASS URL, e.g. `http://home-assistant.svc:8123`|
| `HASS_TOKEN`         | yes      | —           | HASS long-lived access token                   |
| `DASHBOARD_TOKEN`    | yes      | —           | Bearer token for `/render`, `/touch`, etc.     |
| `PORT`               | no       | 8080        | HTTP port                                      |
| `LOG_LEVEL`          | no       | info        | Logging level                                  |
| `RENDER_DEBOUNCE_MS` | no       | 500         | Coalesce burst HASS events                     |
| `NODE_ENV`           | no       | development | —                                              |
| `EXPOSE_ENABLED`     | no       | false       | Enable matterbridge `/state` + `/command`      |
