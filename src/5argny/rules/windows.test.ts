import { describe, expect, it } from 'vitest';
import { shownCount, short, windowSum, windowTrend, type Bucket } from './windows.ts';

const H = 3_600_000, now = Date.UTC(2026, 10, 15, 12);
const hourly = (hoursAgo: number, n: number): Bucket => ({ at: now - hoursAgo * H, n });

describe('rolling windows', () => {
  const buckets = [hourly(1, 5), hourly(23, 2), hourly(25, 7), hourly(24 * 6, 3), hourly(24 * 8, 11), hourly(24 * 29, 4), hourly(24 * 31, 100)];
  it('each window ends now and reaches back exactly its length', () => {
    expect(windowSum(buckets, '24h', now)).toBe(7);
    expect(windowSum(buckets, '7d', now)).toBe(17);
    expect(windowSum(buckets, '30d', now)).toBe(32);
  });
  it('live is the last 5 minutes', () => {
    const live = [{ at: now - 4 * 60_000, n: 2 }, { at: now - 6 * 60_000, n: 9 }];
    expect(windowSum(live, 'live', now)).toBe(2);
  });
  it('a bucket from the future or exactly now is not counted yet', () => expect(windowSum([{ at: now, n: 9 }], '24h', now)).toBe(0));
  it('growth compares with the window just before', () => {
    expect(windowTrend([hourly(2, 30), hourly(26, 20)], '24h', now)).toEqual({ n: 30, g: 0.5 });
    expect(windowTrend([hourly(2, 30)], '24h', now)).toEqual({ n: 30, g: 0 });
  });
});

describe('what customers see', () => {
  const counts = { d30: { view: 10, like: 2, save: 3, share: 4, go: 5 }, all: { view: 100, like: 20, save: 30, share: 40, go: 50 } };
  it('loves and 5argny! taps are totals, the rest are the last 30 days', () => {
    expect(shownCount('like', counts)).toBe(20);
    expect(shownCount('go', counts)).toBe(50);
    expect(shownCount('view', counts)).toBe(10);
    expect(shownCount('save', counts)).toBe(3);
    expect(shownCount('share', counts)).toBe(4);
  });
  it('short counts', () => {
    expect(short(999)).toBe('999');
    expect(short(1000)).toBe('1k');
    expect(short(1250)).toBe('1.3k');
  });
});
