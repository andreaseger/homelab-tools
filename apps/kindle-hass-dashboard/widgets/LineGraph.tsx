import type { WidgetSpec } from '../shared/types';

interface LineGraphConfig {
  entity: string;
  hours: number;
  label?: string;
  yMin?: number;
  yMax?: number;
  bucketMinutes?: number;
}

interface HistoryPoint {
  timestamp: number;
  value: number;
}

export const LineGraphWidget: WidgetSpec<LineGraphConfig> = {
  id: 'line-graph',
  defaults: { hours: 24, bucketMinutes: 30 },
  entities: (config) => [config.entity],
  render: (config, _ctx) => {
    const label = config.label ?? config.entity.split('.')[1];

    const graphWidth = 600;
    const graphHeight = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const innerW = graphWidth - padding.left - padding.right;
    const innerH = graphHeight - padding.top - padding.bottom;

    const points: HistoryPoint[] = [];
    const now = Date.now();
    const startTime = now - config.hours * 60 * 60 * 1000;
    const bucketMs = (config.bucketMinutes ?? 30) * 60 * 1000;

    for (let t = startTime; t < now; t += bucketMs) {
      const fakeVal = 15 + 10 * Math.sin((t - startTime) / (config.hours * 60 * 60 * 1000) * Math.PI * 2);
      points.push({ timestamp: t, value: fakeVal });
    }

    const yMin = config.yMin ?? Math.min(...points.map((p) => p.value)) - 2;
    const yMax = config.yMax ?? Math.max(...points.map((p) => p.value)) + 2;
    const yRange = yMax - yMin || 1;

    const toX = (t: number) => padding.left + ((t - startTime) / (now - startTime)) * innerW;
    const toY = (v: number) => padding.top + innerH - ((v - yMin) / yRange) * innerH;

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.timestamp).toFixed(1)} ${toY(p.value).toFixed(1)}`)
      .join(' ');

    const gridLines = [];
    const nGrid = 4;
    for (let i = 0; i <= nGrid; i++) {
      const v = yMin + (yRange * i) / nGrid;
      const y = toY(v);
      gridLines.push(
        `<line x1="${padding.left}" y1="${y}" x2="${graphWidth - padding.right}" y2="${y}" stroke="#d0d0d0" stroke-width="1"/>`,
        `<text x="${padding.left - 5}" y="${y + 4}" text-anchor="end" fill="#808080" font-size="12" font-family="sans-serif">${v.toFixed(0)}</text>`
      );
    }

    const svg = `
      <svg width="${graphWidth}" height="${graphHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${graphWidth}" height="${graphHeight}" fill="#f8f8f8"/>
        ${gridLines.join('\n')}
        <path d="${pathD}" fill="none" stroke="#404040" stroke-width="2"/>
        <text x="${graphWidth / 2}" y="${graphHeight - 5}" text-anchor="middle" fill="#606060" font-size="12" font-family="sans-serif">${label} (${config.hours}h)</text>
      </svg>
    `;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8 }}>
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    );
  },
};
