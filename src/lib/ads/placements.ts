export type AdPlacement = "featured" | "top10";
export type AdPlace = {
  id: string;
  cityId: string;
  slug: string;
  name: string;
  nameEn?: string;
  coverImage?: string;
  priceRange: number | null;
  hasMenu: boolean;
  priceVerified: boolean;
  visitedByUs: boolean;
  saveCount: number;
  likeCount?: number;
  viewCount: number;
  directionsCount: number;
};
export type AdItem = { sponsored: boolean; campaignId: string | null; place: AdPlace };
export type AdRotation = { bucket: number | null; nextAt: string };
export type FeaturedPlaces = {
  section: { titleAr: string; titleEn: string };
  rotation: AdRotation;
  items: AdItem[];
};
export type TopPlaces = { city?: string; rotation: AdRotation; items: (AdItem & { position: number })[] };

const UUID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

export function isAdCampaignId(value: string): boolean {
  return UUID.test(value);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, maxLength = 512): string | undefined {
  return typeof value === "string" && value.trim() && value.length <= maxLength ? value.trim() : undefined;
}

function count(value: unknown): number {
  const numeric = typeof value === "number" || typeof value === "string" ? Number(value) : 0;
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : 0;
}

function image(value: unknown): string | undefined {
  const raw = text(value, 2048);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const hostname = url.hostname;
    const allowed = ["storage.5argny.com", "img.5argny.com", "img.heroui.chat"].includes(hostname) ||
      ["googleapis.com", "googleusercontent.com", "gstatic.com"].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
    return url.protocol === "https:" && !url.username && !url.password && allowed ? raw : undefined;
  } catch {
    return undefined;
  }
}

function normalizeItem(value: unknown): AdItem | null {
  if (!record(value) || !record(value.place) || typeof value.sponsored !== "boolean") return null;
  const raw = value.place;
  const id = text(raw.id, 128);
  const cityId = text(raw.cityId, 128);
  const slug = text(raw.slug, 120);
  const name = text(raw.name);
  const campaignId = value.sponsored ? text(value.campaignId, 36) : null;
  if (!id || !cityId || !slug || !name || slug === "." || slug === ".." || /[\s/\\?#]/.test(slug)) return null;
  if (value.sponsored && (!campaignId || !isAdCampaignId(campaignId))) return null;
  return {
    sponsored: value.sponsored,
    campaignId: campaignId ?? null,
    place: {
      id, cityId, slug, name,
      nameEn: text(raw.nameEn),
      coverImage: image(raw.coverImage),
      priceRange: typeof raw.priceRange === "number" && Number.isInteger(raw.priceRange) && raw.priceRange >= 1 && raw.priceRange <= 4 ? raw.priceRange : null,
      hasMenu: raw.hasMenu === true,
      priceVerified: raw.priceVerified === true,
      visitedByUs: raw.visitedByUs === true,
      saveCount: count(raw.saveCount),
      likeCount: count(raw.likeCount),
      viewCount: count(raw.viewCount),
      directionsCount: count(raw.directionsCount),
    },
  };
}

function normalizeRotation(value: unknown): AdRotation {
  if (!record(value)) return { bucket: null, nextAt: "" };
  const bucket = typeof value.bucket === "number" && Number.isSafeInteger(value.bucket) && value.bucket >= 0 ? value.bucket : null;
  const nextAt = text(value.nextAt, 128);
  return { bucket, nextAt: nextAt && Number.isFinite(Date.parse(nextAt)) ? nextAt : "" };
}

export function normalizeFeaturedPlaces(value: unknown): FeaturedPlaces | null {
  if (!record(value) || !record(value.section) || !Array.isArray(value.items)) return null;
  const titleAr = text(value.section.titleAr);
  const titleEn = text(value.section.titleEn) || titleAr;
  if (!titleAr || !titleEn) return null;
  const items = value.items.map(normalizeItem).filter((item): item is AdItem => item !== null);
  return items.length ? { section: { titleAr, titleEn }, rotation: normalizeRotation(value.rotation), items } : null;
}

export function normalizeTopPlaces(value: unknown): TopPlaces | null {
  if (!record(value) || !Array.isArray(value.items)) return null;
  const positions = new Set<number>();
  const items: TopPlaces["items"] = [];
  for (const raw of value.items) {
    const item = normalizeItem(raw);
    const position = record(raw) ? raw.position : null;
    if (!item || typeof position !== "number" || !Number.isInteger(position) || position < 1 || position > 10 || positions.has(position)) continue;
    positions.add(position);
    items.push({ ...item, position });
  }
  return items.length ? { rotation: normalizeRotation(value.rotation), items } : null;
}
