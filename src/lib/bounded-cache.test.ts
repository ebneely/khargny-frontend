import { describe, expect, it } from 'vitest';
import { BoundedCache } from './bounded-cache';

describe('BoundedCache', () => {
  it('keeps at most max entries and evicts the least recently used', () => {
    const cache = new BoundedCache<string>(3, 60_000);
    cache.set('a', 'A');
    cache.set('b', 'B');
    cache.set('c', 'C');
    cache.get('a');
    cache.set('d', 'D');

    expect(cache.size).toBe(3);
    expect(cache.get('a')).toBe('A');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe('C');
    expect(cache.get('d')).toBe('D');
  });

  it('removes an entry after its TTL', () => {
    const cache = new BoundedCache<string>(3, 1_000);
    cache.set('a', 'A', 0);
    expect(cache.get('a', 999)).toBe('A');
    expect(cache.get('a', 1_000)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('bounds a missing cache too', () => {
    const missing = new BoundedCache<true>(1_000, 60_000);
    for (let i = 0; i < 1_001; i += 1) missing.set(`slug-${i}`, true);
    expect(missing.size).toBe(1_000);
    expect(missing.get('slug-0')).toBeUndefined();
    expect(missing.get('slug-1000')).toBe(true);
  });
});
