import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { devices } from './devices';
import { pages } from '../config/pages';
import { renderToSvg, loadFont } from './render/ssr';
import { ditherToEink } from './render/eink';
import type { RenderResult } from '../shared/types';

let cachedFont: Buffer | null = null;

async function getFont(): Promise<Buffer> {
  if (!cachedFont) {
    cachedFont = await loadFont();
  }
  return cachedFont;
}

export async function render(deviceId: string, entityValues: Record<string, unknown>): Promise<RenderResult> {
  const state = devices.getState(deviceId);
  const { width, height } = state.profile;

  const page = pages.find((p) => p.id === state.currentPage) ?? pages[0];
  if (!page) {
    throw new Error(`No pages configured for device ${deviceId}`);
  }

  const fontData = await getFont();
  const { svg, hotZones } = await renderToSvg(page, state.profile, entityValues, fontData);

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
  });

  const png = resvg.render().asPng();

  const dithered = await ditherToEink(png);

  const touchmapVersion = `${page.id}-${hotZones.length}`;
  const hash = createHash('sha256').update(dithered).update(touchmapVersion).digest('hex').slice(0, 16);
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
