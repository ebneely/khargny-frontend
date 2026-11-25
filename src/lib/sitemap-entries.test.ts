import { describe, expect, it } from 'vitest';
import { chunkPlaces, imageEntries, lastModified, newestUpdate, placeEntries, sitemapFileCount, sitemapIndexFor, staticEntries } from './sitemap-entries';
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

describe('numbered place sitemaps', () => {
  const places = (n: number) => Array.from({ length: n }, (_, i) => ({ slug: `p${i}`, cityId: 'cairo', updatedAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z` }));

  it('needs one file for a catalogue of 20,000 places or fewer, and two from 20,001', () => {
    expect(sitemapFileCount(0)).toBe(1);
    expect(sitemapFileCount(1)).toBe(1);
    expect(sitemapFileCount(20_000)).toBe(1);
    expect(sitemapFileCount(20_001)).toBe(2);
    expect(sitemapFileCount(40_000)).toBe(2);
    expect(sitemapFileCount(40_001)).toBe(3);
  });

  it('gives every place exactly one file, with no overlap between neighbours', () => {
    const all = places(20_001);
    const first = chunkPlaces(all, 0);
    const second = chunkPlaces(all, 1);
    expect(first).toHaveLength(20_000);
    expect(second).toHaveLength(1);
    expect(first[0].slug).toBe('p0');
    expect(first[19_999].slug).toBe('p19999');
    expect(second[0].slug).toBe('p20000');
    // 20,001 places × 2 languages = 40,002 URLs, under Google's 50,000-URL limit across two files.
    expect(placeEntries(CITIES, first).length + placeEntries(CITIES, second).length).toBe(40_002);
  });

  it('handles an empty catalogue and a file past the end without inventing entries', () => {
    expect(chunkPlaces([], 0)).toEqual([]);
    expect(chunkPlaces(places(1), 5)).toEqual([]);
    expect(placeEntries(CITIES, chunkPlaces([], 0))).toEqual([]);
  });

  it('takes the file lastmod from the newest update inside it', () => {
    const chunk = [{ updatedAt: '2026-01-02T00:00:00.000Z' }, { updatedAt: '2026-03-04T00:00:00.000Z' }, {}];
    expect(newestUpdate(chunk)?.toISOString()).toBe('2026-03-04T00:00:00.000Z');
    expect(newestUpdate([{ updatedAt: 'not a date' }])).toBeUndefined();
    expect(newestUpdate([])).toBeUndefined();
  });

  it('lists static first, then every place file, then every image file', () => {
    const dates = [new Date('2026-01-02T00:00:00.000Z'), new Date('2026-02-03T00:00:00.000Z')];
    const index = sitemapIndexFor('https://example.test', 2, dates);
    expect(index.map((entry) => entry.loc)).toEqual([
      'https://example.test/sitemaps/static.xml',
      'https://example.test/sitemaps/places-1.xml',
      'https://example.test/sitemaps/places-2.xml',
      'https://example.test/sitemaps/images-1.xml',
      'https://example.test/sitemaps/images-2.xml',
    ]);
    expect(index[1].lastModified?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(index[2].lastModified?.toISOString()).toBe('2026-02-03T00:00:00.000Z');
    // A one-file catalogue (and an empty one) still lists a places-1 and an images-1.
    expect(sitemapIndexFor('https://example.test', 0).map((entry) => entry.loc)).toEqual([
      'https://example.test/sitemaps/static.xml',
      'https://example.test/sitemaps/places-1.xml',
      'https://example.test/sitemaps/images-1.xml',
    ]);
  });
});
