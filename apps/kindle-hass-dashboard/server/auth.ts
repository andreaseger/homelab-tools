const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN;
const IS_DEV = process.env.NODE_ENV !== 'production';

const PROTECTED_PATHS = ['/render', '/touch', '/state', '/command'];

export function authMiddleware(req: Request): Response | null {
  if (IS_DEV) return null;
  if (!DASHBOARD_TOKEN) return null;

  const url = new URL(req.url);
  if (!PROTECTED_PATHS.some((p) => url.pathname.startsWith(p))) {
    return null;
  }

  const auth = req.headers.get('authorization');
  const cookie = req.headers.get('cookie');

  if (auth === `Bearer ${DASHBOARD_TOKEN}`) return null;
  if (cookie?.includes(`token=${DASHBOARD_TOKEN}`)) return null;

  return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } });
}
