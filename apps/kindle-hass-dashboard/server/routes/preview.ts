import { render } from '../renderer';
import { getEntities } from '../hass';

export async function servePreview(device: string): Promise<Response> {
  const entities = getEntities();
  const result = await render(device, entities);
  const b64 = Buffer.from(result.png).toString('base64');
  const isDev = process.env.NODE_ENV !== 'production';

  return new Response(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Preview: ${device}</title>
${isDev ? '<meta http-equiv="refresh" content="2">' : ''}
<style>
body { margin: 0; background: #333; display: flex; justify-content: center; padding: 20px; }
img { max-width: 100%; height: auto; background: #f0f0f0; }
</style>
<script>
document.addEventListener('click', async (e) => {
  const img = document.querySelector('img');
  if (!img) return;
  const rect = img.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) / rect.width * ${result.width});
  const y = Math.round((e.clientY - rect.top) / rect.height * ${result.height});
  await fetch('/touch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device: '${device}', x, y, etag: img.dataset.etag }),
  });
});
</script>
</head>
<body>
<img src="data:image/png;base64,${b64}" data-etag="${result.etag}" alt="Dashboard preview">
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
