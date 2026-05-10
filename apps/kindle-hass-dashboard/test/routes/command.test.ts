import { test, expect, describe } from 'bun:test';
import { serveCommand } from '../../server/routes/command';
import { state, setPage, setPaused } from '../../server/state';

function req(url: string, init?: { method?: string; body?: unknown }): Request {
  const token = process.env.DASHBOARD_TOKEN;
  const headers: Record<string, string> = {};
  if (init?.body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new Request(`http://localhost${url}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
}

describe('serveCommand', () => {
  test('POST set_paused with value=1 pauses dashboard', async () => {
    setPaused(false);
    const res = await serveCommand(
      req('/command', { method: 'POST', body: { kind: 'set_paused', value: 1 } })
    );
    expect(res.status).toBe(200);
    expect(state.paused).toBe(true);
    setPaused(false);
  });

  test('POST set_paused with value=0 unpauses dashboard', async () => {
    setPaused(true);
    const res = await serveCommand(
      req('/command', { method: 'POST', body: { kind: 'set_paused', value: 0 } })
    );
    expect(res.status).toBe(200);
    expect(state.paused).toBe(false);
  });

  test('POST set_page changes page', async () => {
    setPage('overview');
    const res = await serveCommand(
      req('/command', { method: 'POST', body: { kind: 'set_page', pageId: 'lights' } })
    );
    expect(res.status).toBe(200);
    expect(state.currentPage).toBe('lights');
    setPage('overview');
  });

  test('POST set_page with empty pageId does nothing', async () => {
    setPage('overview');
    const res = await serveCommand(
      req('/command', { method: 'POST', body: { kind: 'set_page', pageId: '' } })
    );
    expect(res.status).toBe(200);
    expect(state.currentPage).toBe('overview');
  });

  test('POST unknown kind enqueues command', async () => {
    const res = await serveCommand(
      req('/command', { method: 'POST', body: { kind: 'custom_action', value: 42 } })
    );
    expect(res.status).toBe(200);
  });

  test('GET returns dequeued commands', async () => {
    await serveCommand(
      req('/command', { method: 'POST', body: { kind: 'set_backlight', value: 18 } })
    );
    const res = await serveCommand(req('/command?since=0'));
    const data = (await res.json()) as { commands: Array<{ kind: string }> };
    expect(data.commands.length).toBeGreaterThanOrEqual(1);
  });
});
