import { test, expect, describe } from 'bun:test';
import { pageBus } from '../server/page-bus';

describe('PageBus', () => {
  describe('subscribe', () => {
    test('registers callback and triggers on tick', () => {
      const calls: string[] = [];
      pageBus.subscribe('bus-test-1', (device) => calls.push(device));
      pageBus.tick();
      expect(calls).toContain('bus-test-1');
    });

    test('unsubscribe removes callback', () => {
      const calls: string[] = [];
      const unsub = pageBus.subscribe('bus-test-2', (device) => calls.push(device));
      unsub();
      pageBus.tick();
      expect(calls).not.toContain('bus-test-2');
    });
  });

  describe('notifyForEntities', () => {
    test('non-empty entity set triggers callback via tick', () => {
      const calls: string[] = [];
      pageBus.subscribe('bus-test-4', (device) => calls.push(device));
      pageBus.notifyForEntities('bus-test-4', new Set(['sensor.temp']));
      pageBus.tick();
      expect(calls).toContain('bus-test-4');
    });

    test('unknown device does not trigger via notifyForEntities', () => {
      const calls: string[] = [];
      pageBus.notifyForEntities('nonexistent-bus', new Set(['sensor.temp']));
      pageBus.tick();
      expect(calls.filter((c) => c === 'nonexistent-bus')).toHaveLength(0);
    });
  });

  describe('onEntitiesChange', () => {
    test('notifies matching devices', () => {
      const calls: string[] = [];
      pageBus.subscribe('bus-test-5', (device) => calls.push(device));
      pageBus.onEntitiesChange({}, new Map([['bus-test-5', new Set(['sensor.temp'])]]));
      pageBus.tick();
      expect(calls).toContain('bus-test-5');
    });
  });

  describe('tick', () => {
    test('calls all callbacks for all subscribed devices', () => {
      const calls: string[] = [];
      pageBus.subscribe('bus-test-6a', (d) => calls.push(d));
      pageBus.subscribe('bus-test-6b', (d) => calls.push(d));
      pageBus.tick();
      expect(calls).toContain('bus-test-6a');
      expect(calls).toContain('bus-test-6b');
    });
  });
});
