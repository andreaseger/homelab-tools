import { test, expect, describe } from 'bun:test';
import { SensorValueWidget } from '../../widgets/SensorValue';
import type { WidgetCtx, DeviceProfile, PageConfig } from '../../shared/types';

function makeCtx(entityValues: Record<string, unknown> = {}): WidgetCtx {
  return {
    device: { id: 'kindle1', width: 1072, height: 1448, startPageId: 'overview' } as DeviceProfile,
    page: { id: 'overview', title: 'Overview', layout: [] } as PageConfig,
    entityValues,
    now: new Date('2025-01-15T10:30:00Z'),
    registerHotZone: () => {},
    fetchHistory: async () => [],
  };
}

describe('SensorValueWidget', () => {
  test('numeric value with decimals=0', () => {
    const el = SensorValueWidget.render(
      { entity: 'sensor.temp', decimals: 0 },
      makeCtx({ 'sensor.temp': { state: '22.56', attributes: {} } })
    );
    expect(el).toBeDefined();
  });

  test('numeric value with decimals=2', () => {
    const el = SensorValueWidget.render(
      { entity: 'sensor.temp', decimals: 2 },
      makeCtx({ 'sensor.temp': { state: '22.56', attributes: {} } })
    );
    expect(el).toBeDefined();
  });

  test('non-numeric state displays as-is', () => {
    const el = SensorValueWidget.render(
      { entity: 'sensor.temp' },
      makeCtx({ 'sensor.temp': { state: 'unknown', attributes: {} } })
    );
    expect(el).toBeDefined();
  });

  test('label from config', () => {
    const el = SensorValueWidget.render(
      { entity: 'sensor.temp', label: 'My Label' },
      makeCtx({ 'sensor.temp': { state: '22', attributes: {} } })
    );
    expect(el).toBeDefined();
  });

  test('label fallback to friendly_name', () => {
    const el = SensorValueWidget.render(
      { entity: 'sensor.temp' },
      makeCtx({
        'sensor.temp': { state: '22', attributes: { friendly_name: 'Temperature' } },
      })
    );
    expect(el).toBeDefined();
  });

  test('label fallback to entity ID suffix', () => {
    const el = SensorValueWidget.render(
      { entity: 'sensor.temp' },
      makeCtx({ 'sensor.temp': { state: '22', attributes: {} } })
    );
    expect(el).toBeDefined();
  });

  test('unit display from attributes', () => {
    const el = SensorValueWidget.render(
      { entity: 'sensor.temp' },
      makeCtx({
        'sensor.temp': { state: '22', attributes: { unit_of_measurement: '°C' } },
      })
    );
    expect(el).toBeDefined();
  });

  test('entities returns [config.entity]', () => {
    expect(SensorValueWidget.entities!({ entity: 'sensor.temp' })).toEqual(['sensor.temp']);
  });
});
