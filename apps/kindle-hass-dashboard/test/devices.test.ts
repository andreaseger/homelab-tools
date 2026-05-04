import { test, expect, describe } from 'bun:test';
import { devices } from '../server/devices';

describe('DeviceRegistry', () => {
  describe('getProfile', () => {
    test('returns configured profile for known device', () => {
      const profile = devices.getProfile('kindle1');
      expect(profile.id).toBe('kindle1');
      expect(profile.width).toBe(1072);
      expect(profile.height).toBe(1448);
    });

    test('returns fallback profile for unknown device', () => {
      const profile = devices.getProfile('unknown-device');
      expect(profile.id).toBe('unknown-device');
      expect(profile.width).toBe(1072);
      expect(profile.height).toBe(1448);
    });
  });

  describe('getState', () => {
    test('creates state with correct defaults', () => {
      const state = devices.getState('test-device-defaults');
      expect(state.currentPage).toBe(state.profile.startPageId);
      expect(state.currentEtag).toBeNull();
      expect(state.touchmap).toEqual([]);
      expect(state.paused).toBe(false);
      expect(state.lastRenderAt).toBe(0);
    });

    test('returns same state object on repeated calls', () => {
      const s1 = devices.getState('test-device-singleton');
      const s2 = devices.getState('test-device-singleton');
      expect(s1).toBe(s2);
    });

    test('auto-creates state for unknown device with fallback profile', () => {
      const state = devices.getState('brand-new-device');
      expect(state.profile.id).toBe('brand-new-device');
      expect(state.profile.width).toBe(1072);
    });
  });

  describe('list', () => {
    test('returns all configured profiles', () => {
      const profiles = devices.list();
      expect(profiles.length).toBeGreaterThanOrEqual(1);
      expect(profiles.some((p) => p.id === 'kindle1')).toBe(true);
    });
  });

  describe('setPaused', () => {
    test('sets paused flag', () => {
      devices.setPaused('test-device-pause', true);
      expect(devices.getState('test-device-pause').paused).toBe(true);
    });

    test('unsets paused flag', () => {
      devices.setPaused('test-device-pause2', true);
      devices.setPaused('test-device-pause2', false);
      expect(devices.getState('test-device-pause2').paused).toBe(false);
    });
  });

  describe('setPage', () => {
    test('changes current page', () => {
      devices.setPage('test-device-page', 'lights');
      expect(devices.getState('test-device-page').currentPage).toBe('lights');
    });
  });
});
