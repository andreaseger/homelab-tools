export function serveHealth(): Response {
  return Response.json({ status: 'ok', ts: new Date().toISOString() });
}
