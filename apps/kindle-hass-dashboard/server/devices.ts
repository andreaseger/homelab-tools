import type { DeviceProfile, DeviceId, ActionHotZone } from '../shared/types';
import { deviceProfiles } from '../config/devices';

class DeviceState {
  currentPage: string;
  currentEtag: string | null;
  touchmap: ActionHotZone[];
  lastEntityValues: Record<string, unknown>;
  lastRenderAt: number;
  paused: boolean;

  constructor(public readonly profile: DeviceProfile) {
    this.currentPage = profile.startPageId;
    this.currentEtag = null;
    this.touchmap = [];
    this.lastEntityValues = {};
    this.lastRenderAt = 0;
    this.paused = false;
  }
}

class DeviceRegistry {
  private states = new Map<DeviceId, DeviceState>();
  private profiles = new Map<DeviceId, DeviceProfile>(deviceProfiles.map((p) => [p.id, p]));

  getProfile(deviceId: string): DeviceProfile {
    const profile = this.profiles.get(deviceId);
    if (!profile) {
      return {
        id: deviceId,
        width: deviceProfiles[0]!.width,
        height: deviceProfiles[0]!.height,
        startPageId: deviceProfiles[0]!.startPageId,
      };
    }
    return profile;
  }

  getState(deviceId: string): DeviceState {
    let state = this.states.get(deviceId);
    if (!state) {
      const profile = this.getProfile(deviceId);
      state = new DeviceState(profile);
      this.states.set(deviceId, state);
    }
    return state;
  }

  list(): DeviceProfile[] {
    return Array.from(this.profiles.values());
  }

  setPaused(deviceId: string, paused: boolean): void {
    const state = this.getState(deviceId);
    state.paused = paused;
  }

  setPage(deviceId: string, pageId: string): void {
    const state = this.getState(deviceId);
    state.currentPage = pageId;
  }
}

export const devices = new DeviceRegistry();
