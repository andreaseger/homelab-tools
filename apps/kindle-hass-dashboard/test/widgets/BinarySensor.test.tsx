import { test, expect, describe } from 'bun:test';
import { BinarySensorWidget } from '../../widgets/BinarySensor';
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

describe('BinarySensorWidget', () => {
  test('state "on" shows on icon and On text', () => {
    const el = BinarySensorWidget.render(
      { entity: 'binary_sensor.door' },
      makeCtx({ 'binary_sensor.door': { state: 'on', attributes: {} } })
    );
    expect(el).toBeDefined();
  });

  test('state "off" shows off icon and Off text', () => {
    const el = BinarySensorWidget.render(
      { entity: 'binary_sensor.door' },
      makeCtx({ 'binary_sensor.door': { state: 'off', attributes: {} } })
    );
    expect(el).toBeDefined();
  });

  test('state "unknown" shows off state', () => {
    const el = BinarySensorWidget.render(
      { entity: 'binary_sensor.door' },
      makeCtx({ 'binary_sensor.door': { state: 'unknown', attributes: {} } })
    );
    expect(el).toBeDefined();
  });

  test('custom iconOn/iconOff', () => {
    const el = BinarySensorWidget.render(
      { entity: 'binary_sensor.door', iconOn: '🟢', iconOff: '🔴' },
      makeCtx({ 'binary_sensor.door': { state: 'on', attributes: {} } })
    );
    expect(el).toBeDefined();
  });

  test('label fallback chain', () => {
    const el = BinarySensorWidget.render(
      { entity: 'binary_sensor.door' },
      makeCtx({
        'binary_sensor.door': { state: 'on', attributes: { friendly_name: 'Door' } },
      })
    );
    expect(el).toBeDefined();
  });

  test('defaults are iconOn=●, iconOff=○', () => {
    expect(BinarySensorWidget.defaults).toEqual({ iconOn: '●', iconOff: '○' });
  });

  test('entities returns [config.entity]', () => {
    expect(BinarySensorWidget.entities!({ entity: 'binary_sensor.door' })).toEqual([
      'binary_sensor.door',
    ]);
  });
});
