import type { WidgetSpec } from '../shared/types';

interface LineGraphConfig {
  entity: string;
  hours: number;
  label?: string;
  yMin?: number;
  yMax?: number;
  bucketMinutes?: number;
}

export const LineGraphWidget: WidgetSpec<LineGraphConfig> = {
  id: 'line-graph',
  defaults: { hours: 24, bucketMinutes: 30 },
  entities: (config) => [config.entity],
  render: async (config, ctx) => {
    const label = config.label ?? config.entity.split('.')[1];

    const graphWidth = ctx.bbox.w;
    const graphHeight = ctx.bbox.h;
    const padding = { top: 32, right: 24, bottom: 36, left: 72 };
    const innerW = graphWidth - padding.left - padding.right;
    const innerH = graphHeight - padding.top - padding.bottom;

    const history = await ctx.fetchHistory([config.entity], config.hours);

    const bucketMs = (config.bucketMinutes ?? 30) * 60 * 1000;
    const now = Date.now();
    const startTime = now - config.hours * 60 * 60 * 1000;

    const buckets = new Map<number, { sum: number; count: number }>();
    for (const point of history) {
      const bucketKey = Math.floor((point.timestamp - startTime) / bucketMs);
      const existing = buckets.get(bucketKey) ?? { sum: 0, count: 0 };
      existing.sum += point.value;
      existing.count++;
      buckets.set(bucketKey, existing);
    }

    const points: { timestamp: number; value: number }[] = [];
    for (let t = startTime; t < now; t += bucketMs) {
      const bucketKey = Math.floor((t - startTime) / bucketMs);
      const bucket = buckets.get(bucketKey);
      if (bucket && bucket.count > 0) {
        points.push({ timestamp: t, value: bucket.sum / bucket.count });
      }
    }

    const yMin = config.yMin ?? (points.length ? Math.min(...points.map((p) => p.value)) - 2 : 0);
    const yMax = config.yMax ?? (points.length ? Math.max(...points.map((p) => p.value)) + 2 : 1);
    const yRange = yMax - yMin || 1;

    const toX = (t: number) => padding.left + ((t - startTime) / (now - startTime)) * innerW;
    const toY = (v: number) => padding.top + innerH - ((v - yMin) / yRange) * innerH;

    const pathD = points
      .map(
        (p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.timestamp).toFixed(1)} ${toY(p.value).toFixed(1)}`
      )
      .join(' ');

    const areaD =
      points.length > 0
        ? `${pathD} L ${toX(points[points.length - 1]!.timestamp).toFixed(1)} ${(padding.top + innerH).toFixed(1)} L ${toX(points[0]!.timestamp).toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`
        : '';

    const gridLines: string[] = [];
    const nGrid = 4;
    for (let i = 0; i <= nGrid; i++) {
      const v = yMin + (yRange * i) / nGrid;
      const y = toY(v);
      gridLines.push(
        `<line x1="${padding.left}" y1="${y}" x2="${graphWidth - padding.right}" y2="${y}" stroke="#c8c4b6" stroke-width="1" stroke-dasharray="4 4"/>`,
        `<text x="${padding.left - 12}" y="${y + 8}" text-anchor="end" fill="#505050" font-size="22" font-family="Bookerly, Georgia, serif">${v.toFixed(0)}</text>`
      );
    }

    const empty = points.length === 0;
    const svg = `
      <svg width="${graphWidth}" height="${graphHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${graphWidth}" height="${graphHeight}" fill="#fafaf6" stroke="#303030" stroke-width="2" rx="12" ry="12"/>
        <text x="${padding.left}" y="22" fill="#101010" font-size="24" font-weight="700" font-family="Bookerly, Georgia, serif">${label} · ${config.hours}h</text>
        ${empty ? `<text x="${graphWidth / 2}" y="${graphHeight / 2}" text-anchor="middle" fill="#808080" font-size="22">no data</text>` : ''}
        ${gridLines.join('\n')}
        ${areaD ? `<path d="${areaD}" fill="#101010" fill-opacity="0.08"/>` : ''}
        ${pathD ? `<path d="${pathD}" fill="none" stroke="#101010" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
      </svg>
    `;

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <img src={dataUrl} width={graphWidth} height={graphHeight} alt={label} />
      </div>
    );
  },
};
