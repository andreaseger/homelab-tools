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
    const entity = ctx.entityValues[config.entity] as { state?: string; attributes?: Record<string, unknown> } | undefined;
    const rawValue = entity?.state ?? 'unknown';
    const numValue = parseFloat(rawValue);
    const decimals = config.decimals ?? 0;
    const displayValue = isNaN(numValue) ? rawValue : numValue.toFixed(decimals);
    const unit = (entity?.attributes?.unit_of_measurement as string) ?? '';
    const label = config.label ?? (entity?.attributes?.friendly_name as string) ?? config.entity.split('.')[1] ?? config.entity;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', padding: 12, border: '2px solid #a0a0a0', borderRadius: 4, backgroundColor: '#e8e8e8' }}>
        <div style={{ fontSize: 16, color: '#606060', marginBottom: 4 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: 36, fontWeight: 'bold', color: '#101010' }}>{displayValue}</span>
          {unit && <span style={{ fontSize: 18, color: '#808080', marginLeft: 4 }}>{unit}</span>}
        </div>
      </div>
    );
  },
};
