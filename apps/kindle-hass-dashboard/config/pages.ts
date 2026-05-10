import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PageConfig } from '../shared/types';
import { validatePages } from '../server/config';

// Layout lives in pages.yaml (next to this file) so it can be edited or
// overridden via a mounted ConfigMap without rebuilding. Set PAGES_CONFIG
// to point at an alternate path.
const configPath = process.env.PAGES_CONFIG ?? resolve(import.meta.dir, 'pages.yaml');

const text = readFileSync(configPath, 'utf8');
const parsed = Bun.YAML.parse(text);

if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { pages?: unknown }).pages)) {
  throw new Error(`Invalid pages config at ${configPath}: expected { pages: [...] }`);
}

export const pages: PageConfig[] = validatePages((parsed as { pages: unknown }).pages);
