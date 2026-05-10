const MAX_PER_SECOND = 10;

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + 1000 };
    buckets.set(key, bucket);
    return true;
  }

  if (bucket.count >= MAX_PER_SECOND) {
    return false;
  }

  bucket.count++;
  return true;
}
