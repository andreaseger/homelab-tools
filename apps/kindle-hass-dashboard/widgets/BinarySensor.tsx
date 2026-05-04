import type { WidgetSpec } from '../shared/types';

interface BinarySensorConfig {
  entity: string;
  label?: string;
  iconOn?: string;
  iconOff?: string;
}

export const BinarySensorWidget: WidgetSpec<BinarySensorConfig> = {
  id: 'binary-sensor',
  defaults: { iconOn: '●', iconOff: '○' },
  entities: (config) => [config.entity],
  render: (config, ctx) => {
    const entity = ctx.entityValues[config.entity] as
      | { state?: string; attributes?: Record<string, unknown> }
      | undefined;
    const isOn = entity?.state === 'on';
    const icon = isOn ? (config.iconOn ?? '●') : (config.iconOff ?? '○');
    const label =
      config.label ??
      (entity?.attributes?.friendly_name as string) ??
      config.entity.split('.')[1] ??
      config.entity;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          border: '2px solid #a0a0a0',
          borderRadius: 4,
          backgroundColor: '#e8e8e8',
        }}
      >
        <span style={{ fontSize: 32, color: isOn ? '#101010' : '#808080' }}>{icon}</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 16, color: '#606060' }}>{label}</span>
          <span style={{ fontSize: 20, fontWeight: 'bold', color: '#202020' }}>
            {isOn ? 'On' : 'Off'}
          </span>
        </div>
      </div>
    );
  },
};
