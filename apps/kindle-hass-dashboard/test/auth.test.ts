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

  test('unprotected path / returns null', async () => {
    const { authMiddleware } = await import('../server/auth');
    const res = authMiddleware(makeRequest('/'));
    expect(res).toBeNull();
  });

  test('preview in dev mode bypasses auth', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const { authMiddleware } = await import('../server/auth');
    const res = authMiddleware(makeRequest('/preview/kindle1'));
    expect(res).toBeNull();
    process.env.NODE_ENV = originalEnv;
  });
});
