import * as yaml from 'js-yaml';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

export interface SpecMeta {
  id: string;
  filename: string;
  title: string;
  version: string;
  type: 'openapi' | 'asyncapi';
}

const SPEC_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);

function detectSpecType(
  content: Record<string, unknown>
): 'openapi' | 'asyncapi' | null {
  if ('openapi' in content) return 'openapi';
  if ('asyncapi' in content) return 'asyncapi';
  return null;
}

function parseSpecContent(
  raw: string,
  filename: string
): Record<string, unknown> | null {
  try {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.json') {
      return JSON.parse(raw) as Record<string, unknown>;
    }
    return yaml.load(raw) as Record<string, unknown>;
  } catch {
    console.warn(`⚠️  Failed to parse spec file: ${filename}`);
    return null;
  }
}

export async function scanSpecs(dir: string): Promise<SpecMeta[]> {
  const specs: SpecMeta[] = [];

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    console.warn(`⚠️  Could not read specs directory: ${dir}`, err);
    return specs;
  }

  for (const filename of entries) {
    const ext = path.extname(filename).toLowerCase();
    if (!SPEC_EXTENSIONS.has(ext)) continue;

    const filepath = path.join(dir, filename);
    try {
      const raw = await Bun.file(filepath).text();
      const content = parseSpecContent(raw, filename);
      if (!content) continue;

      const type = detectSpecType(content);
      if (!type) {
        console.warn(`⚠️  Unknown spec type in: ${filename}`);
        continue;
      }

      const info = content.info as Record<string, unknown> | undefined;
      specs.push({
        id: filename.replace(/\.[^.]+$/, ''),
        filename,
        title: (info?.title as string) ?? filename,
        version: (info?.version as string) ?? 'unknown',
        type,
      });
    } catch (err) {
      console.warn(`⚠️  Error reading spec file: ${filename}`, err);
    }
  }

  return specs.sort((a, b) => a.title.localeCompare(b.title));
}
