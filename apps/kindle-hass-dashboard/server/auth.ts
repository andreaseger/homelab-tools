const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN;

const PROTECTED_PATHS = ['/render', '/touch', '/preview', '/state', '/command'];

export function authMiddleware(req: Request): Response | null {
  if (!DASHBOARD_TOKEN) return null;

  const url = new URL(req.url);
  if (!PROTECTED_PATHS.some((p) => url.pathname.startsWith(p))) {
    return null;
  }

  if (url.pathname.startsWith('/preview') && process.env.NODE_ENV !== 'production') {
    return null;
  }

  const auth = req.headers.get('authorization');
  const cookie = req.headers.get('cookie');

  if (auth === `Bearer ${DASHBOARD_TOKEN}`) return null;
  if (cookie?.includes(`token=${DASHBOARD_TOKEN}`)) return null;

  return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } });
}
