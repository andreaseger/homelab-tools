import { test, expect, describe } from 'bun:test';
import { renderToSvg, loadFont } from '../server/render/ssr';
import type { PageConfig, HistoryEntry } from '../shared/types';

const W = 1072;
const H = 1448;
const NOOP_FETCH = async (): Promise<HistoryEntry[]> => [];

describe('renderToSvg', () => {
  test('returns SVG string and hotZones array', async () => {
    const fontData = await loadFont();
    const page: PageConfig = { id: 'test', title: 'Test', layout: [] };
    const { svg, hotZones } = await renderToSvg(page, W, H, {}, fontData, NOOP_FETCH);
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
    expect(Array.isArray(hotZones)).toBe(true);
  });

  test('hot zones are collected from page-tabs widget', async () => {
    const fontData = await loadFont();
    const page: PageConfig = {
      id: 'test',
      title: 'Test',
      layout: [
        {
          widget: 'page-tabs',
          bbox: { x: 0, y: 100, w: 1072, h: 56 },
          config: {
            pages: [
              { id: 'a', label: 'A' },
              { id: 'b', label: 'B' },
            ],
          },
        },
      ],
    };
    const { hotZones } = await renderToSvg(
      page,
      W,
      H,
      {},
      fontData,
      async () => [],
      new Date('2025-01-15T10:30:00Z')
    );
    expect(hotZones.length).toBe(2);
    expect(hotZones[0]!.action.kind).toBe('navigate');
  });

  test('unknown widget is skipped', async () => {
    const fontData = await loadFont();
    const page: PageConfig = {
      id: 'test',
      title: 'Test',
      layout: [
        {
          widget: 'nonexistent-widget',
          bbox: { x: 0, y: 100, w: 200, h: 100 },
          config: {},
        },
      ],
    };
    const { svg, hotZones } = await renderToSvg(page, W, H, {}, fontData, NOOP_FETCH);
    expect(typeof svg).toBe('string');
    expect(hotZones).toEqual([]);
  });

  test('widget defaults are merged with config', async () => {
    const fontData = await loadFont();
    const page: PageConfig = {
      id: 'test',
      title: 'Test',
      layout: [
        {
          widget: 'clock',
          bbox: { x: 0, y: 100, w: 400, h: 80 },
          config: {},
        },
      ],
    };
    const { svg } = await renderToSvg(page, W, H, {}, fontData, NOOP_FETCH);
    expect(svg).toContain('<svg');
  });
});
