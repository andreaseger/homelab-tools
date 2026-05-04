import satori from 'satori';
import type {
  PageConfig,
  DeviceProfile,
  ActionHotZone,
  WidgetCtx,
  Action,
  PlacedWidget,
  HistoryEntry,
} from '../../shared/types';
import { getWidget } from '../../widgets';
import * as React from 'react';

interface RenderContext {
  hotZones: ActionHotZone[];
  offsetY: number;
}

const ctxStack: RenderContext[] = [];

function currentCtx(): RenderContext {
  return ctxStack[ctxStack.length - 1]!;
}

type FetchHistoryFn = (entityIds: string[], hours: number) => Promise<HistoryEntry[]>;

function createWidgetCtx(
  device: DeviceProfile,
  page: PageConfig,
  entityValues: Record<string, unknown>,
  now: Date,
  fetchHistory: FetchHistoryFn
): WidgetCtx {
  return {
    device,
    page,
    entityValues,
    now,
    registerHotZone(
      bbox: { x: number; y: number; w: number; h: number },
      action: Action,
      debug?: string
    ) {
      const globalBbox = {
        x: bbox.x,
        y: bbox.y + currentCtx().offsetY,
        w: bbox.w,
        h: bbox.h,
      };
      currentCtx().hotZones.push({ bbox: globalBbox, action, debug });
    },
    fetchHistory,
  };
}

const EMPTY_OBJ = {};

function PageView({
  page,
  device,
  entityValues,
  now,
  fetchHistory,
}: {
  page: PageConfig;
  device: DeviceProfile;
  entityValues: Record<string, unknown>;
  now: Date;
  fetchHistory: FetchHistoryFn;
}) {
  const widgetCtx = createWidgetCtx(device, page, entityValues, now, fetchHistory);

  const elements = page.layout.map((placed: PlacedWidget) => {
    const spec = getWidget(placed.widget);
    if (!spec) return null;

    const config = { ...(spec.defaults ?? EMPTY_OBJ), ...(placed.config ?? EMPTY_OBJ) };
    const el = spec.render(config, widgetCtx);

    return (
      <div
        key={`${placed.widget}-${placed.bbox.x}-${placed.bbox.y}`}
        style={{
          position: 'absolute',
          left: placed.bbox.x,
          top: placed.bbox.y,
          width: placed.bbox.w,
          height: placed.bbox.h,
          display: 'flex',
        }}
      >
        {el as React.ReactNode}
      </div>
    );
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f0f0f0',
        fontFamily: 'Bookerly, Georgia, serif',
        width: device.width,
        height: device.height,
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '2px solid #808080',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 'bold', color: '#202020' }}>{page.title}</span>
        <span style={{ fontSize: 18, color: '#606060' }}>
          {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {elements}
    </div>
  );
}

export async function renderToSvg(
  page: PageConfig,
  device: DeviceProfile,
  entityValues: Record<string, unknown>,
  fontData: Buffer,
  fetchHistory: FetchHistoryFn,
  now: Date = new Date()
): Promise<{ svg: string; hotZones: ActionHotZone[] }> {
  const renderCtx: RenderContext = { hotZones: [], offsetY: 60 };
  ctxStack.push(renderCtx);

  try {
    const element = React.createElement(PageView, {
      page,
      device,
      entityValues,
      now,
      fetchHistory,
    });

    const svg = await satori(element, {
      width: device.width,
      height: device.height,
      fonts: [
        {
          name: 'Bookerly',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
      ],
    });

    return { svg, hotZones: renderCtx.hotZones };
  } finally {
    ctxStack.pop();
  }
}

async function fetchGoogleFont(name: string): Promise<Buffer | null> {
  try {
    const res = await fetch(`https://fonts.googleapis.com/css2?family=${name}&display=swap`);
    if (!res.ok) return null;
    const text = await res.text();
    const urlMatch = text.match(/url\(([^)]+)\)/);
    if (!urlMatch) return null;
    const fontRes = await fetch(urlMatch[1]!);
    return Buffer.from(await fontRes.arrayBuffer());
  } catch {
    return null;
  }
}

const FALLBACK_FONT = Buffer.alloc(0);

export async function loadFont(): Promise<Buffer> {
  return (await fetchGoogleFont('Bookerly')) ?? (await fetchGoogleFont('Georgia')) ?? FALLBACK_FONT;
}
