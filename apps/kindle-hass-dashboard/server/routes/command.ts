import { serveState } from './state';
import { serveCommands, enqueueCommand } from '../commands';
import { authMiddleware } from '../auth';
import { setPaused, setPage } from '../state';
import { pageBus } from '../page-bus';

const DEVICE_KEY = 'kindle';

export async function serveCommand(req: Request): Promise<Response> {
  const auth = authMiddleware(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const since = parseInt(url.searchParams.get('since') ?? '0', 10);

  if (req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const kind = (body.kind as string) ?? '';

    if (kind === 'set_paused') {
      setPaused((body.value ?? 1) === 1);
      return Response.json({ ok: true });
    }

    if (kind === 'set_page') {
      const pageId = (body.pageId as string) ?? '';
      if (pageId) {
        setPage(pageId);
        pageBus.tick();
      }
      return Response.json({ ok: true });
    }

    const value = (body.value as number) ?? 0;
    enqueueCommand(DEVICE_KEY, kind, value);
    return Response.json({ ok: true });
  }

  return serveCommands(DEVICE_KEY, since);
}

export { serveState };
