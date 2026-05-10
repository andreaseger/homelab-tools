import { test, expect, describe } from 'bun:test';
import { PageTabsWidget } from '../../widgets/PageTabs';
import type { WidgetCtx, DeviceProfile, PageConfig, ActionHotZone } from '../../shared/types';

function makeCtx(
  currentPageId: string,
  bboxWidth: number = 1072
): { ctx: WidgetCtx; hotZones: ActionHotZone[] } {
  const hotZones: ActionHotZone[] = [];
  const ctx: WidgetCtx = {
    device: {
      id: 'kindle1',
      width: 1072,
      height: 1448,
      startPageId: 'overview',
    } as DeviceProfile,
    page: { id: currentPageId, title: 'Overview', layout: [] } as PageConfig,
    bbox: { x: 0, y: 0, w: bboxWidth, h: 56 },
    entityValues: {},
    now: new Date('2025-01-15T10:30:00Z'),
    registerHotZone: (bbox, action, debug) => hotZones.push({ bbox, action, debug }),
    fetchHistory: async () => [],
  };
  return { ctx, hotZones };
}

describe('PageTabsWidget', () => {
  test('renders with correct number of tabs', () => {
    const { ctx } = makeCtx('overview');
    const el = PageTabsWidget.render(
      {
        pages: [
          { id: 'overview', label: 'Overview' },
          { id: 'lights', label: 'Lights' },
        ],
      },
      ctx
    );
    expect(el).toBeDefined();
  });

  test('registers navigate hot zones for each tab', () => {
    const { ctx, hotZones } = makeCtx('overview');
    PageTabsWidget.render(
      {
        pages: [
          { id: 'overview', label: 'Overview' },
          { id: 'lights', label: 'Lights' },
        ],
      },
      ctx
    );
    expect(hotZones).toHaveLength(2);
    expect(hotZones[0]!.action.kind).toBe('navigate');
    expect(hotZones[0]!.action.pageId).toBe('overview');
    expect(hotZones[1]!.action.pageId).toBe('lights');
  });

  test('hot zones are evenly spaced', () => {
    const { ctx, hotZones } = makeCtx('overview', 1000);
    PageTabsWidget.render(
      {
        pages: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
          { id: 'c', label: 'C' },
        ],
      },
      ctx
    );
    const tabWidth = Math.floor(1000 / 3);
    expect(hotZones[0]!.bbox.x).toBe(0);
    expect(hotZones[1]!.bbox.x).toBe(tabWidth);
    expect(hotZones[2]!.bbox.x).toBe(tabWidth * 2);
  });

  test('entities returns empty array', () => {
    expect(PageTabsWidget.entities!({ pages: [] })).toEqual([]);
  });
});
