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
    ctx.registerHotZone(
      { x: 0, y: 0, w: ctx.bbox.w, h: ctx.bbox.h },
      action,
      `toggle ${config.entity}`
    );

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '20px 28px',
          border: '2px solid #303030',
          borderRadius: 12,
          backgroundColor: isOn ? '#101010' : '#fafaf6',
          boxSizing: 'border-box',
        }}
      >
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 88,
            height: 88,
            borderRadius: 44,
            border: `4px solid ${isOn ? '#fafaf6' : '#303030'}`,
            fontSize: 56,
            color: isOn ? '#fafaf6' : '#303030',
          }}
        >
          {isOn ? '◉' : '○'}
        </div>
      </div>
    );
  },
};
