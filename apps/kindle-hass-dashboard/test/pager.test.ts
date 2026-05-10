import { test, expect, describe } from 'bun:test';
import { resolveTap } from '../server/pager';
import type { ActionHotZone } from '../shared/types';

describe('resolveTap', () => {
  test('returns noop when no hotzones', () => {
    const result = resolveTap([], 50, 50);
    expect(result).toEqual({ kind: 'noop' });
  });

  test('matches single hotzone', () => {
    const zones: ActionHotZone[] = [
      {
        bbox: { x: 0, y: 0, w: 100, h: 100 },
        action: { kind: 'navigate', pageId: 'test' },
      },
    ];
    const result = resolveTap(zones, 50, 50);
    expect(result).toEqual({ kind: 'navigate', pageId: 'test' });
  });

  test('returns last matching zone (top-most)', () => {
    const zones: ActionHotZone[] = [
      {
        bbox: { x: 0, y: 0, w: 200, h: 200 },
        action: { kind: 'navigate', pageId: 'back' },
      },
      {
        bbox: { x: 50, y: 50, w: 100, h: 100 },
        action: { kind: 'service', domain: 'light', service: 'toggle' },
      },
    ];
    const result = resolveTap(zones, 75, 75);
    expect(result).toEqual({ kind: 'service', domain: 'light', service: 'toggle' });
  });

  test('rejects outside bounds', () => {
    const zones: ActionHotZone[] = [
      {
        bbox: { x: 100, y: 100, w: 50, h: 50 },
        action: { kind: 'navigate', pageId: 'test' },
      },
    ];
    expect(resolveTap(zones, 50, 50)).toEqual({ kind: 'noop' });
    // With TOUCH_TOLERANCE=16, the right bound is 100+50+16=166 and
    // bottom bound is 100+50+16=166. Must test outside those.
    expect(resolveTap(zones, 200, 100)).toEqual({ kind: 'noop' });
    expect(resolveTap(zones, 100, 200)).toEqual({ kind: 'noop' });
  });

  test('accepts boundary (left/top inclusive, right/bottom exclusive)', () => {
    const zones: ActionHotZone[] = [
      {
        bbox: { x: 10, y: 10, w: 20, h: 20 },
        action: { kind: 'navigate', pageId: 'test' },
      },
    ];
    expect(resolveTap(zones, 10, 10).kind).toBe('navigate');
    expect(resolveTap(zones, 29, 29).kind).toBe('navigate');
    // Zone goes to x:30, y:30. With tolerance, expands to x:46, y:46.
    expect(resolveTap(zones, 50, 10).kind).toBe('noop');
    expect(resolveTap(zones, 10, 50).kind).toBe('noop');
  });

  test('negative coordinates return noop', () => {
    const zones: ActionHotZone[] = [
      {
        bbox: { x: 10, y: 10, w: 20, h: 20 },
        action: { kind: 'navigate', pageId: 'test' },
      },
    ];
    // With tolerance, the zone expands left/top by 16 into negative space.
    // Test with coordinates far enough negative to still be outside.
    expect(resolveTap(zones, -20, 10)).toEqual({ kind: 'noop' });
    expect(resolveTap(zones, 10, -20)).toEqual({ kind: 'noop' });
  });

  test('very large coordinates return noop', () => {
    const zones: ActionHotZone[] = [
      {
        bbox: { x: 0, y: 0, w: 100, h: 100 },
        action: { kind: 'navigate', pageId: 'test' },
      },
    ];
    expect(resolveTap(zones, 99999, 99999)).toEqual({ kind: 'noop' });
  });
});
