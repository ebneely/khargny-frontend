import { describe, expect, it } from 'vitest';
import { kmText, coarse, pickNear, inEgypt, geoCell } from './near.ts';

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
  it('analytics gets the position rounded to 2 decimals (~1 km cell), never finer', () => {
    expect(geoCell({ lat: 30.06264, lng: 31.21971 })).toEqual({ lat: 30.06, lng: 31.22 });
    expect(geoCell({ lat: 30.065, lng: -0.125 })).toEqual({ lat: 30.07, lng: -0.12 });
  });
  it('the Egypt box keeps its edges (lat 22-32, lng 24-37) and nothing past them', () => {
    expect(inEgypt({ lat: 22, lng: 24 })).toBe(true);
    expect(inEgypt({ lat: 32, lng: 37 })).toBe(true);
    expect(inEgypt({ lat: 21.99, lng: 30 })).toBe(false);
    expect(inEgypt({ lat: 30, lng: 37.01 })).toBe(false);
  });
  it('Surprise me draws from the nearest 20 and skips the last 5 picks', () => {
    const list = Array.from({ length: 30 }, (_, i) => ({ id: String(i) }));
    const recent = ['9', '0', '1', '2', '3', '4']; // the oldest ('9') may come back, the last 5 never
    for (let n = 0; n < 200; n++) {
      const p = pickNear(list, recent, Math.random)!;
      expect(Number(p.id)).toBeLessThan(20);
      expect(['0', '1', '2', '3', '4']).not.toContain(p.id);
    }
    const few = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    for (let n = 0; n < 50; n++) expect(pickNear(few, ['c', 'a', 'b'], Math.random)?.id).not.toBe('b'); // all seen: anything but the last
    expect(pickNear([{ id: 'a' }], ['a'], Math.random)?.id).toBe('a'); // one place: it is the pick again
    expect(pickNear([], [], Math.random)).toBeNull();
  });
});
