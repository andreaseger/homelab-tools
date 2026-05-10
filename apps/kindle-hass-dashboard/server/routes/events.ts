import { pageBus } from '../page-bus';

const HEARTBEAT_MS = 25_000;

export function serveEvents(_req: Request): Response {
  let unsub: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      let closed = false;
      const send = (line: string) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(line));
        } catch {
          closed = true;
        }
      };

      send(`retry: 2000\n\n`);
      send(`data: connected\n\n`);

      unsub = pageBus.subscribe(() => send(`data: tick\n\n`));
      heartbeat = setInterval(() => send(`: ping\n\n`), HEARTBEAT_MS);
    },
    cancel() {
      unsub?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
