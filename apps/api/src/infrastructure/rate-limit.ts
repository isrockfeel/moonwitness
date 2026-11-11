/**
 * Minimal dependency-free fixed-window rate limiter.
 *
 * Each key (typically a client IP) gets `max` requests per `windowMs`. Counters
 * reset lazily when a window expires, so memory is bounded by active keys.
 * Intended for a single-process API; a multi-instance deployment should back
 * this with a shared store.
 */
export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  now?: () => number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  reset(key?: string): void;
  size(): number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { windowMs, max } = options;
  const now = options.now ?? (() => Date.now());
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string): RateLimitResult {
      const t = now();
      let bucket = buckets.get(key);
      if (!bucket || t >= bucket.resetAt) {
        bucket = { count: 0, resetAt: t + windowMs };
        buckets.set(key, bucket);
      }
      if (bucket.count >= max) {
        return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - t };
      }
      bucket.count += 1;
      return { allowed: true, remaining: max - bucket.count, retryAfterMs: 0 };
    },
    reset(key?: string): void {
      if (key === undefined) buckets.clear();
      else buckets.delete(key);
    },
    size(): number {
      return buckets.size;
    },
  };
}
