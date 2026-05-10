import { test, expect, describe } from 'bun:test';

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${url}`, { headers });
}

describe('authMiddleware', () => {
  test('unprotected path /health returns null', async () => {
    const { authMiddleware } = await import('../server/auth');
    const res = authMiddleware(makeRequest('/health'));
    expect(res).toBeNull();
  });

  test('unprotected path / returns null (browser dashboard)', async () => {
    const { authMiddleware } = await import('../server/auth');
    const res = authMiddleware(makeRequest('/'));
    expect(res).toBeNull();
  });

  test('unprotected path /events returns null (browser dashboard)', async () => {
    const { authMiddleware } = await import('../server/auth');
    const res = authMiddleware(makeRequest('/events'));
    expect(res).toBeNull();
  });
});
