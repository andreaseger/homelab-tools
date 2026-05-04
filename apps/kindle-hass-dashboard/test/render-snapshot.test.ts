import { test, expect, describe } from 'bun:test';
import { render } from '../server/renderer';

const MOCK_ENTITIES: Record<string, unknown> = {
  'sensor.temperature': {
    state: '22.5',
    attributes: { friendly_name: 'Temperature', unit_of_measurement: '°C' },
  },
};

describe('render', () => {
  test('returns render result for kindle1', async () => {
    const result = await render('kindle1', MOCK_ENTITIES);
    expect(result.png).toBeInstanceOf(Uint8Array);
    expect(result.png.length).toBeGreaterThan(0);
    expect(result.etag).toMatch(/^"[0-9a-f]+"$/);
    expect(result.pageId).toBe('overview');
    expect(result.width).toBe(1072);
    expect(result.height).toBe(1448);
    expect(result.touchmap).toBeInstanceOf(Array);
  });

  test('same input produces same etag', async () => {
    const r1 = await render('kindle1', MOCK_ENTITIES);
    const r2 = await render('kindle1', MOCK_ENTITIES);
    expect(r1.etag).toBe(r2.etag);
  });

  test('touchmap has entries for page-tabs', async () => {
    const result = await render('kindle1', MOCK_ENTITIES);
    const navZones = result.touchmap.filter((z) => z.action.kind === 'navigate');
    expect(navZones.length).toBeGreaterThan(0);
  });
});
