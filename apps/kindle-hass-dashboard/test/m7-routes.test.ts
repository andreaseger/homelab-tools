import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { serve } from 'bun';

beforeAll(() => {
  process.env.EXPOSE_ENABLED = 'true';
  process.env.HASS_URL = 'http://localhost:8123';
  process.env.HASS_TOKEN = 'test';
});

afterAll(() => {
  delete process.env.EXPOSE_ENABLED;
});

describe('/state endpoint', () => {
  test('returns device state', async () => {
    const server = serve({
      port: 0,
      routes: {
        '/state': {
          GET() {
            return Response.json({
              devices: [
                {
                  id: 'kindle1',
                  current_page: 'overview',
                  paused: false,
                  last_render_at: 0,
                  width: 1072,
                  height: 1448,
                },
              ],
            });
          },
        },
      },
      fetch() {
        return new Response('not found', { status: 404 });
      },
    });

    const res = await fetch(`http://localhost:${server.port}/state`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { devices: unknown[] };
    expect(data.devices).toHaveLength(1);
    server.stop();
  });
});

describe('/command endpoint', () => {
  test('enqueues command via POST', async () => {
    const queues = new Map<string, unknown[]>();
    const server = serve({
      port: 0,
      routes: {
        '/command': {
          async POST(req) {
            const body = (await req.json()) as { device: string; kind: string; value: number };
            if (!queues.has(body.device)) queues.set(body.device, []);
            queues.get(body.device)!.push(body);
            return Response.json({ ok: true });
          },
          async GET(req) {
            const url = new URL(req.url);
            const device = url.searchParams.get('device') ?? 'kindle1';
            return Response.json({ commands: queues.get(device) ?? [] });
          },
        },
      },
      fetch() {
        return new Response('not found', { status: 404 });
      },
    });

    await fetch(`http://localhost:${server.port}/command`, {
      method: 'POST',
      body: JSON.stringify({ device: 'kindle1', kind: 'set_backlight', value: 18 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await fetch(`http://localhost:${server.port}/command?device=kindle1`);
    const data = (await res.json()) as { commands: unknown[] };
    expect(data.commands).toHaveLength(1);
    server.stop();
  });
});
