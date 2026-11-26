import { describe, expect, it } from 'vitest';
import { movedEnough, readRoadAnswer, roadBatches } from './road.ts';

const id = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;

describe('roadBatches', () => {
  it('keeps 50 ids in one call and splits 51 into 50 and 1', () => {
    const fifty = Array.from({ length: 50 }, (_, i) => id(i + 1));
    expect(roadBatches(fifty)).toHaveLength(1);
    expect(roadBatches(fifty)[0]).toHaveLength(50);
    const batches = roadBatches([...fifty, id(51)]);
    expect(batches.map((b) => b.length)).toEqual([50, 1]);
  });

  it('drops duplicates and empties, so a card in two rails is asked once', () => {
    expect(roadBatches(['a', 'b', 'a', '', 'b'])).toEqual([['a', 'b']]);
    expect(roadBatches([])).toEqual([]);
  });

  it('refuses a batch size below one', () => {
    expect(() => roadBatches(['a'], 0)).toThrow(RangeError);
  });
});

describe('movedEnough', () => {
  const cairo = { lat: 30.0444, lng: 31.2357 };

  it('asks on the first fix and stays quiet under 100 m', () => {
    expect(movedEnough(null, cairo)).toBe(true);
    // ~55 m north: the same doorway, not a new measurement
    expect(movedEnough(cairo, { lat: cairo.lat + 0.0005, lng: cairo.lng })).toBe(false);
    // ~96 m east at this latitude: still under 100 m
    expect(movedEnough(cairo, { lat: cairo.lat, lng: cairo.lng + 0.001 })).toBe(false);
  });

  it('asks again past 100 m', () => {
    expect(movedEnough(cairo, { lat: cairo.lat + 0.001, lng: cairo.lng })).toBe(true);
    expect(movedEnough(cairo, { lat: cairo.lat, lng: cairo.lng + 0.002 })).toBe(true);
  });
});

describe('readRoadAnswer', () => {
  it('keeps well-formed entries and drops the rest', () => {
    expect(
      readRoadAnswer({
        a: { km: 1.2, min: 5 },
        b: { km: 3, min: 4.6 },
        c: { km: '2' },
        d: null,
        e: { km: -1, min: 2 },
      }),
    ).toEqual({ a: { km: 1.2, min: 5 }, b: { km: 3, min: 5 } });
  });

  it('answers an empty map for anything that is not an object', () => {
    expect(readRoadAnswer(null)).toEqual({});
    expect(readRoadAnswer('nope')).toEqual({});
    expect(readRoadAnswer(undefined)).toEqual({});
  });
});
