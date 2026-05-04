import { test, expect, describe } from 'bun:test';
import { handleTouch } from '../server/routes/touch';
import { devices } from '../server/devices';

describe('handleTouch', () => {
  test('rejects missing fields', async () => {
    const result = await handleTouch({});
    expect(result.status).toBe(400);
  });

  test('rejects stale etag', async () => {
    const state = devices.getState('kindle1');
    state.currentEtag = '"fresh"';
    state.touchmap = [{ bbox: { x: 0, y: 0, w: 100, h: 100 }, action: { kind: 'noop' } }];

    const result = await handleTouch({ device: 'kindle1', x: 50, y: 50, etag: '"stale"' });
    expect(result.status).toBe(409);
  });

  test('accepts matching etag', async () => {
    const state = devices.getState('kindle1');
    state.currentEtag = '"matching"';
    state.touchmap = [{ bbox: { x: 0, y: 0, w: 100, h: 100 }, action: { kind: 'noop' } }];

    const result = await handleTouch({ device: 'kindle1', x: 50, y: 50, etag: '"matching"' });
    expect(result.status).toBe(200);
  });

  test('returns noop for tap outside hotzones', async () => {
    const state = devices.getState('kindle1');
    state.currentEtag = '"test"';
    state.touchmap = [{ bbox: { x: 0, y: 0, w: 100, h: 100 }, action: { kind: 'noop' } }];

    const result = await handleTouch({ device: 'kindle1', x: 200, y: 200 });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ action: 'noop' });
  });
});
