import * as React from 'react';
import { renderToString } from 'react-dom/server';
import type { PageConfig, ActionHotZone } from '../../shared/types';
import { PageView, resolveLayout, type FetchHistoryFn } from './page-view';

export async function renderToHtml(
  page: PageConfig,
  width: number,
  height: number,
  entityValues: Record<string, unknown>,
  fetchHistory: FetchHistoryFn,
  now: Date = new Date()
): Promise<{ html: string; hotZones: ActionHotZone[] }> {
  const { items, hotZones } = await resolveLayout(
    page,
    width,
    height,
    entityValues,
    now,
    fetchHistory
  );
  const element = React.createElement(PageView, { page, width, height, items, now });
  const html = renderToString(element);
  return { html, hotZones };
}
