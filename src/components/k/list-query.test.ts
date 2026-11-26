import { describe, expect, it } from 'vitest';
import { catIdsOf, listQueryOf } from './list-query.ts';

// Categories as the API sends them, and the names an intent asks for (components/k/rules.ts owns the intent list).
const cats = [
  { id: 'c1', slug: 'hotels', nameEn: 'Hotels', nameAr: 'فنادق' },
  { id: 'c2', slug: 'resorts', nameEn: 'Resorts', nameAr: 'منتجعات' },
  { id: 'c3', slug: 'cafes', nameEn: 'Cafes', nameAr: 'كافيهات' },
] as never[];
const EAT = ['Cafes'] as const;
const f = (over: Partial<{ intent: string; cat: string; when: string; filters: Set<string> }> = {}) =>
  ({ intent: '', cat: '', when: '', filters: new Set<string>(), ...over });

describe('the /v1/places question a filter state asks', () => {
  it('names one category by its key, slug or id, an intent by its categories, and none by an unknown name', () => {
    expect(catIdsOf(f({ cat: 'Resorts' }), cats, EAT).map((c) => c.id)).toEqual(['c2']);
    expect(catIdsOf(f({ cat: 'resorts' }), cats, EAT).map((c) => c.id)).toEqual(['c2']);
    expect(catIdsOf(f({ cat: 'c2' }), cats, EAT).map((c) => c.id)).toEqual(['c2']);
    expect(catIdsOf(f({ cat: 'Nope' }), cats, EAT)).toEqual([]);
    expect(catIdsOf(f({ intent: 'eat' }), cats, EAT).map((c) => c.id)).toEqual(['c3']);
  });

  it('splits price bands from amenities and keeps the screen key in order', () => {
    const q = listQueryOf(f({ filters: new Set(['band:2', 'a9', 'band:3']) }), 'city1', null, cats);
    expect(q.params.priceRange).toBe('2,3');
    expect(q.params.amenityIds).toBe('a9');
    expect(q.key).toEqual(['', 'city1', '', '2,3', 'a9', '']);
  });

  it('waits for the categories and never asks for the whole of Egypt', () => {
    // an intent whose categories have not arrived yet: not ready, so neither the screen nor the prefetch asks
    expect(listQueryOf(f({ intent: 'eat' }), null, null, [], EAT).ready).toBe(false);
    // categories arrived, the name matches none: a real empty answer, not a national list
    expect(listQueryOf(f({ cat: 'Nope' }), null, null, cats, EAT).none).toBe(true);
    // no filter at all: one request, Egypt-wide
    const all = listQueryOf(f(), null, null, cats, EAT);
    expect(all.ready).toBe(true);
    expect(all.none).toBe(false);
    expect(all.catIds).toEqual([null]);
  });

  it('the area and the When change the key, so a prefetch cannot answer another screen', () => {
    const a = listQueryOf(f({ when: 'now' }), 'city1', 'Zamalek', cats);
    expect(a.key).toEqual(['', 'city1', 'Zamalek', '', '', 'now']);
    expect(listQueryOf(f({ when: 'now' }), 'city1', null, cats).key).not.toEqual(a.key);
  });
});
