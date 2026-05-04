import { DashboardClient } from './dashboard-client';

let client: DashboardClient | null = null;

function getClient(): DashboardClient {
  if (!client) {
    client = new DashboardClient();
  }
  return client;
}

export function setClient(c: DashboardClient): void {
  client = c;
}

let pollInterval: ReturnType<typeof setInterval> | null = null;

function mapStateToAttributes(deviceState: { current_page: string; paused: boolean }) {
  return {
    onOff: !deviceState.paused,
    currentPage: deviceState.current_page,
  };
}

function mapBacklightToCommand(value: number): { kind: string; value: number } {
  const intensity = Math.round((value / 100) * 24);
  return { kind: 'set_backlight', value: intensity };
}

export function startStatePoll(
  updateCallback: (state: ReturnType<typeof mapStateToAttributes>) => void
) {
  async function poll() {
    const state = await getClient().getState();
    if (state?.devices?.[0]) {
      const attrs = mapStateToAttributes(state.devices[0]);
      updateCallback(attrs);
    }
  }

  poll();
  pollInterval = setInterval(poll, 1000);
}

export function stopStatePoll() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

export async function handleBacklightChange(deviceId: string, level: number) {
  const cmd = mapBacklightToCommand(level);
  return getClient().postCommand(deviceId, cmd.kind, cmd.value);
}

export async function handlePageSwitch(deviceId: string, pageId: string) {
  return getClient().postCommandWithBody(deviceId, { kind: 'set_page', pageId });
}
