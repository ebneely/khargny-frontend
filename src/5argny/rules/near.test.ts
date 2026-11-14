import { describe, expect, it } from 'vitest';
import { kmText, coarse, pickNear, inEgypt } from './near.ts';

describe('near', () => {
  it('writes distances with one decimal under 10 km and whole km above, western digits', () => {
    expect(kmText(0.15)).toBe('0.2');
    expect(kmText(0.04)).toBe('0.1'); // never "0 km away"
    expect(kmText(2)).toBe('2.0');
    expect(kmText(9.94)).toBe('9.9');
    expect(kmText(9.96)).toBe('10');
    expect(kmText(12.4)).toBe('12');
    expect(kmText(376.2)).toBe('376');
  });
  it('keeps a position to 3 decimals (about 100 m)', () => {
    expect(coarse({ lat: 30.06149, lng: 31.21951 })).toEqual({ lat: 30.061, lng: 31.22 });
  });
  it('keeps only positions the API can rank from (inside Egypt)', () => {
    expect(inEgypt({ lat: 30.061, lng: 31.22 })).toBe(true);
    expect(inEgypt({ lat: 51.5, lng: -0.12 })).toBe(false);
    expect(inEgypt({ lat: 25.2, lng: 55.3 })).toBe(false); // Dubai
  });
  it('Surprise me draws from the nearest 20 and never repeats the last pick', () => {
    const list = Array.from({ length: 30 }, (_, i) => ({ id: String(i) }));
    for (let n = 0; n < 50; n++) {
      const p = pickNear(list, '0', Math.random)!;
      expect(Number(p.id)).toBeLessThan(20);
      expect(p.id).not.toBe('0');
    }
    expect(pickNear([{ id: 'a' }], 'a', Math.random)?.id).toBe('a'); // one place: it is the pick again
    expect(pickNear([], null, Math.random)).toBeNull();
  });
});
