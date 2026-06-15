interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class TTLCache<V> {
  private store = new Map<string, CacheEntry<V>>();
  private defaultTTLMs: number;

  constructor(defaultTTLMs: number) {
    this.defaultTTLMs = defaultTTLMs;
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTLMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    this.evictExpired();
    return this.store.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

export interface CacheConfig {
  defaultTTLMs: number;
}

export function buildCacheKey(parts: Record<string, unknown>): string {
  const sorted = Object.keys(parts)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = parts[k];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}