import { serve } from 'bun';
import { serveHealth } from './routes/health';
import { createRenderResult } from './routes/render';
import { handleTouch } from './routes/touch';
import { servePreview } from './routes/preview';

const PORT = parseInt(process.env.PORT ?? '8080', 10);

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

        const result = createRenderResult(device);

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
      GET(req) {
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
