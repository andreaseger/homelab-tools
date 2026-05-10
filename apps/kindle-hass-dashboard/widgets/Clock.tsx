import type { WidgetSpec } from '../shared/types';

interface ClockConfig {
  format?: '24h' | '12h';
  showDate?: boolean;
}

function formatTime(date: Date, format: '24h' | '12h'): string {
  if (format === '12h') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export const ClockWidget: WidgetSpec<ClockConfig> = {
  id: 'clock',
  defaults: { format: '24h', showDate: false },
  entities: () => [],
  render: (config, ctx) => {
    const timeStr = formatTime(ctx.now, config.format ?? '24h');
    const dateStr = config.showDate ? formatDate(ctx.now) : null;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: '4px 8px',
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: '#101010',
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          {timeStr}
        </div>
        {dateStr && <div style={{ fontSize: 24, color: '#505050', marginTop: 6 }}>{dateStr}</div>}
      </div>
    );
  },
};
