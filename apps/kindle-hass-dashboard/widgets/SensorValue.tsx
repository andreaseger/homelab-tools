import type { WidgetSpec } from '../shared/types';

interface SensorValueConfig {
  entity: string;
  label?: string;
  decimals?: number;
}

export const SensorValueWidget: WidgetSpec<SensorValueConfig> = {
  id: 'sensor-value',
  defaults: { decimals: 0 },
  entities: (config) => [config.entity],
  render: (config, ctx) => {
    const entity = ctx.entityValues[config.entity] as
      | { state?: string; attributes?: Record<string, unknown> }
      | undefined;
    const rawValue = entity?.state ?? '—';
    const numValue = parseFloat(rawValue);
    const decimals = config.decimals ?? 0;
    const displayValue = isNaN(numValue) ? rawValue : numValue.toFixed(decimals);
    const unit = (entity?.attributes?.unit_of_measurement as string) ?? '';
    const label =
      config.label ??
      (entity?.attributes?.friendly_name as string) ??
      config.entity.split('.')[1] ??
      config.entity;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '20px 24px',
          border: '2px solid #303030',
          borderRadius: 12,
          backgroundColor: '#fafaf6',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: '#505050',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: 96, fontWeight: 700, color: '#101010', lineHeight: 1 }}>
            {displayValue}
          </span>
          {unit && <span style={{ fontSize: 32, color: '#404040', marginLeft: 8 }}>{unit}</span>}
        </div>
      </div>
    );
  },
};
