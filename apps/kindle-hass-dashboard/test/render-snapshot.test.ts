import { test, expect, describe } from 'bun:test';
import { render } from '../server/renderer';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MOCK_ENTITIES: Record<string, unknown> = {
  'sensor.temperature': {
    state: '22.5',
    attributes: { friendly_name: 'Temperature', unit_of_measurement: '°C' },
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

describe('render', () => {
  test('returns render result for kindle1', async () => {
    const result = await render('kindle1', MOCK_ENTITIES, FIXED_NOW);
    expect(result.png).toBeInstanceOf(Uint8Array);
    expect(result.png.length).toBeGreaterThan(0);
    expect(result.etag).toMatch(/^"[0-9a-f]+"$/);
    expect(result.pageId).toBe('overview');
    expect(result.width).toBe(1072);
    expect(result.height).toBe(1448);
    expect(result.touchmap).toBeInstanceOf(Array);
  });

  test('same input produces same etag', async () => {
    const r1 = await render('kindle1', MOCK_ENTITIES, FIXED_NOW);
    const r2 = await render('kindle1', MOCK_ENTITIES, FIXED_NOW);
    expect(r1.etag).toBe(r2.etag);
  });

  test('touchmap has entries for page-tabs', async () => {
    const result = await render('kindle1', MOCK_ENTITIES, FIXED_NOW);
    const navZones = result.touchmap.filter((z) => z.action.kind === 'navigate');
    expect(navZones.length).toBeGreaterThan(0);
  });

  test('snapshot matches baseline - overview', async () => {
    const result = await render('kindle1', MOCK_ENTITIES, FIXED_NOW);
    assertImageSnapshot(result.png, 'overview');
  });

  test('snapshot matches baseline - lights', async () => {
    const entities: Record<string, unknown> = {
      'light.living_room': {
        state: 'on',
        attributes: { friendly_name: 'Living Room Light' },
      },
    };
    const result = await render('kindle1', entities, FIXED_NOW);
    assertImageSnapshot(result.png, 'lights');
  });
});
