import { test, expect, describe } from 'bun:test';
import { serveState } from '../../server/routes/state';
import { setPage, setPaused } from '../../server/state';

describe('serveState', () => {
  test('returns JSON with single dashboard state', async () => {
    const res = serveState();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toHaveProperty('current_page');
    expect(data).toHaveProperty('paused');
    expect(data).toHaveProperty('last_render_at');
    expect(data).toHaveProperty('width');
    expect(data).toHaveProperty('height');
  });

  test('reflects setPage', async () => {
    setPage('controls');
    const res = serveState();
    const data = (await res.json()) as { current_page: string };
    expect(data.current_page).toBe('controls');
    setPage('overview');
  });

  test('reflects setPaused', async () => {
    setPaused(true);
    const res = serveState();
    const data = (await res.json()) as { paused: boolean };
    expect(data.paused).toBe(true);
    setPaused(false);
  });
});
