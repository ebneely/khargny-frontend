/**
 * REST API types — hand-mirrored from the vault contracts (source of truth):
 *   khargny-obsidian/Modules/places/contract.ts
 *   khargny-obsidian/Modules/cities/contract.ts
 *   khargny-obsidian/Modules/categories/contract.ts
 *   khargny-obsidian/Modules/search/contract.ts
 *
 * Only the PUBLIC (visitor) shapes are declared here — this app owns the explorer
 * surface only. Admin/mutation shapes live in khargny-dashboard.
 */

// ── Response envelope (matches AllExceptionsFilter / ResponseInterceptor) ──────
export interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string };
  timestamp: string;
  requestId?: string;
}

// ── Categories ─────────────────────────────────────────────────────────────
export type CategoryStatus = 'active' | 'draft';

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
}

// GET /v1/categories/:slug/places
export interface PlaceListByCategory {
  items: unknown[]; // → Place summary, see below
  total?: number;
  skip: number;
  limit: number;
}

// ── Cities ───────────────────────────────────────────────────────────────────
export type CityStatus = 'active' | 'draft';

export interface City {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  region: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  lat: number | null;
  lng: number | null;
  featured: boolean;
  status: CityStatus;
  /** Admin-uploaded cover photo (WebP, optimized). */
  imageUrl?: string | null;
  parentCityId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
}

export interface CityWithAreas extends City {
  areas?: City[];
}

// GET /v1/cities/:slug/places
export interface PlaceListByCity {
  items: Place[];
  skip: number;
  limit: number;
}

// ── Places ───────────────────────────────────────────────────────────────────
export type PlaceStatus = 'active' | 'draft';

export interface Place {
  id: string;
  cityId: string;
  categoryId: string;
  name: string;
  slug: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  address: string | null;
  /** Area inside the city ("Zamalek"), from the dashboard catalog. What visitors browse by. */
  region: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  priceRange: number | null;
  rating: number;
  viewCount: number;
  featured: boolean;
  status: PlaceStatus;
  /** Card cover — small WebP variant of the first image, from the public list. */
  coverImage?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
}

// A place's opening hours row — mirrors Modules/place-hours PlaceHourItemDto.
// dayOfWeek: 0=Sunday … 6=Saturday. Times are "HH:mm" (24h) or null. isClosed
// true = the place is shut that day.
export interface PlaceHour {
  placeId?: string;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export interface PlaceAmenity {
  id: string;
  name: string;
  nameEn: string | null;
  icon: string | null;
}

export interface PlaceTag {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
}

// GET /v1/places/:slug — the real aggregation now returns images + videos AND
// placeHours + amenities + tags (verified against backend.5argny.com 2026-07-19).
// The earlier "hours/amenities/tags do not exist" note is STALE — they are live.
export interface PlaceDetail extends Place {
  images: unknown[]; // → Modules/media/contract.ts TransformedImage
  videos: unknown[]; // → Modules/media/contract.ts TransformedVideo
  placeHours?: PlaceHour[];
  amenities?: PlaceAmenity[];
  tags?: PlaceTag[];
}

export interface PlaceList {
  items: Place[];
  skip: number;
  limit: number;
}

export interface PlaceFilters {
  cityId?: string;
  categoryId?: string;
  /** Area inside the city — exact match against the dashboard catalog value. */
  region?: string;
  status?: PlaceStatus;
  // visitor filters (comma-joined for the query string)
  priceRange?: string;
  featured?: boolean;
  amenityIds?: string;
  tagIds?: string;
  skip?: number;
  limit?: number;
}

// ── Search ───────────────────────────────────────────────────────────────────
export interface SearchPlacesQuery {
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  categoryIds?: string[];
  ratingMin?: number;
  ratingMax?: number;
  skip?: number;
  limit?: number;
}

export interface SearchPlacesResult {
  items: Place[];
  skip?: number;
  limit?: number;
}
