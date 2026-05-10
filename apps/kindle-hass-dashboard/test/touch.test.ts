import { test, expect, describe, beforeEach } from 'bun:test';
import { handleTouch, resetTouchDebounce } from '../server/routes/touch';
import { state } from '../server/state';

function resetState() {
  state.currentEtag = null;
  state.currentPage = 'overview';
  state.touchmap = [];
  state.paused = false;
  state.lastRenderAt = 0;
  resetTouchDebounce();
}

describe('handleTouch', () => {
  beforeEach(resetState);

  test('rejects missing fields', async () => {
    const result = await handleTouch({});
    expect(result.status).toBe(400);
  });

  test('rejects stale etag', async () => {
    state.currentEtag = '"fresh"';
    state.touchmap = [{ bbox: { x: 0, y: 0, w: 100, h: 100 }, action: { kind: 'noop' } }];

    const result = await handleTouch({ x: 50, y: 50, etag: '"stale"' });
    expect(result.status).toBe(409);
  });

  test('accepts matching etag', async () => {
    state.currentEtag = '"matching"';
    state.touchmap = [{ bbox: { x: 0, y: 0, w: 100, h: 100 }, action: { kind: 'noop' } }];

    const result = await handleTouch({ x: 50, y: 50, etag: '"matching"' });
    expect(result.status).toBe(200);
  });

  test('returns noop for tap outside hotzones', async () => {
    state.touchmap = [{ bbox: { x: 0, y: 0, w: 100, h: 100 }, action: { kind: 'noop' } }];

    const result = await handleTouch({ x: 200, y: 200 });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ action: 'noop' });
  });

  test('navigate action changes page', async () => {
    state.currentEtag = '"nav"';
    state.currentPage = 'overview';
    state.touchmap = [
      { bbox: { x: 0, y: 0, w: 500, h: 100 }, action: { kind: 'navigate', pageId: 'controls' } },
    ];

    const result = await handleTouch({ x: 100, y: 50, etag: '"nav"' });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ action: 'navigate' });
    expect(state.currentPage).toBe('controls');
  });

  test('no etag provided skips etag check', async () => {
    state.currentEtag = '"some-etag"';
    state.touchmap = [{ bbox: { x: 0, y: 0, w: 100, h: 100 }, action: { kind: 'noop' } }];

    const result = await handleTouch({ x: 50, y: 50 });
    expect(result.status).toBe(200);
  });
});
