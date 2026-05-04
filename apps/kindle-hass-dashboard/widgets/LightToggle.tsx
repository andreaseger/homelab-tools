import type { WidgetSpec, Action } from '../shared/types';

interface LightToggleConfig {
  entity: string;
  label?: string;
}

export const LightToggleWidget: WidgetSpec<LightToggleConfig> = {
  id: 'light-toggle',
  entities: (config) => [config.entity],
  render: (config, ctx) => {
    const entity = ctx.entityValues[config.entity] as
      | { state?: string; attributes?: Record<string, unknown> }
      | undefined;
    const isOn = entity?.state === 'on';
    const label =
      config.label ??
      (entity?.attributes?.friendly_name as string) ??
      config.entity.split('.')[1] ??
      config.entity;

    const action: Action = {
      kind: 'service',
      domain: 'light',
      service: 'toggle',
      target: { entity_id: config.entity },
    };

    ctx.registerHotZone({ x: 0, y: 0, w: 300, h: 80 }, action, `toggle ${config.entity}`);

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          border: '2px solid #a0a0a0',
          borderRadius: 4,
          backgroundColor: isOn ? '#ffffff' : '#e8e8e8',
        }}
      >
        <span style={{ fontSize: 18, color: '#404040' }}>{label}</span>
        <span style={{ fontSize: 24, fontWeight: 'bold', color: '#101010', marginTop: 8 }}>
          {isOn ? 'ON' : 'OFF'}
        </span>
      </div>
    );
  },
};
