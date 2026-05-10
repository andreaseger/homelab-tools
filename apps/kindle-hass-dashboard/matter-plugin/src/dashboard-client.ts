interface DashboardStateResponse {
  current_page: string;
  paused: boolean;
  last_render_at: number;
  width: number;
  height: number;
}

export class DashboardClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = baseUrl ?? process.env.KINDLE_DASH_URL ?? 'http://127.0.0.1:8080';
    this.token = token ?? process.env.DASHBOARD_TOKEN ?? '';
  }

  async getState(): Promise<DashboardStateResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/state`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) return null;
      return res.json() as Promise<DashboardStateResponse>;
    } catch {
      return null;
    }
  }

  async postCommand(kind: string, value: number): Promise<boolean> {
    return this.postCommandWithBody({ kind, value });
  }

  async postCommandWithBody(body: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
