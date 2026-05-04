import { serveState } from './state';
import { serveCommands, enqueueCommand } from '../commands';
import { authMiddleware } from '../auth';

export async function serveCommand(req: Request): Promise<Response> {
  const auth = authMiddleware(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const device = url.searchParams.get('device') ?? 'kindle1';
  const since = parseInt(url.searchParams.get('since') ?? '0', 10);

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const kind = (body.kind as string) ?? '';
    const value = (body.value as number) ?? 0;
    enqueueCommand(device, kind, value);
    return Response.json({ ok: true });
  }

  return serveCommands(device, since);
}

export { serveState };
