const DASHBOARD_URL = process.env.KINDLE_DASH_URL ?? 'http://127.0.0.1:8080';
const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN ?? '';

interface DeviceState {
  id: string;
  current_page: string;
  paused: boolean;
  last_render_at: number;
}

interface DashboardStateResponse {
  devices: DeviceState[];
}

interface CommandRequest {
  device: string;
  kind: string;
  value: number;
}

export class DashboardClient {
  async getState(): Promise<DashboardStateResponse | null> {
    try {
      const res = await fetch(`${DASHBOARD_URL}/state`, {
        headers: { Authorization: `Bearer ${DASHBOARD_TOKEN}` },
      });
      if (!res.ok) return null;
      return res.json() as Promise<DashboardStateResponse>;
    } catch {
      return null;
    }
  }

  async postCommand(device: string, kind: string, value: number): Promise<boolean> {
    try {
      const body: CommandRequest = { device, kind, value };
      const res = await fetch(`${DASHBOARD_URL}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DASHBOARD_TOKEN}`,
        },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
