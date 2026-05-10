import { test, expect, describe, beforeEach } from 'bun:test';
import { rateLimit } from '../server/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    const buckets = new Map<string, { count: number; resetAt: number }>();
    (rateLimit as unknown as { buckets: typeof buckets }).buckets = buckets;
  });

  test('first request for new device returns true', () => {
    expect(rateLimit('device1')).toBe(true);
  });

  test('10 requests per second are allowed', () => {
    for (let i = 0; i < 10; i++) {
      expect(rateLimit('device2')).toBe(true);
    }
  });

  test('11th request is blocked', () => {
    for (let i = 0; i < 10; i++) {
      rateLimit('device3');
    }
    expect(rateLimit('device3')).toBe(false);
  });

  test('different devices have independent limits', () => {
    for (let i = 0; i < 10; i++) {
      rateLimit('deviceA');
    }
    expect(rateLimit('deviceA')).toBe(false);
    expect(rateLimit('deviceB')).toBe(true);
  });
});
