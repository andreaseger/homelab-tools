import { test, expect, describe } from 'bun:test';
import { validatePages } from '../server/config';

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
