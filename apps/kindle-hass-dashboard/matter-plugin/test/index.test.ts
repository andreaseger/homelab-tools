import { test, expect, describe, beforeAll, afterAll, beforeEach } from 'bun:test';
import { serve } from 'bun';
import { DashboardClient } from '../src/dashboard-client';
import {
  handleBacklightChange,
  handlePageSwitch,
  setClient,
  stopStatePoll,
} from '../src/cluster-mapping';

describe('DashboardClient', () => {
  let server: ReturnType<typeof serve>;
  let receivedCommands: Array<Record<string, unknown>> = [];

  beforeAll(() => {
    server = serve({
      port: 0,
      routes: {
        '/state': {
          GET(req) {
            const auth = req.headers.get('Authorization');
            if (auth !== 'Bearer test-token') {
              return new Response('Unauthorized', { status: 401 });
            }
            return Response.json({
              devices: [
                { id: 'kindle1', current_page: 'overview', paused: false, last_render_at: 12345 },
              ],
            });
          },
        },
        '/command': {
          async POST(req) {
            const auth = req.headers.get('Authorization');
            if (auth !== 'Bearer test-token') {
              return new Response('Unauthorized', { status: 401 });
            }
            const body = (await req.json()) as Record<string, unknown>;
            receivedCommands.push(body);
            return Response.json({ ok: true });
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

  beforeEach(() => {
    receivedCommands = [];
  });

  test('getState returns device state', async () => {
    const client = new DashboardClient(`http://127.0.0.1:${server.port}`, 'test-token');
    const state = await client.getState();
    expect(state).not.toBeNull();
    expect(state!.devices).toHaveLength(1);
    expect(state!.devices[0]!.current_page).toBe('overview');
    expect(state!.devices[0]!.paused).toBe(false);
  });

  test('getState returns null on unauthorized', async () => {
    const client = new DashboardClient(`http://127.0.0.1:${server.port}`, 'wrong-token');
    const state = await client.getState();
    expect(state).toBeNull();
  });

  test('postCommand sends command with bearer auth', async () => {
    const client = new DashboardClient(`http://127.0.0.1:${server.port}`, 'test-token');
    const ok = await client.postCommand('kindle1', 'set_backlight', 18);
    expect(ok).toBe(true);
    expect(receivedCommands).toHaveLength(1);
    expect(receivedCommands[0]!.kind).toBe('set_backlight');
    expect(receivedCommands[0]!.value).toBe(18);
  });

  test('postCommandWithBody sends arbitrary body', async () => {
    const client = new DashboardClient(`http://127.0.0.1:${server.port}`, 'test-token');
    const ok = await client.postCommandWithBody('kindle1', { kind: 'set_page', pageId: 'lights' });
    expect(ok).toBe(true);
    expect(receivedCommands).toHaveLength(1);
    expect(receivedCommands[0]!.kind).toBe('set_page');
    expect(receivedCommands[0]!.pageId).toBe('lights');
  });
});

describe('cluster-mapping', () => {
  let server: ReturnType<typeof serve>;
  let receivedCommands: Array<Record<string, unknown>> = [];

  beforeAll(() => {
    server = serve({
      port: 0,
      routes: {
        '/command': {
          async POST(req) {
            const body = (await req.json()) as Record<string, unknown>;
            receivedCommands.push(body);
            return Response.json({ ok: true, received: body });
          },
        },
      },
      fetch() {
        return new Response('not found', { status: 404 });
      },
    });

    const testClient = new DashboardClient(`http://127.0.0.1:${server.port}`, '');
    setClient(testClient);
  });

  afterAll(() => {
    server.stop();
    stopStatePoll();
  });

  beforeEach(() => {
    receivedCommands = [];
  });

  test('handleBacklightChange maps 0-100 to 0-24 intensity', async () => {
    const ok = await handleBacklightChange('kindle1', 50);
    expect(ok).toBe(true);
    expect(receivedCommands).toHaveLength(1);
    expect(receivedCommands[0]!.kind).toBe('set_backlight');
    expect(receivedCommands[0]!.value).toBe(12);
  });

  test('handlePageSwitch sends set_page command', async () => {
    const ok = await handlePageSwitch('kindle1', 'lights');
    expect(ok).toBe(true);
    expect(receivedCommands).toHaveLength(1);
    expect(receivedCommands[0]!.kind).toBe('set_page');
    expect(receivedCommands[0]!.pageId).toBe('lights');
  });
});
