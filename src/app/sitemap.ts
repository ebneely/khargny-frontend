import type { MetadataRoute } from "next";
import { API_BASE_URL, SITE_URL } from "@/lib/config";

// Dynamic sitemap: static pages + every active city and place, so search engines discover and
// index each shareable place URL. Fetches from the public API; degrades to static pages on error.
export const revalidate = 3600;

type City = { slug: string; updatedAt?: string };
type Place = { slug: string; cityId: string; updatedAt?: string };

async function getJson<T>(path: string): Promise<T[]> {
  if (!API_BASE_URL) return [];
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json?.data;
    // list endpoints are either a raw array or { data: [...], meta }
    if (Array.isArray(data)) return data as T[];
    if (Array.isArray(data?.data)) return data.data as T[];
    return [];
  } catch {
    return [];
  }
}

/**
 * Every page of a list, not just the first.
 *
 * This used to ask for `limit=100` once per city and stop. Cairo has 147 places, so 47 of
 * them were absent from the sitemap entirely — pages that exist, are linked, and were never
 * offered to a crawler. The API caps a page at 100, so more than one request is the only way.
 */
async function getAll<T>(pathBase: string, cap = 2000): Promise<T[]> {
  const out: T[] = [];
  const size = 100;
  for (let skip = 0; skip < cap; skip += size) {
    const sep = pathBase.includes("?") ? "&" : "?";
    const page = await getJson<T>(`${pathBase}${sep}skip=${skip}&limit=${size}`);
    out.push(...page);
    if (page.length < size) break;
  }
  return out;
}

/**
 * Every page now lives under a locale segment (/ar/... and /en/...). A bare URL only
 * redirects, so the sitemap must list the real ones — both languages, cross-linked with
 * hreflang so search engines treat them as translations rather than duplicates.
 */
const LOCALES = ["ar", "en"] as const;

/**
 * next.config sets `trailingSlash: true`, so `/en/explorer/cairo` 308-redirects to
 * `/en/explorer/cairo/`. Listing the un-slashed form made every single sitemap entry cost a
 * redirect hop, which crawlers discount and which wasted the crawl budget of a 900-URL map.
 */
function urlFor(path: string, locale: string): string {
  const clean = path ? `/${path.replace(/^\/+|\/+$/g, "")}` : "";
  return `${SITE_URL}/${locale}${clean}/`;
}

function localized(
  path: string,
  rest: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l === "ar" ? "ar-EG" : "en"] = urlFor(path, l);
  languages["x-default"] = urlFor(path, "ar");

  return LOCALES.map((l) => ({
    url: urlFor(path, l),
    ...rest,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    ...localized("", { lastModified: now, changeFrequency: "daily", priority: 1 }),
    // /plan is deliberately absent: it is one guest's saved list, not a page anyone should
    // reach from a search result. robots.txt disallows it too.
    ...localized("/explorer", { lastModified: now, changeFrequency: "daily", priority: 0.9 }),
    ...localized("/contact", { lastModified: now, changeFrequency: "monthly", priority: 0.3 }),
    ...localized("/privacy", { lastModified: now, changeFrequency: "yearly", priority: 0.2 }),
  ];

  const cities = await getJson<City>("/v1/cities");
  const cityById = new Map<string, City>();
  const cityPages: MetadataRoute.Sitemap = cities.flatMap((c) =>
    localized(`/explorer/${c.slug}`, { lastModified: now, changeFrequency: "weekly", priority: 0.7 }),
  );

  // place URLs need the city slug — fetch places per city (bounded by the city count).
  const placePages: MetadataRoute.Sitemap = [];
  for (const c of cities) cityById.set((c as unknown as { id?: string }).id ?? c.slug, c);
  for (const c of cities) {
    const cid = (c as unknown as { id?: string }).id;
    if (!cid) continue;
    const places = await getAll<Place>(`/v1/places?cityId=${cid}`);
    for (const p of places) {
      placePages.push(
        ...localized(`/explorer/${c.slug}/${p.slug}`, {
          lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
          changeFrequency: "weekly",
          priority: 0.6,
        }),
      );
    }
  }

  return [...staticPages, ...cityPages, ...placePages];
}
