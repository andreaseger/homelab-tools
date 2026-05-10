import satori from 'satori';
import * as React from 'react';
import type { PageConfig, ActionHotZone } from '../../shared/types';
import { PageView, resolveLayout, type FetchHistoryFn } from './page-view';

export async function renderToSvg(
  page: PageConfig,
  width: number,
  height: number,
  entityValues: Record<string, unknown>,
  fontData: Buffer,
  fetchHistory: FetchHistoryFn,
  now: Date = new Date()
): Promise<{ svg: string; hotZones: ActionHotZone[] }> {
  const { items, hotZones } = await resolveLayout(
    page,
    width,
    height,
    entityValues,
    now,
    fetchHistory
  );

  const element = React.createElement(PageView, { page, width, height, items, now });
  const svg = await satori(element, {
    width,
    height,
    fonts: [{ name: 'Bookerly', data: fontData, weight: 400, style: 'normal' }],
  });

  return { svg, hotZones };
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
