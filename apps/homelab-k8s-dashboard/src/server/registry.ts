/**
 * Minimal Docker Registry v2 client used to answer "what is the newest tag for
 * this image?" for images that Flux does not track with an ImagePolicy.
 *
 * Only anonymous pull access is used, so private registries simply degrade to
 * "unknown" instead of failing the request.
 */

const DOCKER_HUB_HOSTS = [
  'docker.io',
  'index.docker.io',
  'registry-1.docker.io',
];
const DOCKER_HUB_API = 'registry-1.docker.io';
const REQUEST_TIMEOUT_MS = parseInt(process.env.REGISTRY_TIMEOUT || '8000');
const MAX_TAG_PAGES = 20;

export interface ImageRef {
  /** Registry host as it should be contacted, e.g. `registry-1.docker.io`. */
  host: string;
  /** Fully qualified repository path, e.g. `library/postgres`. */
  repository: string;
  tag: string;
}

export interface LatestTagInfo {
  latest_tag: string;
  versions_behind: number;
}

interface ParsedTag {
  /** Everything before the first digit, e.g. `v` in `v1.2.3`. */
  prefix: string;
  parts: number[];
  /** Everything after the numeric part, e.g. `-alpine`. */
  suffix: string;
}

/**
 * Splits an image reference into registry host, repository and tag.
 * Returns null for digest-pinned references, which have no version to compare.
 */
export function parseImageRef(image: string): ImageRef | null {
  if (image.includes('@')) {
    return null;
  }

  let remainder = image;
  let host = '';
  const firstSlash = remainder.indexOf('/');
  if (firstSlash !== -1) {
    const candidate = remainder.slice(0, firstSlash);
    if (
      candidate.includes('.') ||
      candidate.includes(':') ||
      candidate === 'localhost'
    ) {
      host = candidate;
      remainder = remainder.slice(firstSlash + 1);
    }
  }

  let repository = remainder;
  let tag = 'latest';
  const lastColon = remainder.lastIndexOf(':');
  if (lastColon !== -1 && !remainder.slice(lastColon).includes('/')) {
    repository = remainder.slice(0, lastColon);
    tag = remainder.slice(lastColon + 1);
  }

  if (!host || DOCKER_HUB_HOSTS.includes(host)) {
    host = DOCKER_HUB_API;
    if (!repository.includes('/')) {
      repository = `library/${repository}`;
    }
  }

  return { host, repository, tag };
}

/** Parses a tag such as `v1.2.3-alpine` into its comparable pieces. */
export function parseTag(tag: string): ParsedTag | null {
  const match = /^(\D*)(\d+(?:\.\d+)*)(.*)$/.exec(tag);
  if (!match) {
    return null;
  }
  const [, prefix, numbers, suffix] = match;
  return {
    prefix,
    parts: numbers.split('.').map(Number),
    suffix,
  };
}

/**
 * Two tags are comparable when they follow the same scheme: same prefix, same
 * number of numeric components and the same variant suffix. That keeps
 * `1.2.3-alpine` from being compared against `1.3.0` or `2.0.0-rc1`.
 */
function isComparable(a: ParsedTag, b: ParsedTag): boolean {
  return (
    a.prefix === b.prefix &&
    a.suffix === b.suffix &&
    a.parts.length === b.parts.length
  );
}

function compareParts(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return 0;
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/**
 * Performs the Docker registry token dance: an unauthenticated request returns
 * a `Www-Authenticate` challenge that tells us where to pick up a pull token.
 */
async function getPullToken(ref: ImageRef): Promise<string | null> {
  const cacheKey = `${ref.host}/${ref.repository}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const probe = await fetchWithTimeout(`https://${ref.host}/v2/`);
  if (probe.ok) {
    return null;
  }
  const challenge = probe.headers.get('www-authenticate');
  if (!challenge || !challenge.toLowerCase().startsWith('bearer')) {
    return null;
  }

  const params = new Map<string, string>();
  for (const [, key, value] of challenge.matchAll(/(\w+)="([^"]*)"/g)) {
    params.set(key, value);
  }
  const realm = params.get('realm');
  if (!realm) {
    return null;
  }

  const tokenUrl = new URL(realm);
  const service = params.get('service');
  if (service) {
    tokenUrl.searchParams.set('service', service);
  }
  tokenUrl.searchParams.set('scope', `repository:${ref.repository}:pull`);

  const response = await fetchWithTimeout(tokenUrl.toString());
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as {
    token?: string;
    access_token?: string;
    expires_in?: number;
  };
  const token = body.token || body.access_token;
  if (!token) {
    return null;
  }
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + (body.expires_in ?? 300) * 1000 - 30_000,
  });
  return token;
}

async function listTags(ref: ImageRef): Promise<string[]> {
  const token = await getPullToken(ref);
  const headers: Record<string, string> = {
    accept: 'application/json',
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const tags: string[] = [];
  let url = `https://${ref.host}/v2/${ref.repository}/tags/list?n=1000`;
  for (let page = 0; page < MAX_TAG_PAGES; page++) {
    const response = await fetchWithTimeout(url, { headers });
    if (!response.ok) {
      throw new Error(
        `tags/list for ${ref.repository} returned ${response.status}`
      );
    }
    const body = (await response.json()) as { tags?: string[] | null };
    tags.push(...(body.tags ?? []));

    const link = response.headers.get('link');
    const next = link ? /<([^>]+)>\s*;\s*rel="next"/.exec(link) : null;
    if (!next) {
      break;
    }
    url = new URL(next[1], `https://${ref.host}`).toString();
  }
  return tags;
}

/**
 * Returns the newest tag published for the image and how many releases the
 * running tag is behind it, or null when there is nothing comparable to say.
 */
export async function getLatestTag(
  image: string
): Promise<LatestTagInfo | null> {
  const ref = parseImageRef(image);
  if (!ref) {
    return null;
  }
  const current = parseTag(ref.tag);
  if (!current) {
    return null;
  }

  const tags = await listTags(ref);
  let newest = current;
  let newestTag = ref.tag;
  let behind = 0;

  for (const tag of tags) {
    const parsed = parseTag(tag);
    if (!parsed || !isComparable(parsed, current)) {
      continue;
    }
    if (compareParts(parsed.parts, current.parts) > 0) {
      behind++;
      if (compareParts(parsed.parts, newest.parts) > 0) {
        newest = parsed;
        newestTag = tag;
      }
    }
  }

  return { latest_tag: newestTag, versions_behind: behind };
}
