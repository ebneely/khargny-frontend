import { describe, expect, it } from 'vitest';
import { kmText, coarse, pickNear, inEgypt, geoCell, haversineKm, isApproxFix } from './near.ts';

describe('haversineKm', () => {
  // The numbers are written out (not taken from the code), so a changed formula fails.
  it('measures the straight line between known pairs', () => {
    // Tahrir Square to the Great Pyramid: 12.2 km straight; Google gives 14-16 km by road
    expect(haversineKm({ lat: 30.0444, lng: 31.2357 }, { lat: 29.9792, lng: 31.1342 })).toBeCloseTo(12.2, 1);
    // Tahrir Square to Alexandria: 180.0 km straight (about 220 km by road)
    expect(haversineKm({ lat: 30.0444, lng: 31.2357 }, { lat: 31.2001, lng: 29.9187 })).toBeCloseTo(180, 1);
    // one degree of longitude on the equator is 111.2 km, and 96.3 km on the 30th parallel
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.2, 1);
    expect(haversineKm({ lat: 30, lng: 0 }, { lat: 30, lng: 1 })).toBeCloseTo(96.3, 1);
  });
  it('is zero at one point and the same either way round', () => {
    expect(haversineKm({ lat: 30.061, lng: 31.22 }, { lat: 30.061, lng: 31.22 })).toBe(0);
    const a = { lat: 24.0889, lng: 32.8998 }, b = { lat: 31.2001, lng: 29.9187 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });
});

describe('isApproxFix', () => {
  it('calls a fix worse than 1 km approximate, and nothing else', () => {
    expect(isApproxFix(20)).toBe(false);
    expect(isApproxFix(1000)).toBe(false);
    expect(isApproxFix(1001)).toBe(true);
    expect(isApproxFix(5000)).toBe(true);
    expect(isApproxFix(null)).toBe(false); // no answer from the browser: no figure either way, not a warning
    expect(isApproxFix(undefined)).toBe(false);
  });
});

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
