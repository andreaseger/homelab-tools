import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  callService as hassCallService,
  type Connection,
  type HassEntities,
} from 'home-assistant-js-websocket';

const HASS_URL = process.env.HASS_URL;
const HASS_TOKEN = process.env.HASS_TOKEN;

let conn: Connection | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(entities: HassEntities) => void>();
let latestEntities: HassEntities = {};

function restUrl(): string {
  return HASS_URL!;
}

function wsUrl(): string {
  const url = new URL(HASS_URL!);
  url.pathname = '/api/websocket';
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

async function createHassSocket(): Promise<WebSocket> {
  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(wsUrl());
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', (err) => reject(err));
  });
}

async function connect(): Promise<Connection> {
  const auth = createLongLivedTokenAuth(restUrl(), HASS_TOKEN!);

  const c = await createConnection({
    auth,
    createSocket: async () => (await createHassSocket()) as WebSocket & { haVersion: string },
  });

  subscribeEntities(c, (entities) => {
    latestEntities = entities;
    for (const fn of listeners) {
      fn(entities);
    }
  });

  return c;
}

async function connectWithRetry(): Promise<void> {
  if (!HASS_URL || !HASS_TOKEN) {
    console.warn('⚠️ HASS_URL/HASS_TOKEN not set, skipping HASS connection');
    return;
  }
  try {
    conn = await connect();
    console.log('✅ Connected to Home Assistant');
    conn.addEventListener('ready', () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
    });
    conn.addEventListener('disconnected', () => {
      console.warn('⚠️ HASS disconnected, reconnecting...');
      reconnectTimer = setTimeout(connectWithRetry, 2000);
    });
  } catch (err) {
    console.error('❌ HASS connection failed, retrying in 5s:', err);
    reconnectTimer = setTimeout(connectWithRetry, 5000);
  }
}

if (HASS_URL && HASS_TOKEN) {
  connectWithRetry();
}

export function onEntitiesChange(fn: (entities: HassEntities) => void): () => void {
  listeners.add(fn);
  if (Object.keys(latestEntities).length > 0) {
    fn(latestEntities);
  }
  return () => listeners.delete(fn);
}

export function getEntities(): HassEntities {
  return latestEntities;
}

export async function callService(
  domain: string,
  service: string,
  serviceData?: Record<string, unknown>,
  target?: { entity_id?: string | string[]; area_id?: string }
): Promise<void> {
  if (!conn) throw new Error('Not connected to HASS');
  await hassCallService(conn, domain, service, serviceData ?? {}, target);
}

export async function getHistory(
  entityIds: string[],
  startTime: Date,
  endTime?: Date
): Promise<unknown[]> {
  const url = new URL(`${restUrl()}/api/history/period`);
  url.searchParams.set('start', startTime.toISOString());
  if (endTime) url.searchParams.set('end', endTime.toISOString());
  for (const id of entityIds) {
    url.searchParams.append('filter_entity_id', id);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${HASS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`HASS history error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as unknown[];
}

export function getConnection(): Connection | null {
  return conn;
}
