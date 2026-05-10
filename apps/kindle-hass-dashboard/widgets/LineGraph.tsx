import type { WidgetSpec, HistoryEntry } from '../shared/types';

interface SeriesConfig {
  entity: string;
  label?: string;
}

interface LineGraphConfig {
  // Single-series form
  entity?: string;
  // Multi-series form. First series is solid, second is dashed.
  series?: SeriesConfig[];
  hours: number;
  label?: string;
  yMin?: number;
  yMax?: number;
  bucketMinutes?: number;
}

function normaliseSeries(config: LineGraphConfig): SeriesConfig[] {
  if (config.series && config.series.length > 0) return config.series;
  if (config.entity) return [{ entity: config.entity }];
  return [];
}

function bucketHistory(
  history: HistoryEntry[],
  startTime: number,
  bucketMs: number,
  now: number
): { t: number; v: number }[] {
  const buckets = new Map<number, { sum: number; count: number }>();
  for (const point of history) {
    const k = Math.floor((point.timestamp - startTime) / bucketMs);
    const ex = buckets.get(k) ?? { sum: 0, count: 0 };
    ex.sum += point.value;
    ex.count++;
    buckets.set(k, ex);
  }
  const out: { t: number; v: number }[] = [];
  for (let t = startTime; t < now; t += bucketMs) {
    const k = Math.floor((t - startTime) / bucketMs);
    const b = buckets.get(k);
    if (b && b.count > 0) out.push({ t, v: b.sum / b.count });
  }
  return out;
}

export const LineGraphWidget: WidgetSpec<LineGraphConfig> = {
  id: 'line-graph',
  defaults: { hours: 24, bucketMinutes: 30 },
  entities: (config) => normaliseSeries(config).map((s) => s.entity),
  render: async (config, ctx) => {
    const seriesCfg = normaliseSeries(config);
    const label =
      config.label ?? `${seriesCfg[0]?.entity.split('.')[1] ?? ''} · ${config.hours}h`;

    const graphWidth = ctx.bbox.w;
    const graphHeight = ctx.bbox.h;
    const padding = { top: 44, right: 24, bottom: 44, left: 80 };
    const innerW = graphWidth - padding.left - padding.right;
    const innerH = graphHeight - padding.top - padding.bottom;

    const bucketMs = (config.bucketMinutes ?? 30) * 60 * 1000;
    const now = ctx.now.getTime();
    const startTime = now - config.hours * 60 * 60 * 1000;

    const seriesPoints: { points: { t: number; v: number }[]; label: string }[] = [];
    for (const s of seriesCfg) {
      const history = await ctx.fetchHistory([s.entity], config.hours);
      seriesPoints.push({
        points: bucketHistory(history, startTime, bucketMs, now),
        label: s.label ?? s.entity.split('.')[1] ?? s.entity,
      });
    }

    const allValues = seriesPoints.flatMap((s) => s.points.map((p) => p.v));
    const yMin = config.yMin ?? (allValues.length ? Math.min(...allValues) - 2 : 0);
    const yMax = config.yMax ?? (allValues.length ? Math.max(...allValues) + 2 : 1);
    const yRange = yMax - yMin || 1;

    const toX = (t: number) => padding.left + ((t - startTime) / (now - startTime)) * innerW;
    const toY = (v: number) => padding.top + innerH - ((v - yMin) / yRange) * innerH;

    const strokeStyles = ['', '8 6', '2 6'] as const;

    const seriesPaths = seriesPoints.map((s, i) => {
      const path = s.points
        .map(
          (p, j) => `${j === 0 ? 'M' : 'L'} ${toX(p.t).toFixed(1)} ${toY(p.v).toFixed(1)}`
        )
        .join(' ');
      const dasharray = strokeStyles[i % strokeStyles.length];
      return path
        ? `<path d="${path}" fill="none" stroke="#101010" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"${dasharray ? ` stroke-dasharray="${dasharray}"` : ''}/>`
        : '';
    });

    const firstPoints = seriesPoints[0]?.points ?? [];
    const areaD =
      seriesPoints.length === 1 && firstPoints.length > 0
        ? `M ${toX(firstPoints[0]!.t).toFixed(1)} ${toY(firstPoints[0]!.v).toFixed(1)} ${firstPoints
            .slice(1)
            .map((p) => `L ${toX(p.t).toFixed(1)} ${toY(p.v).toFixed(1)}`)
            .join(' ')} L ${toX(firstPoints[firstPoints.length - 1]!.t).toFixed(1)} ${(padding.top + innerH).toFixed(1)} L ${toX(firstPoints[0]!.t).toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`
        : '';

    const nGrid = 4;
    const yTickValues: number[] = [];
    const gridLines: string[] = [];
    for (let i = 0; i <= nGrid; i++) {
      const v = yMin + (yRange * i) / nGrid;
      yTickValues.push(v);
      const y = toY(v);
      gridLines.push(
        `<line x1="${padding.left}" y1="${y}" x2="${graphWidth - padding.right}" y2="${y}" stroke="#c8c4b6" stroke-width="1" stroke-dasharray="4 4"/>`
      );
    }

    const xTickHours = [0, config.hours / 4, config.hours / 2, (config.hours * 3) / 4, config.hours];
    const xTicks = xTickHours.map((h, i, arr) => {
      const t = now - h * 60 * 60 * 1000;
      return {
        x: toX(t),
        text: h === 0 ? 'now' : `-${Math.round(h)}h`,
        align: i === 0 ? 'end' : i === arr.length - 1 ? 'start' : 'center',
      } as const;
    });

    const empty = allValues.length === 0;
    const svg = `
      <svg width="${graphWidth}" height="${graphHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${graphWidth}" height="${graphHeight}" fill="#fafaf6" stroke="#303030" stroke-width="2" rx="12" ry="12"/>
        ${gridLines.join('\n')}
        ${areaD ? `<path d="${areaD}" fill="#101010" fill-opacity="0.08"/>` : ''}
        ${seriesPaths.join('\n')}
      </svg>
    `;
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    const yDecimals = yRange < 5 ? 1 : 0;

    return (
      <div style={{ position: 'relative', display: 'flex', width: '100%', height: '100%' }}>
        <img
          src={dataUrl}
          width={graphWidth}
          height={graphHeight}
          alt={label}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: padding.left,
            fontSize: 24,
            fontWeight: 700,
            color: '#101010',
            display: 'flex',
          }}
        >
          {label}
        </div>
        {seriesPoints.length > 1 ? (
          <div
            style={{
              position: 'absolute',
              top: 14,
              right: padding.right,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {seriesPoints.map((s, i) => (
              <div
                key={s.label}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginLeft: i === 0 ? 0 : 24,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 0,
                    borderTop: `3px ${i === 0 ? 'solid' : 'dashed'} #101010`,
                    marginRight: 8,
                  }}
                />
                <span style={{ fontSize: 22, color: '#202020' }}>{s.label}</span>
              </div>
            ))}
          </div>
        ) : null}
        {yTickValues.map((v) => (
          <div
            key={`y-${v}`}
            style={{
              position: 'absolute',
              top: toY(v) - 14,
              left: 0,
              width: padding.left - 12,
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-end',
              fontSize: 22,
              color: '#505050',
            }}
          >
            <span>{v.toFixed(yDecimals)}</span>
          </div>
        ))}
        {xTicks.map((tick) => {
          const tickW = 80;
          const left =
            tick.align === 'start'
              ? tick.x
              : tick.align === 'end'
                ? tick.x - tickW
                : tick.x - tickW / 2;
          return (
            <div
              key={`x-${tick.text}`}
              style={{
                position: 'absolute',
                bottom: 8,
                left,
                width: tickW,
                display: 'flex',
                flexDirection: 'row',
                justifyContent:
                  tick.align === 'start'
                    ? 'flex-start'
                    : tick.align === 'end'
                      ? 'flex-end'
                      : 'center',
                fontSize: 20,
                color: '#505050',
              }}
            >
              <span>{tick.text}</span>
            </div>
          );
        })}
        {empty ? (
          <div
            style={{
              position: 'absolute',
              top: padding.top + innerH / 2 - 14,
              left: padding.left,
              width: innerW,
              display: 'flex',
              justifyContent: 'center',
              fontSize: 22,
              color: '#808080',
            }}
          >
            <span>no data</span>
          </div>
        ) : null}
      </div>
    );
  },
};
