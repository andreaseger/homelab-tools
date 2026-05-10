import { resolveTap } from '../pager';
import { state, setPage } from '../state';
import { callService } from '../hass';
import { pageBus } from '../page-bus';

// Safety-net debounce: evtest emits many Report Sync events per physical
// tap. The Kindle touch-listener now sends only one POST per tap, but this
// catches any duplicates that slip through (network retries, etc.).
const DEBOUNCE_MS = 500;
let lastTapTime = 0;

/** Reset the debounce timer (used by tests). */
export function resetTouchDebounce() {
  lastTapTime = 0;
}

export async function handleTouch(body: unknown): Promise<{ status: number; body: unknown }> {
  const data = body as Record<string, unknown>;
  const x = data.x as number;
  const y = data.y as number;
  const etag = data.etag as string | undefined;

  if (x == null || y == null) {
    return { status: 400, body: { error: 'missing x or y' } };
  }

  if (etag && state.currentEtag && etag !== state.currentEtag) {
    return { status: 409, body: { error: 'stale etag', currentEtag: state.currentEtag } };
  }

  const now = Date.now();
  if (now - lastTapTime < DEBOUNCE_MS) {
    return { status: 200, body: { action: 'noop', reason: 'debounce' } };
  }
  lastTapTime = now;

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
    setPage(action.pageId);
    pageBus.tick();
  }

  return { status: 200, body: { action: action.kind } };
}
