import { test, expect, describe } from 'bun:test';
import { getWidget, listWidgets } from '../widgets/index';

describe('widget registry', () => {
  test('getWidget returns spec for known widget', () => {
    const spec = getWidget('clock');
    expect(spec).toBeDefined();
    expect(spec!.id).toBe('clock');
    expect(typeof spec!.render).toBe('function');
  });

  test('getWidget returns undefined for unknown widget', () => {
    expect(getWidget('nonexistent')).toBeUndefined();
  });

  test('listWidgets returns all registered widgets', () => {
    const widgets = listWidgets();
    expect(widgets).toHaveLength(7);
  });

  test('all widgets have id and render function', () => {
    const widgets = listWidgets();
    for (const w of widgets) {
      expect(typeof w.id).toBe('string');
      expect(typeof w.render).toBe('function');
    }
  });

  test('all widget IDs are unique', () => {
    const widgets = listWidgets();
    const ids = widgets.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
