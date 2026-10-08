import type { MetadataRoute } from "next";
import { API_BASE_URL } from "@/lib/config";
import { alternatesFor, urlFor } from '@/lib/seo';
import { isPreviewDeployment } from '@/lib/seo-environment';
import { LOCALES } from '@/i18n/dictionaries';

type PublicRecord = { slug: string; updatedAt?: string; status?: string; deletedAt?: string | null };
type City = PublicRecord & { id: string };
type Place = PublicRecord & { cityId: string };

const buildDate = process.env.SEO_BUILD_DATE;

function lastModified(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function isPublic(record: PublicRecord): boolean {
  return (!record.status || record.status === 'active') && !record.deletedAt;
}

async function getJson<T>(path: string): Promise<T[]> {
  if (!API_BASE_URL) throw new Error('Sitemap API origin is not configured');
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sitemap upstream failed (${res.status})`);
  const json = await res.json();
  if (json?.success === false) throw new Error('Sitemap upstream reported failure');
  const data = json?.data;
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.data)) return data.data as T[];
  throw new Error('Sitemap upstream returned an invalid list');
}

/**
 * Every page of a list, not just the first.
 *
 * This used to ask for `limit=100` once per city and stop. Cairo has 147 places, so 47 of
 * them were absent from the sitemap entirely — pages that exist, are linked, and were never
 * offered to a crawler. The API caps a page at 100, so more than one request is the only way.
 */
async function getAll<T extends PublicRecord>(pathBase: string): Promise<T[]> {
  const out: T[] = [];
  const seen = new Set<string>();
  const size = 100;
  for (let skip = 0; ; skip += size) {
    const sep = pathBase.includes("?") ? "&" : "?";
    const page = await getJson<T>(`${pathBase}${sep}skip=${skip}&limit=${size}`);
    let added = 0;
    for (const record of page) {
      if (!record?.slug) throw new Error('Sitemap upstream record has no slug');
      if (seen.has(record.slug)) continue;
      seen.add(record.slug);
      out.push(record);
      added += 1;
    }
    if (page.length < size) break;
    if (!added) throw new Error('Sitemap upstream pagination did not advance');
  }
  return out;
}

/**
 * Every page now lives under a locale segment (/ar/... and /en/...). A bare URL only
 * redirects, so the sitemap must list the real ones — both languages, cross-linked with
 * hreflang so search engines treat them as translations rather than duplicates.
 */

/**
 * next.config sets `trailingSlash: true`, so `/en/explorer/cairo` 308-redirects to
 * `/en/explorer/cairo/`. Listing the un-slashed form made every single sitemap entry cost a
 * redirect hop, which crawlers discount and which wasted the crawl budget of a 900-URL map.
 */
function localized(
  path: string,
  rest: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
): MetadataRoute.Sitemap {
  const languages = alternatesFor(path, 'ar')!.languages as Record<string, string>;

  return LOCALES.map((l) => ({
    url: urlFor(path, l),
    ...rest,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isPreviewDeployment()) return [];
  const staticDate = lastModified(buildDate);
  if (!staticDate) throw new Error('Sitemap build date is not configured');
  const staticPages: MetadataRoute.Sitemap = [
    ...localized("", { lastModified: staticDate, changeFrequency: "daily", priority: 1 }),
    // /plan is deliberately absent: it is one guest's saved list, not a page anyone should
    // reach from a search result. robots.txt disallows it too.
    ...localized("/explorer", { lastModified: staticDate, changeFrequency: "daily", priority: 0.9 }),
    ...localized("/contact", { lastModified: staticDate, changeFrequency: "monthly", priority: 0.3 }),
    ...localized("/privacy", { lastModified: staticDate, changeFrequency: "yearly", priority: 0.2 }),
  ];

  const cities = (await getJson<City>("/v1/cities")).filter(isPublic);
  if (cities.some((city) => !city?.id || !city.slug)) throw new Error('Sitemap upstream city is incomplete');
  const cityPages: MetadataRoute.Sitemap = cities.flatMap((c) =>
    localized(`/explorer/${encodeURIComponent(c.slug)}`, { lastModified: lastModified(c.updatedAt), changeFrequency: "weekly", priority: 0.7 }),
  );

  // place URLs need the city slug — fetch places per city (bounded by the city count).
  const placePages: MetadataRoute.Sitemap = [];
  for (const c of cities) {
    const places = await getAll<Place>(`/v1/places?cityId=${encodeURIComponent(c.id)}`);
    for (const p of places) {
      if (!isPublic(p) || p.cityId !== c.id) continue;
      placePages.push(
        ...localized(`/explorer/${encodeURIComponent(c.slug)}/${encodeURIComponent(p.slug)}`, {
          lastModified: lastModified(p.updatedAt),
          changeFrequency: "weekly",
          priority: 0.6,
        }),
      );
    }
  }

  return [...new Map([...staticPages, ...cityPages, ...placePages].map((entry) => [entry.url, entry])).values()];
}
