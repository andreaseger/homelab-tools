import { test, expect, describe } from 'bun:test';
import { ClockWidget } from '../../widgets/Clock';
import type { WidgetCtx, DeviceProfile, PageConfig } from '../../shared/types';

const FIXED_DATE = new Date('2025-01-15T10:30:00Z');

function makeCtx(now: Date = FIXED_DATE): WidgetCtx {
  return {
    device: { id: 'kindle1', width: 1072, height: 1448, startPageId: 'overview' } as DeviceProfile,
    page: { id: 'overview', title: 'Overview', layout: [] } as PageConfig,
    bbox: { x: 0, y: 0, w: 400, h: 100 },
    entityValues: {},
    now,
    registerHotZone: () => {},
    fetchHistory: async () => [],
  };
}

describe('ClockWidget', () => {
  test('24h format produces HH:MM', () => {
    const el = ClockWidget.render({ format: '24h' }, makeCtx());
    expect(el).toBeDefined();
  });

  test('12h format produces HH:MM AM/PM', () => {
    const el = ClockWidget.render({ format: '12h' }, makeCtx());
    expect(el).toBeDefined();
  });

  test('showDate=true renders date', () => {
    const el = ClockWidget.render({ format: '24h', showDate: true }, makeCtx()) as {
      props: { children: unknown[] };
    };
    const children = el.props.children as unknown[];
    expect(children.length).toBe(2);
  });

  test('showDate=false renders only time', () => {
    const el = ClockWidget.render({ format: '24h', showDate: false }, makeCtx()) as {
      props: { children: unknown[] };
    };
    const children = el.props.children as unknown[];
    expect(children.length).toBe(2);
    expect(children[1]).toBeNull();
  });

  test('defaults are format=24h, showDate=false', () => {
    expect(ClockWidget.defaults).toEqual({ format: '24h', showDate: false });
  });

  test('entities returns empty array', () => {
    expect(ClockWidget.entities!({})).toEqual([]);
  });
});
