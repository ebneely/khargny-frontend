import { pathIn } from '@5argny/core/rules/locale';
import { LOCALES } from '@/i18n/dictionaries';
import type { SeoCategory, SeoCity, SeoPlace } from '@/lib/seo-content';

/**
 * /llms.txt, as a pure builder over the live public catalogue.
 *
 * The shape is the llmstxt.org convention the assistants read: an H1 with every spelling of the
 * brand, a blockquote summary, then H2 sections of plain facts and links. Addresses come from the
 * same URL builder as the sitemap, so an assistant is never handed an address Google is not.
 *
 * There is deliberately no /llms-full.txt: a file listing every place page is a ready-made copy of
 * the catalogue for any bot, which is exactly what the site's data protection refuses
 * (DATA-PROTECTION.md, queued item 5). The short summary is what an AI search needs.
 */

const BRAND = '5argny / خرجني / Khargny';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** A description as one line of plain text: no tags, no entities, no repeated spaces. */
export function plainText(value?: string | null): string {
  return (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
      if (code[0] === '#') {
        const point = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(point) ? String.fromCodePoint(point) : whole;
      }
      return ENTITIES[code.toLowerCase()] ?? whole;
    })
    .replace(/\s+/g, ' ')
    .replace(/ ([.,;:!?])/g, '$1')
    .trim();
}

const placeCount = (count: number) => `${count} ${count === 1 ? 'place' : 'places'}`;

export interface LlmsCity {
  slug: string;
  name: string;
  nameEn?: string | null;
  places: number;
}

export interface LlmsCategory {
  nameAr: string;
  nameEn?: string | null;
  places: number;
}

export interface LlmsInput {
  siteUrl: string;
  cities: LlmsCity[];
  categories: LlmsCategory[];
}

/** The live catalogue, shaped for the builder: counts computed from the same public place list. */
export function llmsInputFromContent({
  siteUrl,
  cities,
  categories,
  places,
}: {
  siteUrl: string;
  cities: SeoCity[];
  categories: SeoCategory[];
  places: SeoPlace[];
}): LlmsInput {
  const cityCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const place of places) {
    cityCounts.set(place.cityId, (cityCounts.get(place.cityId) ?? 0) + 1);
    if (place.categoryId) categoryCounts.set(place.categoryId, (categoryCounts.get(place.categoryId) ?? 0) + 1);
  }
  return {
    siteUrl,
    cities: cities
      .map((city) => ({ slug: city.slug ?? '', name: city.name ?? '', nameEn: city.nameEn, places: cityCounts.get(city.id) ?? 0 }))
      .filter((city) => city.slug && city.name),
    categories: categories
      .map((category) => ({
        nameAr: category.nameAr ?? category.nameEn ?? category.slug,
        nameEn: category.nameEn,
        places: categoryCounts.get(category.id) ?? 0,
      }))
      .filter((category) => category.places > 0),
  };
}

export function buildLlmsTxt(input: LlmsInput): string {
  const { siteUrl, cities, categories } = input;
  const totalPlaces = cities.reduce((sum, city) => sum + city.places, 0);
  const cityCount = cities.filter((city) => city.places > 0).length;
  const out: string[] = [
    `# ${BRAND}`,
    '',
    '> 5argny (خرجني, also written Khargny) is an Egyptian guide to places to go out: cafés, restaurants, beaches, hotels, museums, entertainment and more, with the address, opening hours, photos and directions for each place, in Arabic and English.',
    '',
    `Website: ${siteUrl}`,
    'Languages: English at plain URLs, Arabic under /ar/ URLs.',
    `Places: ${totalPlaces} in ${cityCount} ${cityCount === 1 ? 'city' : 'cities'}. All place pages are public.`,
    '',
    '## What this site is',
    '',
    `5argny lists ${totalPlaces} real places to go out in Egypt, one page each in both languages. Every place page carries its name in Arabic and English, what it is (category), its area and city, address, phone, opening hours, price band and photos. Searches can be filtered by city, area, category, price, amenities and opening time. This file is generated from the same public place data the pages are built from.`,
    '',
    '## Cities',
    '',
    ...(cities.some((city) => city.places > 0)
      ? cities.filter((city) => city.places > 0).map((city) => `- ${city.nameEn || city.name} (${city.name}) — ${placeCount(city.places)}`)
      : ['- No cities are listed right now.']),
    '',
    '## Categories',
    '',
    ...(categories.length
      ? categories.map((category) => `- ${category.nameEn || category.nameAr} (${category.nameAr}) — ${placeCount(category.places)}`)
      : ['- No categories are listed right now.']),
    '',
    '## Main pages',
    '',
    `- [Home](${siteUrl}${pathIn('/', 'en')}): the front door, in English and Arabic`,
    `- [Explore](${siteUrl}${pathIn('/explorer', 'en')}): browse every place, filter by city and category`,
    `- [Trips](${siteUrl}${pathIn('/trips', 'en')}): trips and experiences on the site`,
    `- [Marketplace](${siteUrl}${pathIn('/marketplace', 'en')}): the marketplace`,
    `- [Contact](${siteUrl}${pathIn('/contact', 'en')}): how to reach 5argny`,
    `- [Privacy](${siteUrl}${pathIn('/privacy', 'en')}): the privacy policy`,
    '',
  ];

  out.push(
    '## Optional',
    '',
    `- [Sitemap](${siteUrl}/sitemap.xml): the sitemap index`,
    '',
  );

  return out.join('\n');
}

export const LLMS_SITE_LANGUAGES = LOCALES;
