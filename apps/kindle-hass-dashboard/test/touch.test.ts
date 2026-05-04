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

  test('navigate action changes page', async () => {
    const state = devices.getState('touch-nav-test');
    state.currentEtag = '"nav"';
    state.currentPage = 'overview';
    state.touchmap = [
      { bbox: { x: 0, y: 0, w: 500, h: 100 }, action: { kind: 'navigate', pageId: 'lights' } },
    ];

    const result = await handleTouch({ device: 'touch-nav-test', x: 100, y: 50, etag: '"nav"' });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ action: 'navigate' });
    expect(state.currentPage).toBe('lights');
  });

  test('no etag provided skips etag check', async () => {
    const state = devices.getState('touch-no-etag');
    state.currentEtag = '"some-etag"';
    state.touchmap = [{ bbox: { x: 0, y: 0, w: 100, h: 100 }, action: { kind: 'noop' } }];

    const result = await handleTouch({ device: 'touch-no-etag', x: 50, y: 50 });
    expect(result.status).toBe(200);
  });

  test('auto-creates state for unknown device', async () => {
    const result = await handleTouch({ device: 'brand-new-touch-device', x: 50, y: 50 });
    expect(result.status).toBe(200);
  });
});
