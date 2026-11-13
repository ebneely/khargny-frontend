import { describe, expect, it } from 'vitest';
import { adScore, blend, diversify, organicScore, type BlendContext, type BlendPlace } from './blend.ts';

const place = (id: string, cat: string, o: Partial<BlendPlace> = {}): BlendPlace => ({
  id, cat, city: 'Cairo', area: 'Zamalek', promoted: false, views30: 50, likes30: 1, go30: 1, photos: 5, hasHours: true, amenities: 1, badges: 0, freshness: 0.5, ...o,
});
const ctx = (o: Partial<BlendContext> = {}): BlendContext => ({ affinity: {}, city: null, area: null, seen: new Set(), shownToday: {}, ...o });
const organic = Array.from({ length: 20 }, (_, i) => place(`o${i}`, 'ABCD'[i % 4]!, { views30: 100 - i * 2 }));
const ad = (id: string, cat: string, o: Partial<BlendPlace> = {}) => place(id, cat, { promoted: true, views30: 100, ...o });
const ads = [ad('ad1', 'E'), ad('ad2', 'F'), ad('ad3', 'G')];
const adSlots = (list: { ad: boolean }[]) => list.flatMap((x, i) => (x.ad ? [i] : []));

describe('scores', () => {
  const bare = { views30: 0, photos: 0, hasHours: false, amenities: 0, badges: 0, freshness: 0 };
  it('organic weights: interest 40, popularity 25, quality 20, freshness 15', () => {
    expect(organicScore(place('a', 'A', { ...bare }), ctx({ affinity: { A: 1 } }), 100)).toBeCloseTo(0.4);
    expect(organicScore(place('a', 'A', { ...bare, views30: 100 }), ctx(), 100)).toBeCloseTo(0.25);
    expect(organicScore(place('a', 'A', { ...bare, photos: 5, hasHours: true, amenities: 1, badges: 1 }), ctx(), 100)).toBeCloseTo(0.2);
    expect(organicScore(place('a', 'A', { ...bare, freshness: 1 }), ctx(), 100)).toBeCloseTo(0.15);
  });
  it('times location fit: 1 in the area, 0.4 elsewhere in the city, 0.15 in another city', () => {
    const p = place('a', 'A', { ...bare, freshness: 1 });
    expect(organicScore(p, ctx({ city: 'Cairo', area: 'Zamalek' }), 100)).toBeCloseTo(0.15);
    expect(organicScore(p, ctx({ city: 'Cairo', area: 'Maadi' }), 100)).toBeCloseTo(0.06);
    expect(organicScore(p, ctx({ city: 'Giza', area: null }), 100)).toBeCloseTo(0.0225);
  });
  it('ad score: tap rate x relevance x quality', () =>
    expect(adScore(place('a', 'A', { likes30: 2, go30: 3, views30: 30, badges: 1 }), ctx())).toBeCloseTo(0.1 * 1.5 * 1.5));
});

describe('diversify', () => {
  it('never two of the same category in a row while another is left', () =>
    expect(diversify([{ cat: 'A', id: 1 }, { cat: 'A', id: 2 }, { cat: 'B', id: 3 }]).map((x) => x.id)).toEqual([1, 3, 2]));
});

describe('blend', () => {
  it('social: not in the first 2, 4 posts apart, at most 2 per 10', () => expect(adSlots(blend('social', [...organic, ...ads], 14, ctx()))).toEqual([2, 7, 12]));
  it('stories: never first, 3 apart, at most 2 per 8', () => expect(adSlots(blend('stories', [...organic, ...ads], 12, ctx()))).toEqual([1, 5, 9]));
  it('an ad never sits next to the same category', () => {
    const allA = organic.map((p) => ({ ...p, cat: 'A' }));
    expect(adSlots(blend('social', [...allA, ad('x', 'A')], 14, ctx()))).toEqual([]);
    expect(adSlots(blend('social', [...allA, ad('x', 'B')], 14, ctx()))).toEqual([2]);
  });
  it('relevance floor: an ad less than 80% as relevant as the post it pushes down stays out', () => {
    const weak = ad('weak', 'E', { views30: 0, photos: 0, hasHours: false, amenities: 0, freshness: 0 });
    expect(adSlots(blend('social', [...organic, weak], 14, ctx()))).toEqual([]);
  });
  it('frequency cap: 3 shows per person per day', () => {
    expect(blend('social', [...organic, ads[0]!], 14, ctx({ shownToday: { ad1: 3 } })).some((x) => x.ad)).toBe(false);
    expect(blend('social', [...organic, ads[0]!], 14, ctx({ shownToday: { ad1: 2 } })).some((x) => x.ad)).toBe(true);
  });
  it('an ad seen this session or outside the location is not eligible', () => {
    expect(blend('social', [...organic, ads[0]!], 14, ctx({ seen: new Set(['ad1']) })).some((x) => x.ad)).toBe(false);
    // every place is in Cairo: another city (fit 0.15) keeps ads out, another area of the city (0.4) lets them in
    expect(blend('social', [...organic, ads[0]!], 14, ctx({ city: 'Giza' })).some((x) => x.ad)).toBe(false);
    expect(blend('social', [...organic, ads[0]!], 14, ctx({ city: 'Cairo', area: 'Maadi' })).some((x) => x.ad)).toBe(true);
  });
  it('organic items keep their score order (after diversity)', () =>
    expect(blend('social', organic, 4, ctx()).map((x) => x.p.id)).toEqual(['o0', 'o1', 'o2', 'o3']));
});
