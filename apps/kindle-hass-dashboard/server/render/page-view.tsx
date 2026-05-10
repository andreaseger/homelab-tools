import * as React from 'react';
import type {
  PageConfig,
  ActionHotZone,
  WidgetCtx,
  Action,
  PlacedWidget,
  HistoryEntry,
} from '../../shared/types';
import { getWidget } from '../../widgets';

export type FetchHistoryFn = (entityIds: string[], hours: number) => Promise<HistoryEntry[]>;

export const HEADER_HEIGHT = 96;

interface ResolvedItem {
  placed: PlacedWidget;
  element: React.ReactNode;
}

const EMPTY_OBJ = {};

export async function resolveLayout(
  page: PageConfig,
  width: number,
  height: number,
  entityValues: Record<string, unknown>,
  now: Date,
  fetchHistory: FetchHistoryFn
): Promise<{ items: ResolvedItem[]; hotZones: ActionHotZone[] }> {
  const hotZones: ActionHotZone[] = [];
  const items: ResolvedItem[] = [];

  for (const placed of page.layout) {
    const spec = getWidget(placed.widget);
    if (!spec) continue;

    const config = { ...(spec.defaults ?? EMPTY_OBJ), ...(placed.config ?? EMPTY_OBJ) };
    const ctx = makeWidgetCtx(
      page,
      width,
      height,
      entityValues,
      now,
      fetchHistory,
      placed,
      hotZones
    );

    const result = spec.render(config as never, ctx);
    const element = result instanceof Promise ? await result : result;
    items.push({ placed, element });
  }

  return { items, hotZones };
}

function makeWidgetCtx(
  page: PageConfig,
  width: number,
  height: number,
  entityValues: Record<string, unknown>,
  now: Date,
  fetchHistory: FetchHistoryFn,
  placed: PlacedWidget,
  hotZones: ActionHotZone[]
): WidgetCtx {
  return {
    device: { id: 'kindle', width, height, startPageId: page.id },
    page,
    bbox: placed.bbox,
    entityValues,
    now,
    registerHotZone(
      bbox: { x: number; y: number; w: number; h: number },
      action: Action,
      debug?: string
    ) {
      // Hot zones from each widget are in widget-local coordinates. Translate
      // them into page coordinates using the widget's placed bbox, plus the
      // global header offset.
      const globalBbox = {
        x: placed.bbox.x + bbox.x,
        y: HEADER_HEIGHT + placed.bbox.y + bbox.y,
        w: bbox.w,
        h: bbox.h,
      };
      hotZones.push({ bbox: globalBbox, action, debug });
    },
    fetchHistory,
  };
}

export interface PageViewProps {
  page: PageConfig;
  width: number;
  height: number;
  items: ResolvedItem[];
  now: Date;
}

export function PageView(props: PageViewProps): React.ReactElement {
  const elements = props.items.map(({ placed, element }) => (
    <div
      key={`${placed.widget}-${placed.bbox.x}-${placed.bbox.y}`}
      style={{
        position: 'absolute',
        left: placed.bbox.x,
        top: HEADER_HEIGHT + placed.bbox.y,
        width: placed.bbox.w,
        height: placed.bbox.h,
        display: 'flex',
      }}
    >
      {element}
    </div>
  ));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f4f1ea',
        fontFamily: 'Bookerly, Georgia, serif',
        width: props.width,
        height: props.height,
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 28px',
          borderBottom: '3px solid #2a2a2a',
          height: HEADER_HEIGHT,
          boxSizing: 'border-box',
        }}
      >
        <span style={{ fontSize: 44, fontWeight: 700, color: '#101010' }}>{props.page.title}</span>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 56, fontWeight: 700, color: '#101010', lineHeight: 1 }}>
            {props.now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span style={{ fontSize: 20, color: '#505050', marginTop: 4 }}>
            {props.now.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </div>
      </div>
      {elements}
    </div>
  );
}
