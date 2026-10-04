// Lightweight in-memory rate limiter.
//
// Suitable for a single Vercel instance / dev. For multi-instance production,
// swap the store for Upstash Redis or Vercel KV (same interface). Applied to
// expensive endpoints (recommendation generation, dashboard, search).

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}

// Periodic cleanup to prevent unbounded growth.
if (typeof setInterval !== "undefined") {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (v.resetAt <= now) store.delete(k);
    }
  }, 60_000);
  // Do not keep the process alive just for cleanup.
  if (typeof interval === "object" && "unref" in interval) {
    (interval as { unref: () => void }).unref();
  }
}
