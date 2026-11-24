import { describe, expect, it } from 'vitest';
import { imageEntries, lastModified, placeEntries, staticEntries } from './sitemap-entries';
import type { SeoCity, SeoPlace } from './seo-content';

const CITIES: SeoCity[] = [
  { id: 'cairo', slug: 'cairo', name: 'القاهرة', nameEn: 'Cairo' },
  { id: 'giza', slug: 'giza', name: 'الجيزة', nameEn: 'Giza' },
];

const PLACE: SeoPlace = {
  slug: 'zooba',
  cityId: 'cairo',
  name: 'زوبا',
  nameEn: 'Zooba',
  updatedAt: '2026-01-02T03:04:05.000Z',
  coverImage: 'https://cdn.example/place_small.webp',
  gallery: { images: [{ url: 'https://cdn.example/one_small.webp' }, { url: 'https://cdn.example/two_small.webp' }] },
};

describe('lastModified', () => {
  it('uses the place date as given', () => {
    expect(lastModified('2026-01-02T03:04:05.000Z')?.toISOString()).toBe('2026-01-02T03:04:05.000Z');
  });

  it('omits an invalid or missing date instead of stamping now', () => {
    expect(lastModified(undefined)).toBeUndefined();
    expect(lastModified('')).toBeUndefined();
    expect(lastModified('not a date')).toBeUndefined();
  });
});

describe('place sitemap entries', () => {
  const entries = placeEntries(CITIES, [PLACE]);

  it('lists the English and Arabic address with the served trailing slash', () => {
    expect(entries.map((entry) => entry.url)).toEqual([
      'https://www.5argny.com/explorer/cairo/zooba/',
      'https://www.5argny.com/ar/explorer/cairo/zooba/',
    ]);
  });

  it('sets lastmod from the place updatedAt only', () => {
    expect(new Date(entries[0].lastModified as Date).toISOString()).toBe('2026-01-02T03:04:05.000Z');
  });

  it('publishes no date for a place the API gives no updatedAt', () => {
    const undated = placeEntries(CITIES, [{ ...PLACE, updatedAt: undefined }]);
    expect(undated).toHaveLength(2);
    expect(undated.every((entry) => entry.lastModified === undefined)).toBe(true);
  });

  it('skips a place whose city is not in the public city list', () => {
    expect(placeEntries(CITIES, [{ ...PLACE, cityId: 'unknown' }])).toHaveLength(0);
  });

  it('hreflang points at both languages plus x-default', () => {
    expect(entries[0].alternates?.languages).toEqual({
      en: 'https://www.5argny.com/explorer/cairo/zooba/',
      ar: 'https://www.5argny.com/ar/explorer/cairo/zooba/',
      'x-default': 'https://www.5argny.com/explorer/cairo/zooba/',
    });
  });
});

describe('static sitemap entries', () => {
  const date = new Date('2026-01-01T00:00:00.000Z');
  const entries = staticEntries(date, [{ id: 'trip-1', updatedAt: '2026-02-03T04:05:06.000Z' }]);

  it('lists the home page in both languages with the build date', () => {
    expect(entries.some((entry) => entry.url === 'https://www.5argny.com/')).toBe(true);
    expect(entries.some((entry) => entry.url === 'https://www.5argny.com/ar/')).toBe(true);
    expect(entries[0].lastModified).toEqual(date);
  });

  it('lists a trip with its own updatedAt', () => {
    const trip = entries.find((entry) => entry.url.includes('/trips/trip-1/'));
    expect(new Date(trip?.lastModified as Date).toISOString()).toBe('2026-02-03T04:05:06.000Z');
  });
});

describe('image sitemap entries', () => {
  const entries = imageEntries(CITIES, [PLACE]);

  it('lists one entry per language with the place photos at the large rendition', () => {
    expect(entries).toHaveLength(2);
    expect(entries[0].images.map((image) => image.loc)).toEqual([
      'https://cdn.example/place_large.webp',
      'https://cdn.example/one_large.webp',
      'https://cdn.example/two_large.webp',
    ]);
  });

  it('titles each photo in the page language', () => {
    expect(entries.find((entry) => entry.url.includes('/ar/'))?.images[0].title).toBe('زوبا');
    expect(entries.find((entry) => !entry.url.includes('/ar/'))?.images[0].title).toBe('Zooba');
  });
});
