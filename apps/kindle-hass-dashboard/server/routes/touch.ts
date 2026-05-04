import { resolveTap } from '../pager';
import { devices } from '../devices';
import { callService } from '../hass';
import { pageBus } from '../page-bus';

export async function handleTouch(body: unknown): Promise<{ status: number; body: unknown }> {
  const data = body as Record<string, unknown>;
  const device = data.device as string;
  const x = data.x as number;
  const y = data.y as number;
  const etag = data.etag as string;

  if (!device || x == null || y == null) {
    return { status: 400, body: { error: 'missing device, x, or y' } };
  }

  const state = devices.getState(device);

  if (etag && state.currentEtag && etag !== state.currentEtag) {
    return { status: 409, body: { error: 'stale etag', currentEtag: state.currentEtag } };
  }

  const action = resolveTap(state.touchmap, x, y);

  if (action.kind === 'noop') {
    return { status: 200, body: { action: 'noop' } };
  }

  if (action.kind === 'service') {
    try {
      await callService(action.domain, action.service, action.data, action.target);
    } catch (err) {
      return { status: 502, body: { error: `HASS service call failed: ${err}` } };
    }
  }

  if (action.kind === 'navigate') {
    state.currentPage = action.pageId;
    pageBus.tick();
  }

  return { status: 200, body: { action: action.kind } };
}
