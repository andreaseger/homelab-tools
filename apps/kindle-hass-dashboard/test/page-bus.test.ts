import { test, expect, describe } from 'bun:test';
import { pageBus } from '../server/page-bus';

describe('PageBus', () => {
  test('subscribed callback fires on tick', () => {
    let calls = 0;
    const unsub = pageBus.subscribe(() => {
      calls++;
    });
    pageBus.tick();
    expect(calls).toBeGreaterThanOrEqual(1);
    unsub();
  });

  test('unsubscribe removes callback', () => {
    let calls = 0;
    const unsub = pageBus.subscribe(() => {
      calls++;
    });
    unsub();
    pageBus.tick();
    expect(calls).toBe(0);
  });

  test('non-empty entity set triggers debounced flush', async () => {
    let calls = 0;
    const unsub = pageBus.subscribe(() => {
      calls++;
    });
    pageBus.notifyForEntities(new Set(['sensor.temp']));
    await new Promise((r) => setTimeout(r, 700));
    expect(calls).toBeGreaterThanOrEqual(1);
    unsub();
  });

  test('empty entity set does not trigger', async () => {
    let calls = 0;
    const unsub = pageBus.subscribe(() => {
      calls++;
    });
    pageBus.notifyForEntities(new Set());
    await new Promise((r) => setTimeout(r, 700));
    expect(calls).toBe(0);
    unsub();
  });
});
