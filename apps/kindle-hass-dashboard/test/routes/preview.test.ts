import { test, expect, describe } from 'bun:test';
import { servePreview } from '../../server/routes/preview';

describe('servePreview', () => {
  test('returns HTML response', async () => {
    const res = await servePreview('kindle1');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
  });

  test('HTML contains device name in title', async () => {
    const res = await servePreview('kindle1');
    const text = await res.text();
    expect(text).toContain('<title>Preview: kindle1</title>');
  });

  test('HTML contains base64 PNG', async () => {
    const res = await servePreview('kindle1');
    const text = await res.text();
    expect(text).toContain('data:image/png;base64,');
  });

  test('HTML contains click-to-touch script', async () => {
    const res = await servePreview('kindle1');
    const text = await res.text();
    expect(text).toContain('/touch');
    expect(text).toContain('fetch');
  });

  test('dev mode adds meta refresh', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const res = await servePreview('kindle1');
    const text = await res.text();
    expect(text).toContain('http-equiv="refresh"');
    process.env.NODE_ENV = originalEnv;
  });

  test('production mode does not add meta refresh', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = await servePreview('kindle1');
    const text = await res.text();
    expect(text).not.toContain('http-equiv="refresh"');
    process.env.NODE_ENV = originalEnv;
  });
});
