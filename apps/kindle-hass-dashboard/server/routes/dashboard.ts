import { renderHtml } from '../renderer';
import { getEntities } from '../hass';

export async function serveFragment(): Promise<Response> {
  const result = await renderHtml(getEntities());
  return new Response(result.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ETag: result.etag,
      'Cache-Control': 'no-store',
    },
  });
}

export async function serveDashboard(): Promise<Response> {
  const result = await renderHtml(getEntities());
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${result.width}, initial-scale=0.5">
<title>Kindle Dashboard</title>
<style>
  html, body { margin: 0; padding: 0; background: #2a2a2a; min-height: 100vh; }
  body { display: flex; align-items: flex-start; justify-content: center; padding: 24px; }
  #frame {
    width: ${result.width}px;
    height: ${result.height}px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    background: #f4f1ea;
    transform-origin: top center;
    /* Scale the kindle-resolution canvas down to fit reasonable viewports */
    transform: scale(min(1, calc((100vh - 64px) / ${result.height}), calc((100vw - 64px) / ${result.width})));
  }
  #dashboard { width: 100%; height: 100%; }
  #status {
    position: fixed; top: 8px; right: 12px; color: #aaa;
    font: 12px/1 system-ui, sans-serif; opacity: 0.7;
  }
  #status.disconnected { color: #ff8a8a; }
</style>
</head>
<body>
<div id="status">live</div>
<div id="frame"><div id="dashboard">${result.html}</div></div>
<script>
(() => {
  const dash = document.getElementById('dashboard');
  const status = document.getElementById('status');
  const frame = document.getElementById('frame');
  const W = ${result.width}, H = ${result.height};

  frame.addEventListener('click', async (e) => {
    const rect = frame.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / rect.width * W);
    const y = Math.round((e.clientY - rect.top) / rect.height * H);
    await fetch('/touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y }),
    });
  });

  async function refresh() {
    const res = await fetch('/fragment', { cache: 'no-store' });
    if (!res.ok) return;
    dash.innerHTML = await res.text();
  }

  function connect() {
    const es = new EventSource('/events');
    es.onmessage = () => { refresh(); };
    es.onopen = () => { status.textContent = 'live'; status.classList.remove('disconnected'); };
    es.onerror = () => {
      status.textContent = 'reconnecting…';
      status.classList.add('disconnected');
      es.close();
      setTimeout(connect, 2000);
    };
  }
  connect();
})();
</script>
</body>
</html>`;
  return new Response(page, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
