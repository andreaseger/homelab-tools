# Kindle HASS Dashboard Service (v2 plan)

## Context

A jailbroken Kindle Paperwhite 7th gen (PW3, 2015 — 1072×1448, 6", 300 PPI, 16-grey, touch) sits near the user's homelab, unused. The user runs Home Assistant on their k8s cluster and wants to repurpose the Kindle as an event-driven, touch-interactive HASS dashboard.

Goal: a new Bun-based middleware service in this Nx monorepo that talks to Home Assistant and renders e-ink-friendly PNG dashboards for the Kindle, plus a KUAL extension that polls images and forwards taps. The Kindle is a dumb terminal; all logic lives in the service, so layout/feature changes need no Kindle redeploy. Multiple pages (status overview, lights per room), reusable widgets configured by entity + display options, and a built-in `/preview/:device` dev view that renders identically to the Kindle output.

Confirmed design choices:
- **Renderer:** Satori (React → SVG) + `@resvg/resvg-js` (SVG → PNG) + Sharp (greyscale + Floyd-Steinberg 16-level dither). Pure JS + one native binding, ~5 MB of dependency footprint. Same render function feeds `/preview/:device` (served as inline PNG in an HTML shell) and the Kindle `/render` route — single source of truth.
- **Snapshot tests:** `bun test` with pixel-diff snapshot baselines. The renderer is a pure function `(device, state) → {png, touchmap}`; no browser, no separate Nx e2e project, no `@nx/playwright`.
- **Architecture:** amd64-only — drops `platform:arm64` tag.
- **Kindle framework:** coexist (leave framework running, suppress screensaver only).
- **HASS client:** consume `home-assistant-js-websocket` directly (auth + ws + subscribe + callService + auto-reconnect + auto-resubscribe). Bun's native `globalThis.WebSocket` satisfies the lib's runtime requirement — no `ws` polyfill expected. No custom `packages/hass-client`; the app imports the lib and uses Bun `fetch` for the REST `/api/history` endpoint.
- **Single workspace project:** dashboard app under `apps/kindle-hass-dashboard/`. No new `packages/*` entry.
- **Single runtime:** Bun-only image (`oven/bun:1` base). No chromium, no Node.
- **Render gating:** single 500 ms debounce on HASS state_changed. Noisy widgets round at format time (`decimals: 0`) instead of via a separate predicate layer. A single global per-minute synthetic tick feeds the page-bus for clock-style widgets.
- **Wire protocol:** Kindle polls `GET /render?device=X` every 3 s with `If-None-Match: <last-etag>`. Server returns 304 when unchanged (zero PNG cost) or 200 + new PNG + new etag. No long-poll, no pending-waiters, no hold timer. Kindle e-ink full refresh is ~800 ms; 3 s polling latency is invisible.
- **Dev preview:** `GET /preview/:device` returns a tiny HTML shell with the render PNG inline and a 20-line script that turns clicks into `POST /touch`. No SPA, no Tailwind, no hmr ws. `bun --hot` on the server + a 2 s meta-refresh in dev mode.
- **Self-exposure to HASS (M7, last):** ship a Matterbridge plugin co-located in `matter-plugin/`. matterbridge is plain TypeScript; **runs under Bun in the same container** as the dashboard service (no separate Node sidecar). The container entrypoint spawns `bun /app/node_modules/matterbridge/bin/matterbridge.js` as a background process; the plugin talks to the dashboard via loopback HTTP. HASS picks up the bridged Matter device via its Matter integration; same plugin works for Apple Home / Google Home / Alexa. Bun-on-matter.js needs an early spike on UDP IPv6 multicast; fallback is to drop a `node` binary into the image and run matterbridge under that, still one container.

## Architecture

```
+----------------------------+   +-------------------------------------+   +-----------------+
| Kindle PW3 (KUAL ext)      |   | apps/kindle-hass-dashboard (Bun)    |   | Home Assistant  |
|                            |   |                                     |   |                 |
|  loop (3s):                |   | GET  /render?device=  + If-None-    |   | /api/websocket  |
|   curl -o out.png /render -+-->|      Match  -> 200 PNG or 304       |   | /api/services   |
|   eips -g out.png          |   | POST /touch  {device,x,y,etag}      |   | /api/history    |
|   evtest /dev/input/eventN |   | GET  /preview/:device (HTML+PNG)    |   |                 |
|   curl /touch -------------+-->| GET  /health                        |   |                 |
|   curl /command (M7) ------+-->| GET  /state (M7)                    |   |                 |
|                            |   | POST /command (M7)                  |   |                 |
|                            |   |                                     |   |                 |
|                            |   | DeviceState (page, etag, touchmap)  |   |                 |
+----------------------------+   | Renderer (React -> Satori -> resvg  |   |                 |
                                 |           -> Sharp dither)          |   |                 |
                                 | Pager    (resolve tap -> Action)    |   |                 |
                                 | PageBus  (HASS events -> render)    |   |                 |
                                 |                                     |   |                 |
                                 | home-assistant-js-websocket         |<==>|  ws subscribe  |
                                 +-------------------------------------+   +--------^--------+
                                            ^   |                                   |
                              loopback HTTP |   | (bearer-guarded)                  | Matter (M7)
                                            |   v                                   | (LAN)
                                 +-------------------------------------+             |
                                 | matterbridge (background, Bun) (M7)|             |
                                 |   plugin: matter-plugin/            +-------------+
                                 +-------------------------------------+
                                 (same container as dashboard service)
```

**Render flow:** HASS `state_changed` → PageBus (scoped to current page's entity set per device) → 500 ms debounce → React tree → Satori SVG → resvg PNG (1072×1448) → Sharp greyscale + 16-level Floyd-Steinberg → ETag = `sha256(png + touchmapVersion)` → stored on `DeviceState.currentEtag`. Next `/render` poll returns 200 + new PNG; until then, 304.

**Touch flow:** Kindle posts `{device, x, y, etag}` → server rejects with 409 if etag stale → top-most hit-zone in current touchmap → action: `navigate` (page swap) or `service` (HASS service call) → render is re-triggered → next poll returns the new image.

**Command flow (M7, last):** Kindle daemon polls `GET /command?device=&since=<seq>` alongside `/render`. Server emits commands like `{kind:'set_backlight', value:18}`, which the daemon executes via `lipc-set-prop com.lab126.powerd flIntensity`. Commands originate from the Matterbridge plugin: a HASS user toggles the bridged Matter `light.kindle_dash_kindle1_backlight` → matterbridge plugin POSTs `/command` → dashboard enqueues a per-device command. Device state (`current_page`, `paused`, `last_render_at`) flows the other way via `GET /state`, which the plugin polls (or subscribes to via `/state/ws` if needed) and mirrors into Matter cluster attributes.

## File layout

```
apps/kindle-hass-dashboard/
  project.json                tags ["npm:private","platform:amd64"]; targets dev/typecheck/test/docker:build
  package.json                @ohoio/kindle-hass-dashboard; deps: home-assistant-js-websocket, react,
                              satori, @resvg/resvg-js, sharp, zod, date-fns
  tsconfig.json bunfig.toml
  Dockerfile                  oven/bun:1 only
  README.md .env.example

  config/
    pages.ts                  typed page/widget config (deployment artifact for layout)
    devices.ts                device-id -> startPage; per-device size/rotation

  server/
    index.ts                  Bun.serve: routes + dev preview (mirror apps/api-portal/server/index.ts)
    config.ts                 zod-validate config files
    devices.ts                DeviceState (currentPage, currentEtag, touchmap, lastEntityValues)
    pager.ts                  resolveTap(device,x,y) -> Action
    page-bus.ts               HASS state_changed fan-out, scoped per device's current page; 500ms debounce
    renderer.ts               render(device): Satori(<Page/>) -> resvg PNG -> Sharp dither; returns {png, etag, touchmap}
    hass.ts                   ~50 LOC wrapper: createConnection({ createSocket: () => new WebSocket(...) }),
                              subscribeEntities, callService, getHistory (REST via Bun fetch)
    auth.ts                   bearer token middleware (DASHBOARD_TOKEN)
    commands.ts               (M7) per-device command queue feeding /command
    render/
      ssr.tsx                 React tree -> Satori; collects hot-zones via render-context provider
      eink.ts                 Sharp greyscale + Floyd-Steinberg + 16-level palette
      eink.css                hand-written CSS (Satori-compatible subset) tuned for 16-grey contrast
    routes/
      render.ts touch.ts preview.ts health.ts
      state.ts command.ts     (M7)

  widgets/
    index.ts types.ts
    SensorValue.tsx BinarySensor.tsx LightToggle.tsx LineGraph.tsx Clock.tsx PageTabs.tsx

  shared/types.ts             Action, BBox, ActionHotZone, RenderResult, WidgetSpec, PageConfig, DeviceProfile

  test/
    pager.test.ts             hit-test geometry
    config.test.ts            zod validation
    render-snapshot.test.ts   pure render() with mock state, pixel-diff snapshots
    __snapshots__/            baseline PNGs (committed)

  kindle/
    extensions/kindle-dash/
      menu.json               KUAL menu (Start/Stop/Status)
      bin/{start,stop,status,loop,render-once,touch-listener}.sh
      bin/command-listener.sh                           (M7)
      etc/kindle-dash.conf    SERVER_URL, DEVICE_ID, TOKEN, EVENT_DEV
      README.txt
    install.sh                scp/rsync to /mnt/us/extensions/

  fluxcd/
    deployment.yaml service.yaml ingress.yaml secret.example.yaml kustomization.yaml README.md
    pvc-matter.yaml                                     (M7)

  matter-plugin/                                        (M7) co-located, NOT a workspace package
    package.json              local manifest (name, main=dist/index.js, peerDep matterbridge)
    tsconfig.json             extends app tsconfig; emits dist/
    src/index.ts              DynamicPlatform: per-Kindle Bridged Node (OnOff paused,
                              LevelControl backlight, GenericSwitch page tabs)
    src/dashboard-client.ts   fetch wrapper for KINDLE_DASH_URL/{state,command} with bearer
    src/cluster-mapping.ts    dashboard state -> Matter cluster attributes
    test/index.test.ts        bun test against a fake dashboard server

  entrypoint.sh                                         (M7) spawns matterbridge; exec's server
```

## Core types (shared/types.ts)

```ts
export type DeviceId = string;
export interface BBox { x: number; y: number; w: number; h: number }
export type Action =
  | { kind: 'navigate'; pageId: string }
  | { kind: 'service'; domain: string; service: string;
      target?: { entity_id?: string | string[]; area_id?: string };
      data?: Record<string, unknown> }
  | { kind: 'noop' };
export interface ActionHotZone { bbox: BBox; action: Action; debug?: string }
export interface RenderResult {
  png: Uint8Array; etag: string; touchmap: ActionHotZone[];
  pageId: string; width: number; height: number;
}
export interface WidgetSpec<C = unknown> {
  id: string;
  defaults?: Partial<C>;
  entities?: (config: C) => string[];
  render: (config: C, ctx: WidgetCtx) => Promise<JSX.Element> | JSX.Element;
}
export interface PageConfig { id: string; title: string; layout: PlacedWidget[] }
export interface PlacedWidget { widget: string; bbox: BBox; config: unknown }
export interface DeviceProfile {
  id: DeviceId; width: number; height: number; rotation?: 0|90|180|270;
  startPageId: string; navStripHeight?: number;
}
```

## v1 widget set

| ID | Props | Actions |
|---|---|---|
| `sensor-value` | `{entity, label?, decimals?}` | none |
| `binary-sensor` | `{entity, label?, iconOn?, iconOff?}` | none |
| `light-toggle` | `{entity, label?}` | tap → `service: light.toggle` |
| `line-graph` | `{entity, hours, label?, yMin?, yMax?, bucketMinutes?}` | none — hand-rolled `<svg>` (vector all the way to resvg) |
| `clock` | `{format?: '24h'\|'12h', showDate?}` | none — driven by the global 1-minute synthetic tick |
| `page-tabs` | `{pages: [{id,label}]}` | tap each → `navigate: pageId` |

Widgets are pure `(config, ctx) => JSX`. They register hot-zones through `ctx.registerHotZone(...)` during render. Layouts use fixed sizes and the Satori-compatible CSS subset (flex, borders, backgrounds, fonts). In practice only 4 grey levels are used.

## Reference files to mirror (already verified)

- `apps/api-portal/server/index.ts:77-160` — `Bun.serve` with routes + websocket upgrade; copy structure (drop the ws upgrade part for v1).
- `apps/api-portal/project.json:7-33` — target shape for `dev`, `typecheck`, `docker:build`.
- `apps/api-portal/package.json` — `@ohoio/<app>`, `type=module`, no scripts.
- `apps/api-portal/Dockerfile:1-43` — 2-stage pnpm-deploy → `oven/bun:1`.
- `apps/homelab-k8s-dashboard/fluxcd/{deployment,ingress}.yaml` — k8s + Flux manifest pattern, `gethomepage.dev` annotations.

## Dockerfile

Single runtime (Bun), no chromium, no Node binary in v1.

```Dockerfile
# apps/kindle-hass-dashboard/Dockerfile
FROM node:22-slim AS deps
RUN corepack enable pnpm
WORKDIR /app
COPY --from=workspace package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --from=workspace apps/kindle-hass-dashboard/package.json apps/kindle-hass-dashboard/
COPY --from=workspace apps/api-portal/package.json apps/api-portal/
COPY --from=workspace apps/obsidian-syncer/package.json apps/obsidian-syncer/
COPY --from=workspace apps/homelab-k8s-dashboard/package.json apps/homelab-k8s-dashboard/
RUN pnpm install --frozen-lockfile
RUN pnpm deploy --filter=@ohoio/kindle-hass-dashboard --prod /deploy

FROM oven/bun:1
LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
WORKDIR /app
COPY --from=deps /deploy/node_modules ./node_modules
COPY server  ./server
COPY widgets ./widgets
COPY shared  ./shared
COPY config  ./config
COPY bunfig.toml tsconfig.json ./
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["bun", "run", "server/index.ts"]
```

Target image size: ≤ 100 MB. amd64 only.

**M7 Dockerfile additions** (applied only at M7):
- `COPY matter-plugin ./matter-plugin`
- `RUN bun build matter-plugin/src/index.ts --outdir matter-plugin/dist --target bun`
- `COPY entrypoint.sh ./ && RUN chmod +x entrypoint.sh`
- `ENV EXPOSE_PORT=8081 MATTERBRIDGE_FRONTEND=8283`
- `EXPOSE 8081 8283`
- `VOLUME ["/root/.matterbridge"]`
- `ENTRYPOINT ["./entrypoint.sh"]` replacing the `CMD`.
- Fallback if Bun-on-matter.js spike fails: add `RUN apt-get update && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*` and flip `bun` → `node` for the matterbridge line in `entrypoint.sh`. No other changes.

```sh
# entrypoint.sh (M7)
#!/usr/bin/env bash
set -e
if [ "${EXPOSE_ENABLED:-false}" = "true" ]; then
  bun /app/node_modules/matterbridge/dist/cjs/cli.js --add /app/matter-plugin --bridge &
fi
exec bun run server/index.ts
```

## Env vars

| Var | Required | Default | Purpose |
|---|---|---|---|
| `HASS_URL` | yes | — | e.g. `http://home-assistant.home-assistant.svc:8123` |
| `HASS_TOKEN` | yes | — | HASS long-lived token |
| `DASHBOARD_TOKEN` | yes | — | Bearer for Kindle daemons, `/preview` cookie auth, and (M7) `/state` + `/command` |
| `PORT` | no | 8080 | |
| `LOG_LEVEL` | no | info | |
| `RENDER_DEBOUNCE_MS` | no | 500 | Coalesce burst HASS events |
| `NODE_ENV` | no | development | Toggles dev meta-refresh + `/preview` |
| `EXPOSE_ENABLED` | M7 | `false` | When `true`, mount `/state` + `/command` **and** start matterbridge background process |
| `KINDLE_DASH_URL` | M7 | `http://127.0.0.1:8080` | URL the matterbridge plugin uses to reach the dashboard (loopback) |
| `MATTERBRIDGE_DIR` | M7 | `/root/.matterbridge` | Matter fabric/cache; mount a PVC here |

One token end-to-end. The matterbridge plugin receives `DASHBOARD_TOKEN` via the entrypoint env.

## Phased milestones (each independently mergeable)

1. **M1 — scaffold + stub render.** Clone api-portal layout. `Bun.serve` with `/health`, stub `/render` (Sharp solid-color placeholder PNG), `/preview/:device` returning an HTML shell that embeds that same PNG + a click-to-`/touch` script. Verify `nx run kindle-hass-dashboard:dev`.
2. **M2 — HASS state subscription.** Add `home-assistant-js-websocket`; write `server/hass.ts` (~50 LOC) that calls `createConnection({ createSocket: () => new WebSocket(\`${HASS_URL}/api/websocket\`) })` with the long-lived token and exposes `subscribeEntities`, `callService`, `getHistory`. **Spike Bun's `globalThis.WebSocket` against the lib** — the only realistic compat risk. Smoke test: log live `state_changed` events from real HASS. Fallback if the spike fails: add `ws` and pass `createSocket` explicitly.
3. **M3 — widget framework + Satori render pipeline.** Implement `WidgetSpec` contract, registry, `page-bus`, `devices`, `pager`, and the React → Satori → resvg → Sharp pipeline. Ship `clock`, `sensor-value`, `binary-sensor`, `page-tabs`. `/preview/:device` renders real page HTML; dev meta-refresh updates the browser. ETag-based polling on `/render` (200 or 304). Global 1-minute synthetic tick drives clock widgets.
4. **M4 — KUAL daemon.** Build `kindle/extensions/kindle-dash/`: `menu.json`, `start.sh`, `stop.sh`, `status.sh`, `loop.sh` (3 s poll, `curl -H 'If-None-Match'`, `eips -g` on 200), `render-once.sh`, `touch-listener.sh` (`evtest` → `/touch`). `install.sh` scp helper. Verify on Kindle: install, Start, screen updates within ~3 s of HASS change.
5. **M5 — touch + actions + line-graph.** Touch listener posts to `/touch`; server resolves via touchmap; etag in body → 409 for stale taps. Ship `light-toggle`; `page-tabs` interactive. Ship `line-graph` (history fetch, hand-rolled `<svg>`). Dev preview clicks already map to `/touch` from M1 — regression-test here.
6. **M6 — hardening + manifests.** `fluxcd/deployment.yaml`, `service.yaml`, `ingress.yaml`, `secret.example.yaml`, `kustomization.yaml`. Bearer auth enforced on all routes. `/touch` rate limit (10/s/device). Snapshot tests committed (`test/__snapshots__/*.png`). README (env, KUAL install, troubleshooting). `container-build.yml` auto-publishes `ghcr.io/andreaseger/kindle-hass-dashboard:latest` on merge to main.
7. **M7 — Matterbridge self-exposure (last).** **Spike first:** confirm `bun matterbridge --bridge` boots and pairs (Matter mDNS / IPv6 multicast on Bun is the only realistic blocker). Add routes `/state` + `/command` (token-guarded, same `DASHBOARD_TOKEN`). Build `matter-plugin/` (DynamicPlatform: per-Kindle Bridged Node with OnOff for paused, LevelControl for backlight 0–100 → `flIntensity` 0–24, GenericSwitch for page tabs). Plugin reads state and posts commands to `$KINDLE_DASH_URL`. Add `command-listener.sh` to KUAL daemon (polls `/command`, dispatches via `lipc-set-prop`). Add `entrypoint.sh`, PVC for `/root/.matterbridge`, Dockerfile additions. Docs: pairing flow (matterbridge web UI on 8283 → HASS Matter integration → scan QR). Fallback if Bun-on-matter.js fails: install `nodejs` in the image and flip `bun` → `node` for the matterbridge line in `entrypoint.sh`.

## Verification

- **No-Kindle dev loop:** every milestone exposes `/preview/:device` — an HTML shell with the inline render PNG and click-to-`/touch`. M1–M3, M5 fully testable in browser against real HASS.
- **Real HASS in dev.** No `MOCK_HASS` mode; dev points at the real cluster. Tests inject state directly into `render(device, state)`.
- **Unit tests (`bun test`):**
  - `pager.test.ts` — hit-test geometry (also covers touch-flow assertions).
  - `config.test.ts` — zod validation of `pages.ts` / `devices.ts`.
  - `render-snapshot.test.ts` — pure `render(device, mockState)` with pixel-diff baselines committed under `test/__snapshots__/`.
- **End-to-end on Kindle (manual, in `kindle/README.txt`):** install KUAL extension, Start, flip a HASS switch, observe screen update within ~3 s; tap a button, see HASS state change in HASS log; switch pages via PageTabs; Stop returns control to framework.
- **Image size:** `nx run kindle-hass-dashboard:docker:build && docker images` — target ≤ 100 MB for M1–M6; M7 adds matterbridge + (if fallback triggered) `nodejs`, target ≤ 250 MB.
- **CI:** `pnpm nx affected -t format lint test build typecheck` on PR via `.github/workflows/ci.yml`.

## Critical files to create

- `apps/kindle-hass-dashboard/server/index.ts`
- `apps/kindle-hass-dashboard/server/hass.ts`
- `apps/kindle-hass-dashboard/server/renderer.ts`
- `apps/kindle-hass-dashboard/server/pager.ts`
- `apps/kindle-hass-dashboard/server/render/ssr.tsx`
- `apps/kindle-hass-dashboard/server/render/eink.ts`
- `apps/kindle-hass-dashboard/widgets/{SensorValue,LightToggle,LineGraph,PageTabs,Clock,BinarySensor}.tsx`
- `apps/kindle-hass-dashboard/config/{pages,devices}.ts`
- `apps/kindle-hass-dashboard/kindle/extensions/kindle-dash/bin/loop.sh`
- `apps/kindle-hass-dashboard/fluxcd/deployment.yaml`
- `apps/kindle-hass-dashboard/matter-plugin/src/index.ts` (M7)
- `apps/kindle-hass-dashboard/entrypoint.sh` (M7)
- `apps/kindle-hass-dashboard/fluxcd/pvc-matter.yaml` (M7)

## Open risks

1. **Image size.** `oven/bun:1` + deps target ≤ 100 MB for v1. M7 adds matterbridge (~40 MB) and possibly `nodejs` (~50 MB) if Bun-on-matter.js fallback triggers.
2. **PW3 touch device path.** `/dev/input/eventN` numbering varies by firmware. Auto-detect from `/proc/bus/input/devices` (cyttsp); make `EVENT_DEV` overridable in `kindle-dash.conf`.
3. **Stale-tap race.** Tap arriving between render and the obsoleting `state_changed` could hit a stale button. Mitigated by including `etag` in `/touch` body; server returns 409 on mismatch; daemon refetches.
4. **HASS reconnect storms.** `home-assistant-js-websocket` handles reconnect + resubscribe; add log dampening and a connectivity gauge on `/health`.
5. **Bun `WebSocket` compat with `home-assistant-js-websocket`.** Lib does `globalThis.WebSocket || require('ws')`. Bun has `globalThis.WebSocket`; should work. Spike in M2 with a 10-line script before committing. Fallback: install `ws` and pass `createSocket` explicitly.
6. **Layout config bundled into image.** Layout changes require rebuild for v1. v2: support `CONFIG_DIR` mounted from a ConfigMap with hot-reload.
7. **`/preview` auth.** Production requires the bearer token even on `/preview` (token-cookie set via `/preview-login?token=`); slight friction for the dev-in-browser story.
8. **Satori CSS subset.** No Tailwind, no transforms, limited CSS. Already accepted — the Kindle render path always wanted hand-written CSS tuned for 16-grey. Chart widgets (`line-graph`) are hand-rolled `<svg>`, which is actually cleaner than rasterizing a DOM chart library.
9. **Matterbridge state freshness (M7).** Plugin polling `/state` introduces lag. Mitigation A (preferred): add `/state/ws` that pushes diffs. Mitigation B: 1 s poll + `If-None-Match`. Decide in M7 spike.
10. **Matter pairing UX (M7).** Matterbridge appears as a *new* Matter bridge in HASS; user adds it via Settings → Matter → Add device → scan QR from matterbridge web UI on port 8283. Document in `fluxcd/README.md`. PVC for `/root/.matterbridge` is mandatory (loses fabric on pod recreate otherwise).
11. **Bun running matterbridge / matter.js (M7).** matterbridge docs say "Node 20+/22+/24 LTS". Likely-fine under Bun: dynamic import, crypto, timers, Buffer, fs. Risky: dgram IPv6 multicast (Matter mDNS commissioning). Mitigation: M7 starts with a 1-day spike (`bun matterbridge --bridge`, attempt pairing). Fallback: install `nodejs` in the image, flip `bun` → `node` in `entrypoint.sh` for the matterbridge line only. Dashboard server stays on Bun regardless.
