import type { HassEntities } from 'home-assistant-js-websocket';

const DEBOUNCE_MS = parseInt(process.env.RENDER_DEBOUNCE_MS ?? '500', 10);

type RenderCallback = (device: string) => void;

class PageBus {
  private subscribers = new Map<string, Set<RenderCallback>>();
  private pendingDevices = new Set<string>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(device: string, callback: RenderCallback): () => void {
    if (!this.subscribers.has(device)) {
      this.subscribers.set(device, new Set());
    }
    this.subscribers.get(device)!.add(callback);

    return () => {
      this.subscribers.get(device)?.delete(callback);
    };
  }

  notifyForEntities(device: string, changedEntities: Set<string>): void {
    if (this.subscribers.has(device) && changedEntities.size > 0) {
      this.pendingDevices.add(device);
      this.flushDebounced();
    }
  }

  onEntitiesChange(_entities: HassEntities, entitySetsByDevice: Map<string, Set<string>>): void {
    for (const [device, entitySet] of entitySetsByDevice) {
      this.notifyForEntities(device, entitySet);
    }
  }

  tick(): void {
    for (const [device, cbs] of this.subscribers) {
      for (const cb of cbs) {
        cb(device);
      }
    }
  }

  private flushDebounced(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  private flush(): void {
    for (const device of this.pendingDevices) {
      const cbs = this.subscribers.get(device);
      if (cbs) {
        for (const cb of cbs) {
          cb(device);
        }
      }
    }
    this.pendingDevices.clear();
    this.debounceTimer = null;
  }
}

export const pageBus = new PageBus();
