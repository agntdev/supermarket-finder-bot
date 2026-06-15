export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 30,
};

const INLINE_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
};

interface BucketEntry {
  timestamps: number[];
}

export class RateLimiter {
  private buckets = new Map<string, BucketEntry>();
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  consume(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.buckets.get(key);
    if (!entry) {
      entry = { timestamps: [now] };
      this.buckets.set(key, entry);
      return true;
    }

    entry.timestamps = entry.timestamps.filter((t) => t >= windowStart);
    entry.timestamps.push(now);

    if (entry.timestamps.length <= this.config.maxRequests) {
      return true;
    }

    return false;
  }

  remaining(key: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const entry = this.buckets.get(key);
    if (!entry) return this.config.maxRequests;
    const inWindow = entry.timestamps.filter((t) => t >= windowStart).length;
    return Math.max(0, this.config.maxRequests - inWindow);
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowMs * 2;
    for (const [key, entry] of this.buckets) {
      entry.timestamps = entry.timestamps.filter((t) => t >= cutoff);
      if (entry.timestamps.length === 0) {
        this.buckets.delete(key);
      }
    }
  }
}

export const userRateLimiter = new RateLimiter(DEFAULT_CONFIG);
export const inlineRateLimiter = new RateLimiter(INLINE_CONFIG);

setInterval(() => {
  userRateLimiter.cleanup();
  inlineRateLimiter.cleanup();
}, 60_000).unref();
