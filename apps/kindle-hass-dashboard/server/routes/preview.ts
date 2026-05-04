export function servePreview(device: string): Response {
  return new Response(`<html><body><h1>Preview: ${device}</h1><p>Stub — M1</p></body></html>`, {
    headers: { 'Content-Type': 'text/html' },
  });
}
