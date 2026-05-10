import { test, expect, describe } from 'bun:test';
import { renderPng } from '../server/renderer';
import { state, setPage } from '../server/state';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MOCK_ENTITIES: Record<string, unknown> = {
  'sensor.living_room_temperature': {
    state: '22.5',
    attributes: { friendly_name: 'Living Room', unit_of_measurement: '°C' },
  },
  'sensor.bedroom_temperature': {
    state: '20.1',
    attributes: { friendly_name: 'Bedroom', unit_of_measurement: '°C' },
  },
  'sensor.outdoor_temperature': {
    state: '12.3',
    attributes: { friendly_name: 'Outdoor', unit_of_measurement: '°C' },
  },
  'sensor.living_room_humidity': {
    state: '45',
    attributes: { friendly_name: 'Humidity', unit_of_measurement: '%' },
  },
};

const SNAPSHOTS_DIR = join(import.meta.dir, '__snapshots__');
const FIXED_NOW = new Date('2025-01-15T10:30:00Z');

function ensureSnapshotDir() {
  if (!existsSync(SNAPSHOTS_DIR)) {
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
}

function snapshotPath(name: string): string {
  return join(SNAPSHOTS_DIR, `${name}.png`);
}

function assertImageSnapshot(png: Uint8Array, name: string) {
  ensureSnapshotDir();
  const path = snapshotPath(name);
  const updateSnapshots = process.env.UPDATE_SNAPSHOTS === '1';

  if (updateSnapshots || !existsSync(path)) {
    writeFileSync(path, Buffer.from(png));
    console.log(`Snapshot written: ${path}`);
    return;
  }

  const baseline = readFileSync(path);
  const baselineBuf = Buffer.from(baseline);
  const actualBuf = Buffer.from(png);

  if (!baselineBuf.equals(actualBuf)) {
    writeFileSync(path.replace('.png', '.actual.png'), actualBuf);
    throw new Error(
      `Snapshot mismatch for ${name}.png. Run with UPDATE_SNAPSHOTS=1 to update. Diff saved as ${name}.actual.png`
    );
  }
}

describe('renderPng', () => {
  test('returns render result for the dashboard', async () => {
    setPage('overview');
    const result = await renderPng(MOCK_ENTITIES, FIXED_NOW);
    expect(result.png).toBeInstanceOf(Uint8Array);
    expect(result.png.length).toBeGreaterThan(0);
    expect(result.etag).toMatch(/^"[0-9a-f]+"$/);
    expect(result.pageId).toBe('overview');
    expect(result.width).toBe(state.width);
    expect(result.height).toBe(state.height);
    expect(result.touchmap).toBeInstanceOf(Array);
  });

  test('same input produces same etag', async () => {
    setPage('overview');
    const r1 = await renderPng(MOCK_ENTITIES, FIXED_NOW);
    const r2 = await renderPng(MOCK_ENTITIES, FIXED_NOW);
    expect(r1.etag).toBe(r2.etag);
  });

  test('touchmap has navigate entries on overview (page tabs)', async () => {
    setPage('overview');
    const result = await renderPng(MOCK_ENTITIES, FIXED_NOW);
    const navZones = result.touchmap.filter((z) => z.action.kind === 'navigate');
    expect(navZones.length).toBeGreaterThan(0);
  });

  test('snapshot matches baseline - overview', async () => {
    setPage('overview');
    const result = await renderPng(MOCK_ENTITIES, FIXED_NOW);
    assertImageSnapshot(result.png, 'overview');
  });

  test('snapshot matches baseline - lights', async () => {
    setPage('lights');
    const entities: Record<string, unknown> = {
      'light.living_room': { state: 'on', attributes: { friendly_name: 'Living Room' } },
      'light.kitchen': { state: 'off', attributes: { friendly_name: 'Kitchen' } },
      'light.bedroom': { state: 'on', attributes: { friendly_name: 'Bedroom' } },
      'light.office': { state: 'off', attributes: { friendly_name: 'Office' } },
      'light.hallway': { state: 'off', attributes: { friendly_name: 'Hallway' } },
      'light.bathroom': { state: 'off', attributes: { friendly_name: 'Bathroom' } },
    };
    const result = await renderPng(entities, FIXED_NOW);
    assertImageSnapshot(result.png, 'lights');
    setPage('overview');
  });
});
