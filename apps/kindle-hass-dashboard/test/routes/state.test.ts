import { test, expect, describe } from 'bun:test';
import { serveState } from '../../server/routes/state';
import { devices } from '../../server/devices';

describe('serveState', () => {
  test('returns JSON with devices array', async () => {
    const res = serveState();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const data = (await res.json()) as { devices: Array<Record<string, unknown>> };
    expect(data.devices.length).toBeGreaterThanOrEqual(1);
  });

  test('each device has required fields', async () => {
    const res = serveState();
    const data = (await res.json()) as { devices: Array<Record<string, unknown>> };
    for (const d of data.devices) {
      expect(d).toHaveProperty('id');
      expect(d).toHaveProperty('current_page');
      expect(d).toHaveProperty('paused');
      expect(d).toHaveProperty('last_render_at');
      expect(d).toHaveProperty('width');
      expect(d).toHaveProperty('height');
    }
  });

  test('reflects setPage change on kindle1', async () => {
    devices.setPage('kindle1', 'lights');
    const res = serveState();
    const data = (await res.json()) as { devices: Array<{ id: string; current_page: string }> };
    const kindle1 = data.devices.find((d) => d.id === 'kindle1');
    expect(kindle1?.current_page).toBe('lights');
    devices.setPage('kindle1', 'overview');
  });

  test('reflects setPaused change on kindle1', async () => {
    devices.setPaused('kindle1', true);
    const res = serveState();
    const data = (await res.json()) as { devices: Array<{ id: string; paused: boolean }> };
    const kindle1 = data.devices.find((d) => d.id === 'kindle1');
    expect(kindle1?.paused).toBe(true);
    devices.setPaused('kindle1', false);
  });
});
