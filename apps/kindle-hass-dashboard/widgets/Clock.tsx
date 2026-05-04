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
      <div style={{ display: 'flex', flexDirection: 'column', padding: 12 }}>
        <div style={{ fontSize: 48, fontWeight: 'bold', color: '#101010' }}>{timeStr}</div>
        {dateStr && <div style={{ fontSize: 20, color: '#606060', marginTop: 4 }}>{dateStr}</div>}
      </div>
    );
  },
};
