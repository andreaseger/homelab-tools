import type { DeviceProfile, DeviceId } from '../shared/types';

const DEFAULT_PROFILES: DeviceProfile[] = [
  {
    id: 'kindle1',
    width: 1072,
    height: 1448,
    startPageId: 'overview',
  },
];

class DeviceRegistry {
  private profiles = new Map<DeviceId, DeviceProfile>(
    DEFAULT_PROFILES.map((p) => [p.id, p])
  );

  getProfile(deviceId: string): DeviceProfile {
    const profile = this.profiles.get(deviceId);
    if (!profile) {
      return {
        id: deviceId,
        width: DEFAULT_PROFILES[0]!.width,
        height: DEFAULT_PROFILES[0]!.height,
        startPageId: DEFAULT_PROFILES[0]!.startPageId,
      };
    }
    return profile;
  }

  list(): DeviceProfile[] {
    return Array.from(this.profiles.values());
  }
}

export const devices = new DeviceRegistry();
