import { serve } from 'bun';
import { serveHealth } from './routes/health';
import { servePng } from './routes/render';
import { handleTouch } from './routes/touch';
import { serveDashboard, serveFragment } from './routes/dashboard';
import { serveEvents } from './routes/events';
import { serveState } from './routes/state';
import { serveCommand } from './routes/command';
import { pageBus } from './page-bus';
import { onEntitiesChange } from './hass';
import { state } from './state';
import { pages } from '../config/pages';
import { authMiddleware } from './auth';
import { rateLimit } from './rate-limit';
import { getWidget } from '../widgets';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const EXPOSE_ENABLED = process.env.EXPOSE_ENABLED === 'true';

// Per-entity fingerprint (last_updated, falling back to state) so we can detect
// which entities actually changed and only refresh when something the current
// page subscribes to has moved. Without this, every HASS push triggers a tick.
const entityFingerprints = new Map<string, string>();

onEntitiesChange((entities) => {
  const page = pages.find((p) => p.id === state.currentPage);
  if (!page) return;

  const watched = new Set<string>();
  for (const placed of page.layout) {
    const spec = getWidget(placed.widget);
    if (!spec?.entities) continue;
    for (const e of spec.entities(placed.config as never)) {
      watched.add(e);
    }
  }

  const changed = new Set<string>();
  for (const id of watched) {
    const entity = entities[id] as { state?: string; last_updated?: string } | undefined;
    if (!entity) continue;
    const fp = entity.last_updated ?? entity.state ?? '';
    if (entityFingerprints.get(id) !== fp) {
      entityFingerprints.set(id, fp);
      changed.add(id);
    }
  }

  if (changed.size > 0) {
    pageBus.notifyForEntities(changed);
  }
});

setInterval(() => pageBus.tick(), 60_000);

const server = serve({
  port: PORT,
  routes: {
    '/': {
      GET: () => serveDashboard(),
    },

    '/favicon.svg': {
      GET: () =>
        new Response(Bun.file(new URL('../favicon.svg', import.meta.url).pathname), {
          headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
        }),
    },

    '/fragment': {
      GET: () => serveFragment(),
    },

    '/events': {
      GET: (req) => serveEvents(req),
    },

    '/health': {
      GET: serveHealth,
    },

    '/render': {
      async GET(req) {
        const auth = authMiddleware(req);
        if (auth) return auth;

        const ifNoneMatch = req.headers.get('if-none-match');
        const result = await servePng();

        if (ifNoneMatch === result.etag) {
          return new Response(null, { status: 304, headers: { ETag: result.etag } });
        }

        return new Response(result.png, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            ETag: result.etag,
          },
        });
      },
    },

    '/touch': {
      async POST(req) {
        const auth = authMiddleware(req);
        if (auth) return auth;

        if (!rateLimit('touch')) {
          return Response.json({ error: 'rate limited' }, { status: 429 });
        }

        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const result = await handleTouch(body);
        return Response.json(result.body, { status: result.status });
      },
    },

    '/state': {
      GET(req) {
        if (!EXPOSE_ENABLED) return new Response('Not found', { status: 404 });
        const auth = authMiddleware(req);
        if (auth) return auth;
        return serveState();
      },
    },

    '/command': {
      async GET(req) {
        if (!EXPOSE_ENABLED) return new Response('Not found', { status: 404 });
        return serveCommand(req);
      },
      async POST(req) {
        if (!EXPOSE_ENABLED) return new Response('Not found', { status: 404 });
        return serveCommand(req);
      },
    },
  },

  fetch(_req, _server) {
    return new Response('Not found', { status: 404 });
  },

  development: process.env.NODE_ENV !== 'production' && {
    hmr: true,
    console: true,
  },
});

console.log(`📱 Kindle HASS Dashboard running at ${server.url}`);
if (EXPOSE_ENABLED) {
  console.log('🔌 Matterbridge routes (/state, /command) enabled');
}
