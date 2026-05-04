import { test, expect, describe } from 'bun:test';
import { LightToggleWidget } from '../../widgets/LightToggle';
import type { WidgetCtx, DeviceProfile, PageConfig, ActionHotZone } from '../../shared/types';

function makeCtx(entityValues: Record<string, unknown> = {}): WidgetCtx {
  const hotZones: ActionHotZone[] = [];
  return {
    device: { id: 'kindle1', width: 1072, height: 1448, startPageId: 'overview' } as DeviceProfile,
    page: { id: 'overview', title: 'Overview', layout: [] } as PageConfig,
    entityValues,
    now: new Date('2025-01-15T10:30:00Z'),
    registerHotZone: (bbox, action, debug) => hotZones.push({ bbox, action, debug }),
    fetchHistory: async () => [],
  };
}

describe('LightToggleWidget', () => {
  test('state "on" shows ON', () => {
    const el = LightToggleWidget.render(
      { entity: 'light.living' },
      makeCtx({ 'light.living': { state: 'on', attributes: {} } })
    );
    expect(el).toBeDefined();
  });

  test('state "off" shows OFF', () => {
    const el = LightToggleWidget.render(
      { entity: 'light.living' },
      makeCtx({ 'light.living': { state: 'off', attributes: {} } })
    );
    expect(el).toBeDefined();
  });

  test('registers hot zone with service action', () => {
    const hotZones: ActionHotZone[] = [];
    const ctx: WidgetCtx = {
      device: {
        id: 'kindle1',
        width: 1072,
        height: 1448,
        startPageId: 'overview',
      } as DeviceProfile,
      page: { id: 'overview', title: 'Overview', layout: [] } as PageConfig,
      entityValues: { 'light.living': { state: 'on', attributes: {} } },
      now: new Date('2025-01-15T10:30:00Z'),
      registerHotZone: (bbox, action, debug) => hotZones.push({ bbox, action, debug }),
      fetchHistory: async () => [],
    };
    LightToggleWidget.render({ entity: 'light.living' }, ctx);
    expect(hotZones).toHaveLength(1);
    expect(hotZones[0]!.action.kind).toBe('service');
    expect(hotZones[0]!.action).toMatchObject({
      domain: 'light',
      service: 'toggle',
      target: { entity_id: 'light.living' },
    });
  });

  test('label fallback to friendly_name', () => {
    const el = LightToggleWidget.render(
      { entity: 'light.living' },
      makeCtx({ 'light.living': { state: 'on', attributes: { friendly_name: 'Living Room' } } })
    );
    expect(el).toBeDefined();
  });

  test('entities returns [config.entity]', () => {
    expect(LightToggleWidget.entities!({ entity: 'light.living' })).toEqual(['light.living']);
  });
});
