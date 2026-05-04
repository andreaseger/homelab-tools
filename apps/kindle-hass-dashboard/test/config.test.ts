import { test, expect, describe } from 'bun:test';
import { validatePages, validateDevices } from '../server/config';

describe('validatePages', () => {
  test('valid pages pass', () => {
    const result = validatePages([
      {
        id: 'test',
        title: 'Test',
        layout: [{ widget: 'clock', bbox: { x: 0, y: 0, w: 100, h: 50 }, config: {} }],
      },
    ]);
    expect(result).toHaveLength(1);
  });

  test('empty id rejected', () => {
    expect(() =>
      validatePages([
        {
          id: '',
          title: 'Test',
          layout: [{ widget: 'clock', bbox: { x: 0, y: 0, w: 100, h: 50 }, config: {} }],
        },
      ])
    ).toThrow();
  });

  test('missing layout rejected', () => {
    expect(() => validatePages([{ id: 'test', title: 'Test' }])).toThrow();
  });

  test('empty layout array rejected', () => {
    expect(() => validatePages([{ id: 'test', title: 'Test', layout: [] }])).toThrow();
  });

  test('missing title rejected', () => {
    expect(() =>
      validatePages([
        {
          id: 'test',
          layout: [{ widget: 'clock', bbox: { x: 0, y: 0, w: 100, h: 50 }, config: {} }],
        },
      ])
    ).toThrow();
  });
});

describe('validateDevices', () => {
  test('valid device passes', () => {
    const result = validateDevices([
      { id: 'kindle1', width: 1072, height: 1448, startPageId: 'overview' },
    ]);
    expect(result).toHaveLength(1);
  });

  test('rotation transforms correctly', () => {
    const result = validateDevices([
      { id: 'k', width: 1072, height: 1448, rotation: '90', startPageId: 'o' },
    ]);
    expect(result[0]!.rotation).toBe(90);
  });

  test('negative width rejected', () => {
    expect(() =>
      validateDevices([{ id: 'k', width: -100, height: 1448, startPageId: 'o' }])
    ).toThrow();
  });

  test('zero width rejected', () => {
    expect(() =>
      validateDevices([{ id: 'k', width: 0, height: 1448, startPageId: 'o' }])
    ).toThrow();
  });

  test('invalid rotation rejected', () => {
    expect(() =>
      validateDevices([{ id: 'k', width: 1072, height: 1448, rotation: '45', startPageId: 'o' }])
    ).toThrow();
  });

  test('missing startPageId rejected', () => {
    expect(() => validateDevices([{ id: 'k', width: 1072, height: 1448 }])).toThrow();
  });
});
