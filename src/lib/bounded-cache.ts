/**
 * A small least-recently-used cache with a TTL per entry. The proxy uses it for place address
 * lookups: a bot asking for random slugs must not be able to grow the process's memory.
 */
export class BoundedCache<T> {
  private readonly entries = new Map<string, { value: T; at: number }>();

  constructor(
    private readonly max: number,
    private readonly ttlMs: number,
  ) {
    if (max < 1) throw new Error('BoundedCache max must be at least 1');
    if (ttlMs < 0) throw new Error('BoundedCache ttl must not be negative');
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (now - entry.at >= this.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }
    // Reading makes it the most recently used.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, { value, at: now });
    while (this.entries.size > this.max) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}
