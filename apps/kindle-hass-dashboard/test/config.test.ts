import { test, expect, describe } from 'bun:test';
import { validatePages, validateDevices } from '../server/config';

describe('validatePages', () => {
  test('accepts valid pages', () => {
    const pages = [
      {
        id: 'overview',
        title: 'Overview',
        layout: [
          { widget: 'clock', bbox: { x: 0, y: 0, w: 400, h: 80 }, config: { format: '24h' } },
        ],
      },
    ];
    const result = validatePages(pages);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('overview');
  });

  test('rejects empty id', () => {
    expect(() => validatePages([{ id: '', title: 'Test', layout: [] }])).toThrow();
  });

  test('rejects missing layout', () => {
    expect(() => validatePages([{ id: 'test', title: 'Test' }])).toThrow();
  });
});

describe('validateDevices', () => {
  test('accepts valid device', () => {
    const devices = [
      { id: 'kindle1', width: 1072, height: 1448, startPageId: 'overview' },
    ];
    const result = validateDevices(devices);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('kindle1');
  });

  test('accepts optional rotation', () => {
    const devices = [
      { id: 'kindle1', width: 1072, height: 1448, startPageId: 'overview', rotation: '90' },
    ];
    const result = validateDevices(devices);
    expect(result[0]?.rotation).toBe(90);
  });

  test('rejects negative dimensions', () => {
    expect(() => validateDevices([{ id: 'k1', width: -100, height: 1448, startPageId: 'x' }])).toThrow();
  });
});
