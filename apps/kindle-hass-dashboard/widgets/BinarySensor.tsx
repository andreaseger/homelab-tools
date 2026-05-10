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
          flexDirection: 'row',
          alignItems: 'center',
          gap: 24,
          width: '100%',
          height: '100%',
          padding: '20px 24px',
          border: '2px solid #303030',
          borderRadius: 12,
          backgroundColor: isOn ? '#101010' : '#fafaf6',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 96,
            height: 96,
            fontSize: 72,
            color: isOn ? '#fafaf6' : '#404040',
          }}
        >
          {icon}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 22,
              color: isOn ? '#c0c0c0' : '#505050',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: isOn ? '#fafaf6' : '#101010',
              lineHeight: 1.1,
            }}
          >
            {isOn ? 'On' : 'Off'}
          </span>
        </div>
      </div>
    );
  },
};
