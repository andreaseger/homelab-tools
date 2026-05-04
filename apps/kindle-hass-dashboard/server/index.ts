import { serve } from 'bun';
import { serveHealth } from './routes/health';
import { createRenderResult } from './routes/render';
import { handleTouch } from './routes/touch';
import { servePreview } from './routes/preview';
import { pageBus } from './page-bus';
import { onEntitiesChange } from './hass';
import { devices } from './devices';
import { pages } from '../config/pages';

const PORT = parseInt(process.env.PORT ?? '8080', 10);

onEntitiesChange((entities) => {
  const entitySetsByDevice = new Map<string, Set<string>>();
  for (const profile of devices.list()) {
    const page = pages.find((p: { id: string }) => p.id === profile.startPageId);
    if (!page) continue;
    const entitySet = new Set<string>();
    for (const placed of page.layout) {
      const entitiesFn = getWidgetEntities(placed);
      for (const e of entitiesFn) entitySet.add(e);
    }
    entitySetsByDevice.set(profile.id, entitySet);
  }
  pageBus.onEntitiesChange(entities, entitySetsByDevice);
});

function getWidgetEntities(placed: { widget: string; config: unknown }): string[] {
  try {
    const { getWidget } = require('../widgets');
    const spec = getWidget(placed.widget);
    if (spec?.entities) {
      return spec.entities(placed.config);
    }
  } catch {
    return [];
  }
  return [];
}

const server = serve({
  port: PORT,
  routes: {
    '/health': {
      GET: serveHealth,
    },

    '/render': {
      async GET(req) {
        const url = new URL(req.url);
        const device = url.searchParams.get('device') ?? 'kindle1';
        const ifNoneMatch = req.headers.get('if-none-match');

        const result = await createRenderResult(device);

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
        const body = await req.json().catch(() => ({}));
        const result = await handleTouch(body);
        return Response.json(result.body, { status: result.status });
      },
    },

    '/preview/:device': {
      async GET(req) {
        const device = req.params.device;
        return servePreview(device);
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
