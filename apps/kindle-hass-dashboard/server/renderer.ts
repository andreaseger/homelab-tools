import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { devices } from './devices';
import { pages } from '../config/pages';
import { renderToSvg, loadFont } from './render/ssr';
import { ditherToEink } from './render/eink';
import { getHistory } from './hass';
import type { RenderResult, HistoryEntry } from '../shared/types';

let cachedFont: Buffer | null = null;

async function getFont(): Promise<Buffer> {
  if (!cachedFont) {
    cachedFont = await loadFont();
  }
  return cachedFont;
}

async function fetchHistory(entityIds: string[], hours: number): Promise<HistoryEntry[]> {
  const now = new Date();
  const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const raw = await getHistory(entityIds, startTime, now);

  const entries: HistoryEntry[] = [];
  for (const entityStates of raw as Array<Array<{ state: string; last_changed: string }>>) {
    for (const point of entityStates) {
      const value = parseFloat(point.state);
      if (!isNaN(value)) {
        entries.push({
          timestamp: new Date(point.last_changed).getTime(),
          value,
        });
      }
    }
  }
  entries.sort((a, b) => a.timestamp - b.timestamp);
  return entries;
}

export async function render(
  deviceId: string,
  entityValues: Record<string, unknown>,
  now: Date = new Date()
): Promise<RenderResult> {
  const state = devices.getState(deviceId);
  const { width, height } = state.profile;

  const page = pages.find((p) => p.id === state.currentPage) ?? pages[0];
  if (!page) {
    throw new Error(`No pages configured for device ${deviceId}`);
  }

  const fontData = await getFont();
  const { svg, hotZones } = await renderToSvg(
    page,
    state.profile,
    entityValues,
    fontData,
    fetchHistory,
    now
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
  });

  const png = resvg.render().asPng();

  const dithered = await ditherToEink(png);

  const touchmapVersion = `${page.id}-${hotZones.length}`;
  const hash = createHash('sha256')
    .update(dithered)
    .update(touchmapVersion)
    .digest('hex')
    .slice(0, 16);
  const etag = `"${hash}"`;

  state.currentEtag = etag;
  state.touchmap = hotZones;
  state.lastRenderAt = Date.now();

  return {
    png: dithered,
    etag,
    touchmap: hotZones,
    pageId: page.id,
    width,
    height,
  };
}
