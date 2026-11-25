import { describe, expect, it } from 'vitest';
import {
  areaKeyOf,
  introWordCount,
  landingFaq,
  landingIntro,
  landingPath,
  landingTitle,
  type LandingFacts,
  type LandingType,
} from './landing';

const city = { name: 'القاهرة', nameEn: 'Cairo', slug: 'cairo' };
const area = { name: 'الزمالك', nameEn: 'Zamalek', slug: 'zamalek' };
const category = { name: 'كافيهات', nameEn: 'Cafés', slug: 'cafes' };

const topAreas = [
  { areaKey: 'zamalek', nameAr: 'الزمالك', nameEn: 'Zamalek', count: 12 },
  { areaKey: 'maadi', nameAr: 'المعادي', nameEn: 'Maadi', count: 7 },
];
const topCategories = [
  { slug: 'cafes', nameAr: 'كافيهات', nameEn: 'Cafés', count: 12 },
  { slug: 'restaurants', nameAr: 'مطاعم', nameEn: 'Restaurants', count: 9 },
];

function facts(type: LandingType, extra: Partial<LandingFacts> = {}): LandingFacts {
  return {
    type,
    city: type === 'category' ? null : city,
    area: type === 'area' || type === 'area-category' ? area : null,
    category: type.includes('category') || type === 'category' ? category : null,
    count: 12,
    openNow: 4,
    updatedAt: '2026-11-24T10:00:00.000Z',
    topCategories,
    topAreas: type === 'area' || type === 'area-category' ? [] : topAreas,
    ...extra,
  };
}

describe('area keys', () => {
  it('should slug catalogue names the way the backend does', () => {
    expect(areaKeyOf('Zamalek')).toBe('zamalek');
    expect(areaKeyOf('Fifth Settlement')).toBe('fifth-settlement');
    expect(areaKeyOf('  New  Cairo ')).toBe('new-cairo');
  });
});

describe('URL scheme', () => {
  it('should keep areas behind an explicit segment so they cannot be read as place slugs', () => {
    expect(landingPath('city', { citySlug: 'cairo' })).toBe('/explorer/cairo');
    expect(landingPath('area', { citySlug: 'cairo', areaKey: 'zamalek' })).toBe('/explorer/cairo/area/zamalek');
    expect(landingPath('category', { categorySlug: 'cafes' })).toBe('/category/cafes');
    expect(landingPath('city-category', { citySlug: 'cairo', categorySlug: 'cafes' })).toBe('/explorer/cairo/category/cafes');
    expect(
      landingPath('area-category', { citySlug: 'cairo', areaKey: 'zamalek', categorySlug: 'cafes' }),
    ).toBe('/explorer/cairo/area/zamalek/category/cafes');
  });
});

describe('headings', () => {
  it('should name an area+category page the way someone searches for it', () => {
    expect(landingTitle(facts('area-category'), 'en')).toBe('Cafés in Zamalek');
    expect(landingTitle(facts('area-category'), 'ar')).toBe('كافيهات في الزمالك');
    expect(landingTitle(facts('city-category'), 'en')).toBe('Cafés in Cairo');
    expect(landingTitle(facts('category'), 'ar')).toBe('كافيهات في مصر');
    expect(landingTitle(facts('city'), 'en')).toBe('Places in Cairo');
  });
});

describe('intro', () => {
  for (const type of ['city', 'area', 'category', 'city-category', 'area-category'] as LandingType[]) {
    for (const locale of ['en', 'ar'] as const) {
      it(`should write 80-150 words of real numbers for a ${type} page (${locale})`, () => {
        const words = introWordCount(landingIntro(facts(type), locale));
        expect(words).toBeGreaterThanOrEqual(80);
        expect(words).toBeLessThanOrEqual(150);
      });
    }
  }

  it('should carry the page numbers, not filler', () => {
    const text = landingIntro(facts('city-category'), 'en');
    expect(text).toContain('12');
    expect(text).toContain('4');
    expect(text).toContain('Cairo');
  });

  it('should not read the same for two different areas', () => {
    const a = landingIntro(facts('area'), 'en');
    const b = landingIntro(facts('area', { area: { name: 'المعادي', nameEn: 'Maadi', slug: 'maadi' } }), 'en');
    expect(a).not.toBe(b);
  });
});

describe('FAQ', () => {
  it('should answer how many and how many are open', () => {
    const faq = landingFaq(facts('city'), 'en');
    expect(faq.length).toBeGreaterThanOrEqual(3);
    expect(faq.length).toBeLessThanOrEqual(4);
    expect(faq[0].answer).toContain('12');
    expect(faq[1].answer).toContain('4');
  });
});
