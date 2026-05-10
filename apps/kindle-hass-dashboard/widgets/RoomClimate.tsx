import type { WidgetSpec } from '../shared/types';

interface RoomClimateMetric {
  entity: string;
  caption: string;
  decimals?: number;
}

interface RoomClimateGraph {
  entity: string;
  hours?: number;
  bucketMinutes?: number;
  label?: string;
}

// Round observed (min, max) to "nice" tick boundaries spanning the data
// with ~2-3 intervals, so axis labels are clean (e.g. 600/700/800).
function niceScale(
  observedMin: number,
  observedMax: number
): { min: number; max: number; ticks: number[]; decimals: number } {
  if (
    !Number.isFinite(observedMin) ||
    !Number.isFinite(observedMax) ||
    observedMin === observedMax
  ) {
    const v = Number.isFinite(observedMin) ? observedMin : 0;
    return { min: v - 1, max: v + 1, ticks: [v - 1, v, v + 1], decimals: 0 };
  }
  const range = observedMax - observedMin;
  const target = range / 2;
  const exp = Math.floor(Math.log10(target));
  const base = Math.pow(10, exp);
  const fraction = target / base;
  const stepFraction = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : 5;
  const step = stepFraction * base;
  const niceMin = Math.floor(observedMin / step) * step;
  const niceMax = Math.ceil(observedMax / step) * step;
  const ticks: number[] = [];
  for (let i = 0; niceMin + i * step <= niceMax + step / 2; i++) {
    ticks.push(niceMin + i * step);
  }
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return { min: niceMin, max: niceMax, ticks, decimals };
}

interface RoomClimateConfig {
  label: string;
  metrics: RoomClimateMetric[];
  graph?: RoomClimateGraph;
}

function readEntity(
  entityValues: Record<string, unknown>,
  id: string,
  decimals: number
): { value: string; unit: string } {
  const e = entityValues[id] as
    | { state?: string; attributes?: Record<string, unknown> }
    | undefined;
  const raw = e?.state ?? '—';
  const num = parseFloat(raw);
  const value = Number.isNaN(num) ? raw : num.toFixed(decimals);
  const unit = (e?.attributes?.unit_of_measurement as string) ?? '';
  return { value, unit };
}

function metric(
  key: string,
  value: string,
  unit: string,
  caption: string,
  isPrimary: boolean,
  marginLeft: number
) {
  return (
    <div
      key={key}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginLeft,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span
          style={{
            fontSize: isPrimary ? 72 : 48,
            fontWeight: 700,
            color: '#101010',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit ? (
          <span
            style={{
              fontSize: isPrimary ? 22 : 18,
              color: '#404040',
              marginLeft: 6,
            }}
          >
            {unit}
          </span>
        ) : null}
      </div>
      <span
        style={{
          fontSize: 18,
          color: '#505050',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginTop: 6,
        }}
      >
        {caption}
      </span>
    </div>
  );
}

export const RoomClimateWidget: WidgetSpec<RoomClimateConfig> = {
  id: 'room-climate',
  entities: (config) => [
    ...config.metrics.map((m) => m.entity),
    ...(config.graph ? [config.graph.entity] : []),
  ],
  render: async (config, ctx) => {
    let graphImg: JSX.Element | null = null;
    if (config.graph) {
      const hours = config.graph.hours ?? 6;
      const bucketMs = (config.graph.bucketMinutes ?? 15) * 60 * 1000;
      const history = await ctx.fetchHistory([config.graph.entity], hours);

      const now = ctx.now.getTime();
      const startTime = now - hours * 60 * 60 * 1000;
      const buckets = new Map<number, { sum: number; count: number }>();
      for (const point of history) {
        const k = Math.floor((point.timestamp - startTime) / bucketMs);
        const ex = buckets.get(k) ?? { sum: 0, count: 0 };
        ex.sum += point.value;
        ex.count++;
        buckets.set(k, ex);
      }
      const points: { t: number; v: number }[] = [];
      for (let t = startTime; t < now; t += bucketMs) {
        const k = Math.floor((t - startTime) / bucketMs);
        const b = buckets.get(k);
        if (b && b.count > 0) points.push({ t, v: b.sum / b.count });
      }

      const W = 480;
      const H = 160;
      const observedMin = points.length ? Math.min(...points.map((p) => p.v)) : 0;
      const observedMax = points.length ? Math.max(...points.map((p) => p.v)) : 1;
      const { min: yMin, max: yMax, ticks: yTicks, decimals: yDec } = niceScale(
        observedMin,
        observedMax
      );
      const yRange = yMax - yMin || 1;
      const padLeft = 44;
      const padRight = 6;
      const padTop = 18;
      const padBottom = 18;
      const innerW = W - padLeft - padRight;
      const innerH = H - padTop - padBottom;
      const toX = (t: number) => padLeft + ((t - startTime) / (now - startTime)) * innerW;
      const toY = (v: number) => padTop + innerH - ((v - yMin) / yRange) * innerH;

      const path = points
        .map((p, i) => `${i ? 'L' : 'M'} ${toX(p.t).toFixed(1)} ${toY(p.v).toFixed(1)}`)
        .join(' ');
      const lastIdx = points.length - 1;
      const area =
        path && points.length
          ? `${path} L ${toX(points[lastIdx]!.t).toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${toX(points[0]!.t).toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
          : '';
      const headerLabel = config.graph.label ?? `${config.graph.entity.split('.')[1]?.slice(0, 12) ?? ''} · ${hours}H`;

      const yGridSvg = yTicks
        .map(
          (v) =>
            `<line x1="${padLeft}" y1="${toY(v)}" x2="${W - padRight}" y2="${toY(v)}" stroke="#c8c4b6" stroke-width="0.5" stroke-dasharray="2 3"/>`
        )
        .join('\n');

      // SVG holds only paths + lines (resvg can't reliably render text inside
      // an embedded data-URL SVG). Text labels are rendered as JSX siblings.
      const svg = `
        <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
          ${yGridSvg}
          <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + innerH}" stroke="#808080" stroke-width="1"/>
          <line x1="${padLeft}" y1="${padTop + innerH}" x2="${W - padRight}" y2="${padTop + innerH}" stroke="#808080" stroke-width="1"/>
          ${area ? `<path d="${area}" fill="#101010" fill-opacity="0.08"/>` : ''}
          ${path ? `<path d="${path}" fill="none" stroke="#101010" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
        </svg>
      `;
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

      const xTicks = [0, hours / 2, hours].map((h, i, arr) => {
        const t = now - h * 60 * 60 * 1000;
        return {
          x: toX(t),
          text: h === 0 ? 'now' : `-${h}h`,
          align: i === 0 ? 'end' : i === arr.length - 1 ? 'start' : 'center',
        } as const;
      });

      graphImg = (
        <div style={{ position: 'relative', display: 'flex', width: W, height: H }}>
          <img
            src={dataUrl}
            width={W}
            height={H}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              fontSize: 14,
              color: '#505050',
              letterSpacing: 1,
              display: 'flex',
            }}
          >
            {headerLabel}
          </div>
          {yTicks.map((v) => (
            <div
              key={`y-${v}`}
              style={{
                position: 'absolute',
                top: toY(v) - 8,
                left: 0,
                width: padLeft - 6,
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-end',
                fontSize: 12,
                color: '#505050',
              }}
            >
              <span>{v.toFixed(yDec)}</span>
            </div>
          ))}
          {xTicks.map((tick) => {
            const tickW = 60;
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
                  bottom: 0,
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
                  fontSize: 12,
                  color: '#505050',
                }}
              >
                <span>{tick.text}</span>
              </div>
            );
          })}
          {!points.length ? (
            <div
              style={{
                position: 'absolute',
                top: padTop + innerH / 2 - 10,
                left: padLeft,
                width: innerW,
                display: 'flex',
                justifyContent: 'center',
                fontSize: 16,
                color: '#808080',
              }}
            >
              <span>no history</span>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '20px 28px',
          border: '2px solid #303030',
          borderRadius: 12,
          backgroundColor: '#fafaf6',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            fontSize: 24,
            color: '#505050',
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {config.label}
        </span>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flex: 1,
            marginTop: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end' }}>
            {config.metrics.map((m, i) => {
              const v = readEntity(ctx.entityValues, m.entity, m.decimals ?? 0);
              return metric(m.entity, v.value, v.unit, m.caption, i === 0, i === 0 ? 0 : 40);
            })}
          </div>
          {graphImg ? (
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: 24 }}>{graphImg}</div>
          ) : null}
        </div>
      </div>
    );
  },
};
