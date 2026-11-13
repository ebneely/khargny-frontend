import { describe, expect, it } from 'vitest';
import { hypeLine, hypeSay, momentum, trendingTop } from './trending.ts';

describe('trending momentum', () => {
  it('views x (1 + growth), shrinking never counts against', () => {
    expect(momentum({ n: 100, g: 0.5 })).toBe(150);
    expect(momentum({ n: 100, g: -0.5 })).toBe(100);
  });
  it('a fast riser beats a bigger steady place', () => {
    const top = trendingTop([{ id: 'big', city: 'Cairo', n: 100, g: 0 }, { id: 'rise', city: 'Cairo', n: 80, g: 0.5 }, { id: 'x', city: 'Cairo', n: 1, g: 0 }], 'Cairo', null);
    expect(top.map((p) => p.id)).toEqual(['rise', 'big', 'x']);
  });
  it('fewer than 3 in the area widens to the city, then to all of Egypt', () => {
    const all = [
      { id: 'z1', city: 'Cairo', area: 'Zamalek', n: 1, g: 0 }, { id: 'z2', city: 'Cairo', area: 'Zamalek', n: 2, g: 0 },
      { id: 'm1', city: 'Cairo', area: 'Maadi', n: 3, g: 0 }, { id: 'a1', city: 'Aswan', area: 'Nile', n: 9, g: 0 },
    ];
    expect(trendingTop(all, 'Cairo', 'Zamalek').map((p) => p.id)).toEqual(['m1', 'z2', 'z1']);
    expect(trendingTop(all, 'Aswan', null).map((p) => p.id)).toEqual(['a1', 'm1', 'z2', 'z1']);
  });
  it('top 5 only', () => expect(trendingTop(Array.from({ length: 9 }, (_, i) => ({ city: 'C', n: i, g: 0 })), null, null)).toHaveLength(5));
});

// control points of the cubic path, grouped per segment: [start y, c1 y, c2 y, end y]
const segments = (d: string) => {
  const nums = d.replace(/[MC]/g, ' ').trim().split(/[\s,]+/).map(Number);
  const out: number[][] = [];
  for (let i = 2; i + 5 < nums.length; i += 6) out.push([nums[i - 1]!, nums[i + 1]!, nums[i + 3]!, nums[i + 5]!]);
  return out;
};

describe('hypeLine', () => {
  const days = [5, 5, 30, 31, 5, 2, 2, 40, 8, 9, 9, 9, 3, 30, 1, 1, 1, 22, 23, 24, 2, 7, 7, 7, 7, 12, 3, 3, 9, 20];
  it('one move and one curve per day after the first', () => {
    const { d } = hypeLine(days);
    expect(d.startsWith('M')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(days.length - 1);
  });
  it('monotone: no curve overshoots the two days it joins', () => {
    const segs = segments(hypeLine(days).d);
    expect(segs).toHaveLength(days.length - 1);
    for (const [y0, c1, c2, y1] of segs) {
      const lo = Math.min(y0!, y1!) - 0.06, hi = Math.max(y0!, y1!) + 0.06; // path is rounded to 0.1
      expect(c1).toBeGreaterThanOrEqual(lo); expect(c1).toBeLessThanOrEqual(hi);
      expect(c2).toBeGreaterThanOrEqual(lo); expect(c2).toBeLessThanOrEqual(hi);
    }
  });
  it('the busiest day: a tie goes to the most recent', () => expect(hypeLine([1, 9, 3, 9, 2]).peak).toBe(3));
  it('this week against the week before', () => {
    const g = hypeLine([...Array(7).fill(10), ...Array(7).fill(15)]).growth;
    expect(g).toBeCloseTo(0.5);
    expect(hypeSay(g)).toEqual({ kind: 'busier', pct: 50 });
    expect(hypeSay(-0.25)).toEqual({ kind: 'quieter', pct: 25 });
    expect(hypeSay(0.02)).toEqual({ kind: 'steady', pct: 0 });
  });
});
