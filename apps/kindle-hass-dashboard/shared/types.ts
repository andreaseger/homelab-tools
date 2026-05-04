export type DeviceId = string;

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Action =
  | { kind: 'navigate'; pageId: string }
  | {
      kind: 'service';
      domain: string;
      service: string;
      target?: { entity_id?: string | string[]; area_id?: string };
      data?: Record<string, unknown>;
    }
  | { kind: 'noop' };

export interface ActionHotZone {
  bbox: BBox;
  action: Action;
  debug?: string;
}

export interface RenderResult {
  png: Uint8Array;
  etag: string;
  touchmap: ActionHotZone[];
  pageId: string;
  width: number;
  height: number;
}

export interface WidgetSpec<C = unknown> {
  id: string;
  defaults?: Partial<C>;
  entities?: (config: C) => string[];
  render: (config: C, ctx: WidgetCtx) => Promise<JSX.Element> | JSX.Element;
}

export interface WidgetCtx {
  device: DeviceProfile;
  page: PageConfig;
  entityValues: Record<string, unknown>;
  now: Date;
  registerHotZone: (bbox: BBox, action: Action, debug?: string) => void;
  fetchHistory: (entityIds: string[], hours: number) => Promise<HistoryEntry[]>;
}

export interface HistoryEntry {
  timestamp: number;
  value: number;
}

export interface PageConfig {
  id: string;
  title: string;
  layout: PlacedWidget[];
}

export interface PlacedWidget {
  widget: string;
  bbox: BBox;
  config: unknown;
}

export interface DeviceProfile {
  id: DeviceId;
  width: number;
  height: number;
  rotation?: 0 | 90 | 180 | 270;
  startPageId: string;
  navStripHeight?: number;
}
