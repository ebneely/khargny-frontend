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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/explorer`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/plan`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const cities = await getJson<City>("/v1/cities");
  const cityById = new Map<string, City>();
  const cityPages: MetadataRoute.Sitemap = cities.map((c) => {
    return { url: `${SITE_URL}/explorer/${c.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.7 };
  });

  // place URLs need the city slug — fetch places per city (bounded by the city count).
  const placePages: MetadataRoute.Sitemap = [];
  for (const c of cities) cityById.set((c as unknown as { id?: string }).id ?? c.slug, c);
  for (const c of cities) {
    const cid = (c as unknown as { id?: string }).id;
    if (!cid) continue;
    const places = await getJson<Place>(`/v1/places?cityId=${cid}&limit=100`);
    for (const p of places) {
      placePages.push({
        url: `${SITE_URL}/explorer/${c.slug}/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return [...staticPages, ...cityPages, ...placePages];
}
