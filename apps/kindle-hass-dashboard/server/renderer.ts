import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { state } from './state';
import { pages } from '../config/pages';
import { renderToSvg, loadFont } from './render/ssr';
import { renderToHtml } from './render/html';
import { ditherToEink } from './render/eink';
import { getHistory } from './hass';
import type { RenderResult, HistoryEntry, ActionHotZone } from '../shared/types';

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
  let raw: unknown[];
  try {
    raw = await getHistory(entityIds, startTime, now);
  } catch {
    return [];
  }

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

function activePage() {
  const page = pages.find((p) => p.id === state.currentPage) ?? pages[0];
  if (!page) throw new Error('No pages configured');
  return page;
}

export async function renderPng(
  entityValues: Record<string, unknown>,
  now: Date = new Date()
): Promise<RenderResult> {
  const page = activePage();
  const fontData = await getFont();
  const { svg, hotZones } = await renderToSvg(
    page,
    state.width,
    state.height,
    entityValues,
    fontData,
    fetchHistory,
    now
  );

  const resvg = new Resvg(svg, { fitTo: { mode: 'original' } });
  const png = resvg.render().asPng();
  const dithered = await ditherToEink(png);

  const etag = makeEtag(dithered, page.id, hotZones);
  state.currentEtag = etag;
  state.touchmap = hotZones;
  state.lastRenderAt = Date.now();

  return {
    png: dithered,
    etag,
    touchmap: hotZones,
    pageId: page.id,
    width: state.width,
    height: state.height,
  };
}

export async function renderHtml(
  entityValues: Record<string, unknown>,
  now: Date = new Date()
): Promise<{ html: string; etag: string; pageId: string; width: number; height: number }> {
  const page = activePage();
  const { html, hotZones } = await renderToHtml(
    page,
    state.width,
    state.height,
    entityValues,
    fetchHistory,
    now
  );

  const etag = `"${createHash('sha256').update(html).digest('hex').slice(0, 16)}"`;
  // Touchmap from the HTML render path is also valid for /touch since the JSX tree is identical.
  state.touchmap = hotZones;

  return { html, etag, pageId: page.id, width: state.width, height: state.height };
}

function makeEtag(png: Uint8Array, pageId: string, hotZones: ActionHotZone[]): string {
  const touchmapVersion = `${pageId}-${hotZones.length}`;
  const hash = createHash('sha256').update(png).update(touchmapVersion).digest('hex').slice(0, 16);
  return `"${hash}"`;
}
