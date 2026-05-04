import { serveState } from './state';
import { serveCommands, enqueueCommand } from '../commands';
import { authMiddleware } from '../auth';
import { devices } from '../devices';
import { pageBus } from '../page-bus';

export async function serveCommand(req: Request): Promise<Response> {
  const auth = authMiddleware(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const device = url.searchParams.get('device') ?? 'kindle1';
  const since = parseInt(url.searchParams.get('since') ?? '0', 10);

  if (req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const kind = (body.kind as string) ?? '';

    if (kind === 'set_paused') {
      devices.setPaused(device, (body.value ?? 1) === 1);
      return Response.json({ ok: true });
    }

    if (kind === 'set_page') {
      const pageId = (body.pageId as string) ?? '';
      if (pageId) {
        devices.setPage(device, pageId);
        pageBus.notifyForEntities(device, new Set(['__tick__']));
      }
      return Response.json({ ok: true });
    }

    const value = (body.value as number) ?? 0;
    enqueueCommand(device, kind, value);
    return Response.json({ ok: true });
  }

  return serveCommands(device, since);
}

export { serveState };
