import { devices } from '../devices';
import type { DeviceProfile } from '../../shared/types';

interface DeviceStateResponse {
  id: string;
  current_page: string;
  paused: boolean;
  last_render_at: number;
  width: number;
  height: number;
}

export function serveState(): Response {
  const deviceStates: DeviceStateResponse[] = devices.list().map((profile: DeviceProfile) => {
    const state = devices.getState(profile.id);
    return {
      id: profile.id,
      current_page: state.currentPage,
      paused: state.paused,
      last_render_at: state.lastRenderAt,
      width: profile.width,
      height: profile.height,
    };
  });

  return Response.json({ devices: deviceStates });
}
