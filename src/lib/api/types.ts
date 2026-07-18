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
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
}

// GET /v1/places/:slug — CONFIRMED (Modules/places/decisions.md, 2026-07): the real
// aggregation is images + videos ONLY. hours/amenities/tags do NOT exist on this
// response today, and viewCount is NOT incremented on read. Do not render those
// regions as if they work — omit or show empty with a note.
export interface PlaceDetail extends Place {
  images: unknown[]; // → Modules/media/contract.ts TransformedImage
  videos: unknown[]; // → Modules/media/contract.ts TransformedVideo
}

export interface PlaceList {
  items: Place[];
  skip: number;
  limit: number;
}

export interface PlaceFilters {
  cityId?: string;
  categoryId?: string;
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
