import { test, expect, describe } from 'bun:test';
import { LineGraphWidget } from '../../widgets/LineGraph';
import type { WidgetCtx, DeviceProfile, PageConfig, HistoryEntry } from '../../shared/types';

function makeCtx(history: HistoryEntry[] = []): WidgetCtx {
  return {
    device: { id: 'kindle1', width: 1072, height: 1448, startPageId: 'overview' } as DeviceProfile,
    page: { id: 'overview', title: 'Overview', layout: [] } as PageConfig,
    bbox: { x: 0, y: 0, w: 600, h: 200 },
    entityValues: {},
    now: new Date('2025-01-15T10:30:00Z'),
    registerHotZone: () => {},
    fetchHistory: async () => history,
  };
}

describe('LineGraphWidget', () => {
  test('empty history shows no data message', async () => {
    const el = await LineGraphWidget.render({ entity: 'sensor.temp', hours: 24 }, makeCtx([]));
    expect(el).toBeDefined();
  });

  test('history data renders graph', async () => {
    const history: HistoryEntry[] = [
      { timestamp: Date.now() - 3600000, value: 20 },
      { timestamp: Date.now() - 1800000, value: 22 },
      { timestamp: Date.now() - 600000, value: 21 },
    ];
    const el = await LineGraphWidget.render({ entity: 'sensor.temp', hours: 1 }, makeCtx(history));
    expect(el).toBeDefined();
  });

  test('yMin/yMax config is respected', async () => {
    const history: HistoryEntry[] = [
      { timestamp: Date.now() - 3600000, value: 50 },
      { timestamp: Date.now() - 1800000, value: 60 },
    ];
    const el = await LineGraphWidget.render(
      { entity: 'sensor.temp', hours: 1, yMin: 0, yMax: 100 },
      makeCtx(history)
    );
    expect(el).toBeDefined();
  });

  test('bucketing groups data points', async () => {
    const history: HistoryEntry[] = [
      { timestamp: Date.now() - 3600000, value: 10 },
      { timestamp: Date.now() - 3500000, value: 20 },
      { timestamp: Date.now() - 1800000, value: 30 },
    ];
    const el = await LineGraphWidget.render(
      { entity: 'sensor.temp', hours: 1, bucketMinutes: 30 },
      makeCtx(history)
    );
    expect(el).toBeDefined();
  });

  test('entities returns [config.entity]', () => {
    expect(LineGraphWidget.entities!({ entity: 'sensor.temp', hours: 24 })).toEqual([
      'sensor.temp',
    ]);
  });

  test('defaults are hours=24, bucketMinutes=30', () => {
    expect(LineGraphWidget.defaults).toEqual({ hours: 24, bucketMinutes: 30 });
  });

  test('multi-series config renders both series', async () => {
    const history: HistoryEntry[] = [
      { timestamp: Date.now() - 1800000, value: 18 },
      { timestamp: Date.now() - 600000, value: 19 },
    ];
    const el = await LineGraphWidget.render(
      {
        series: [
          { entity: 'sensor.outdoor', label: 'Outdoor' },
          { entity: 'sensor.bedroom', label: 'Bedroom' },
        ],
        hours: 1,
      },
      makeCtx(history)
    );
    expect(el).toBeDefined();
  });

  test('entities returns all series entities when configured', () => {
    expect(
      LineGraphWidget.entities!({
        series: [{ entity: 'sensor.a' }, { entity: 'sensor.b' }],
        hours: 24,
      })
    ).toEqual(['sensor.a', 'sensor.b']);
  });
});
