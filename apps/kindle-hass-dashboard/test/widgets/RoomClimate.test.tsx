import { test, expect, describe } from 'bun:test';
import { RoomClimateWidget } from '../../widgets/RoomClimate';
import type { WidgetCtx, DeviceProfile, PageConfig, HistoryEntry } from '../../shared/types';

function makeCtx(
  entityValues: Record<string, unknown> = {},
  history: HistoryEntry[] = []
): WidgetCtx {
  return {
    device: { id: 'kindle1', width: 1072, height: 1448, startPageId: 'overview' } as DeviceProfile,
    page: { id: 'overview', title: 'Overview', layout: [] } as PageConfig,
    bbox: { x: 0, y: 0, w: 1024, h: 220 },
    entityValues,
    now: new Date('2025-01-15T10:30:00Z'),
    registerHotZone: () => {},
    fetchHistory: async () => history,
  };
}

describe('RoomClimateWidget', () => {
  test('renders with metrics and graph', async () => {
    const el = await RoomClimateWidget.render(
      {
        label: 'Office',
        metrics: [
          { entity: 'sensor.temp', caption: 'Temp', decimals: 1 },
          { entity: 'sensor.hum', caption: 'Humidity' },
          { entity: 'sensor.co2', caption: 'CO₂' },
        ],
        graph: { entity: 'sensor.co2', hours: 6, bucketMinutes: 15 },
      },
      makeCtx(
        {
          'sensor.temp': { state: '22.5', attributes: { unit_of_measurement: '°C' } },
          'sensor.hum': { state: '45', attributes: { unit_of_measurement: '%' } },
          'sensor.co2': { state: '720', attributes: { unit_of_measurement: 'ppm' } },
        },
        [
          { timestamp: Date.now() - 3600_000, value: 700 },
          { timestamp: Date.now() - 1800_000, value: 750 },
        ]
      )
    );
    expect(el).toBeDefined();
  });

  test('renders without graph when not configured', async () => {
    const el = await RoomClimateWidget.render(
      {
        label: 'Outdoor',
        metrics: [
          { entity: 'sensor.t', caption: 'Temp', decimals: 1 },
          { entity: 'sensor.h', caption: 'Humidity' },
          { entity: 'sensor.l', caption: 'Light' },
        ],
      },
      makeCtx({
        'sensor.t': { state: '12.3', attributes: { unit_of_measurement: '°C' } },
        'sensor.h': { state: '68', attributes: { unit_of_measurement: '%' } },
        'sensor.l': { state: '420', attributes: { unit_of_measurement: 'lx' } },
      })
    );
    expect(el).toBeDefined();
  });

  test('handles missing entities gracefully', async () => {
    const el = await RoomClimateWidget.render(
      { label: 'Empty', metrics: [{ entity: 'sensor.missing', caption: 'Temp' }] },
      makeCtx({})
    );
    expect(el).toBeDefined();
  });

  test('entities returns metric ids plus optional graph entity', () => {
    const ids = RoomClimateWidget.entities!({
      label: 'Room',
      metrics: [
        { entity: 'sensor.t', caption: 'Temp' },
        { entity: 'sensor.c', caption: 'CO₂' },
      ],
      graph: { entity: 'sensor.c', hours: 6 },
    });
    expect(ids).toEqual(['sensor.t', 'sensor.c', 'sensor.c']);
  });
});
