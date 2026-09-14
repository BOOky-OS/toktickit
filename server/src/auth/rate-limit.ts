import { ApiError, clock } from "./security.js";

type Bucket = { count: number; until: number };
export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  constructor(private capacity = 10000, private windowMs = 15 * 60 * 1000) {}
  clear() { this.buckets.clear(); }
  consume(keys: Array<[string, number]>) {
    const now = clock.now().getTime();
    for (const [key, bucket] of this.buckets) if (bucket.until <= now) this.buckets.delete(key);
    let retry = 0;
    for (const [key, limit] of keys) {
      const bucket = this.buckets.get(key);
      if (bucket && bucket.count >= limit) retry = Math.max(retry, bucket.until - now);
    }
    const missing = new Set(keys.filter(([k]) => !this.buckets.has(k)).map(([k]) => k)).size;
    // Fail closed when full; do not evict live buckets and enable throttle bypass.
    if (this.buckets.size + missing > this.capacity) retry = Math.max(retry, this.windowMs);
    if (retry) throw new RateLimitError(Math.ceil(retry / 1000));
    for (const [key] of keys) {
      const bucket = this.buckets.get(key) ?? { count: 0, until: now + this.windowMs };
      bucket.count++; this.buckets.set(key, bucket);
    }
  }
}
export class RateLimitError extends ApiError {
  constructor(public retryAfter: number) { super(429, "RATE_LIMITED", "Too many attempts. Try again later."); }
}
export const loginLimit = new RateLimiter();
export const csrfLimit = new RateLimiter();
