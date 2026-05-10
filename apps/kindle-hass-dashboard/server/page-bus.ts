import type { HassEntities } from 'home-assistant-js-websocket';

const DEBOUNCE_MS = parseInt(process.env.RENDER_DEBOUNCE_MS ?? '500', 10);

type TickCallback = () => void;

class PageBus {
  private subscribers = new Set<TickCallback>();
  private pending = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(callback: TickCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  notifyForEntities(changedEntities: Set<string>): void {
    if (changedEntities.size > 0) {
      this.pending = true;
      this.flushDebounced();
    }
  }

  onEntitiesChange(_entities: HassEntities, watched: Set<string>): void {
    this.notifyForEntities(watched);
  }

  tick(): void {
    for (const cb of this.subscribers) {
      cb();
    }
  }

  private flushDebounced(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  private flush(): void {
    if (this.pending) {
      this.tick();
      this.pending = false;
    }
    this.debounceTimer = null;
  }
}

export const pageBus = new PageBus();
