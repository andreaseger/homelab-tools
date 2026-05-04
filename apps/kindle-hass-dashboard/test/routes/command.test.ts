import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { serve } from 'bun';
import { devices } from '../../server/devices';
import { pageBus } from '../../server/page-bus';
import { enqueueCommand, dequeueCommands } from '../../server/commands';

describe('command route', () => {
  let server: ReturnType<typeof serve>;
  let receivedBodies: Array<Record<string, unknown>> = [];

  beforeAll(() => {
    server = serve({
      port: 0,
      routes: {
        '/command': {
          async POST(req) {
            const body = (await req.json()) as Record<string, unknown>;
            receivedBodies.push(body);
            const device = (body.device as string) ?? 'kindle1';
            const kind = (body.kind as string) ?? '';

            if (kind === 'set_paused') {
              devices.setPaused(device, (body.value ?? 1) === 1);
              return Response.json({ ok: true });
            }

            if (kind === 'set_page') {
              const pageId = (body.pageId as string) ?? '';
              if (pageId) {
                devices.setPage(device, pageId);
                pageBus.notifyForEntities(device, new Set(['__tick__']));
              }
              return Response.json({ ok: true });
            }

            const value = (body.value as number) ?? 0;
            enqueueCommand(device, kind, value);
            return Response.json({ ok: true });
          },
          async GET(req) {
            const url = new URL(req.url);
            const device = url.searchParams.get('device') ?? 'kindle1';
            const since = parseInt(url.searchParams.get('since') ?? '0', 10);
            const commands = dequeueCommands(device, since);
            return Response.json({
              commands,
              nextSince: commands.length > 0 ? commands[commands.length - 1]!.seq : since,
            });
          },
        },
      },
      fetch() {
        return new Response('not found', { status: 404 });
      },
    });
  });

  afterAll(() => {
    server.stop();
  });

  test('POST set_paused with value=1 pauses device', async () => {
    receivedBodies = [];
    const res = await fetch(`http://localhost:${server.port}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device: 'cmd-test-pause', kind: 'set_paused', value: 1 }),
    });
    expect(res.status).toBe(200);
    expect(devices.getState('cmd-test-pause').paused).toBe(true);
  });

  test('POST set_paused with value=0 unpauses device', async () => {
    receivedBodies = [];
    devices.setPaused('cmd-test-unpause', true);
    const res = await fetch(`http://localhost:${server.port}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device: 'cmd-test-unpause', kind: 'set_paused', value: 0 }),
    });
    expect(res.status).toBe(200);
    expect(devices.getState('cmd-test-unpause').paused).toBe(false);
  });

  test('POST set_page changes page', async () => {
    receivedBodies = [];
    const res = await fetch(`http://localhost:${server.port}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device: 'cmd-test-page', kind: 'set_page', pageId: 'lights' }),
    });
    expect(res.status).toBe(200);
    expect(devices.getState('cmd-test-page').currentPage).toBe('lights');
  });

  test('POST set_page with empty pageId does nothing', async () => {
    receivedBodies = [];
    devices.setPage('cmd-test-empty', 'overview');
    const res = await fetch(`http://localhost:${server.port}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device: 'cmd-test-empty', kind: 'set_page', pageId: '' }),
    });
    expect(res.status).toBe(200);
    expect(devices.getState('cmd-test-empty').currentPage).toBe('overview');
  });

  test('POST unknown kind enqueues command', async () => {
    receivedBodies = [];
    const res = await fetch(`http://localhost:${server.port}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device: 'cmd-test-enqueue', kind: 'custom_action', value: 42 }),
    });
    expect(res.status).toBe(200);
  });

  test('GET returns dequeued commands', async () => {
    receivedBodies = [];
    enqueueCommand('cmd-test-get', 'test_cmd', 1);
    const res = await fetch(`http://localhost:${server.port}/command?device=cmd-test-get&since=0`);
    const data = (await res.json()) as { commands: Array<{ kind: string }> };
    expect(data.commands.length).toBeGreaterThanOrEqual(1);
  });
});
