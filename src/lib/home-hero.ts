import type { City, Place } from "@/lib/api/types";
import type { SearchRequest } from "@/lib/place-search";

export const CITY_CENTRES: Record<
  string,
  { lat: number; lng: number; source: string }
> = {
  cairo: {
    lat: 30.06263,
    lng: 31.24967,
    source: "https://www.geonames.org/360630/cairo.html",
  },
  giza: {
    lat: 30.00944,
    lng: 31.20861,
    source: "https://www.geonames.org/360995/giza.html",
  },
  alexandria: {
    lat: 31.20176,
    lng: 29.91582,
    source: "https://www.geonames.org/361058/alexandria.html",
  },
  aswan: {
    lat: 24.09082,
    lng: 32.89942,
    source: "https://www.geonames.org/359792/aswan.html",
  },
  luxor: {
    lat: 25.69893,
    lng: 32.6421,
    source: "https://www.geonames.org/360502/luxor.html",
  },
  hurghada: {
    lat: 27.25738,
    lng: 33.81291,
    source: "https://www.geonames.org/361291/hurghada.html",
  },
  dahab: {
    lat: 28.48208,
    lng: 34.49505,
    source: "https://www.geonames.org/358245/dahab.html",
  },
  "sharm-el-sheikh": {
    lat: 27.91582,
    lng: 34.32995,
    source: "https://www.geonames.org/349340/sharm-el-sheikh.html",
  },
  siwa: {
    lat: 29.2032,
    lng: 25.51965,
    source: "https://www.geonames.org/347863/siwah.html",
  },
};

export const HOME_FUTURE_INTENT_CHIPS: { key: string; href: string }[] = [];

function validPosition(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export function nearestCity<
  C extends Pick<City, "slug"> & Partial<Pick<City, "lat" | "lng">>,
>(cities: C[], lat: number, lng: number): C | null {
  if (!validPosition(lat, lng)) return null;
  let nearest: C | null = null;
  let distance = Infinity;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  for (const city of cities) {
    const centre = validPosition(city.lat, city.lng)
      ? { lat: city.lat!, lng: city.lng! }
      : CITY_CENTRES[city.slug];
    if (!centre) continue;
    const haversine =
      Math.sin(radians(centre.lat - lat) / 2) ** 2 +
      Math.cos(radians(lat)) *
        Math.cos(radians(centre.lat)) *
        Math.sin(radians(centre.lng - lng) / 2) ** 2;
    if (haversine < distance) {
      distance = haversine;
      nearest = city;
    }
  }
  return nearest;
}

export type DetectedLocation = { city: City; region: string | null };

type GeoPoint = readonly [lat: number, lng: number];

// Approximate Greater Cairo Nile centreline and Cairo island outlines (Zamalek and Roda).
// Good to a few hundred metres; this is a visitor-location heuristic, not an administrative boundary.
const NILE_CENTRELINE: readonly GeoPoint[] = [
  [30.18, 31.14], [30.13, 31.21], [30.08, 31.227], [30.05, 31.213],
  [30.02, 31.220], [29.98, 31.228], [29.96, 31.233], [29.92, 31.268],
  [29.85, 31.293], [29.78, 31.300],
];
const CAIRO_ISLANDS: readonly (readonly GeoPoint[])[] = [
  [[30.076, 31.221], [30.066, 31.222], [30.052, 31.223], [30.049, 31.217], [30.057, 31.213], [30.070, 31.213]],
  [[30.020, 31.224], [30.015, 31.227], [30.000, 31.230], [29.995, 31.227], [30.004, 31.221], [30.011, 31.220]],
];

function insideIsland(polygon: readonly GeoPoint[], lat: number, lng: number): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [firstLat, firstLng] = polygon[index];
    const [secondLat, secondLng] = polygon[previous];
    if ((firstLat > lat) !== (secondLat > lat) &&
      lng < (secondLng - firstLng) * (lat - firstLat) / (secondLat - firstLat) + firstLng) {
      inside = !inside;
    }
  }
  return inside;
}

function greaterCairoCity(cities: City[], lat: number, lng: number): City | undefined {
  if (lat < 29.70 || lat > 30.25 || lng < 30.85 || lng > 31.75) return;
  const cairo = cities.find((city) => city.slug === "cairo" && city.status === "active");
  const giza = cities.find((city) => city.slug === "giza" && city.status === "active");
  if (!cairo || !giza) return;
  if (CAIRO_ISLANDS.some((polygon) => insideIsland(polygon, lat, lng))) return cairo;
  let riverLng = lat >= NILE_CENTRELINE[0][0]
    ? NILE_CENTRELINE[0][1]
    : NILE_CENTRELINE[NILE_CENTRELINE.length - 1][1];
  for (let index = 1; index < NILE_CENTRELINE.length; index++) {
    const [northLat, northLng] = NILE_CENTRELINE[index - 1];
    const [southLat, southLng] = NILE_CENTRELINE[index];
    if (lat <= northLat && lat >= southLat) {
      riverLng = southLng + (lat - southLat) / (northLat - southLat) * (northLng - southLng);
      break;
    }
  }
  return lng >= riverLng ? cairo : giza;
}

function distanceKm(lat: number, lng: number, place: Place): number {
  if (!validPosition(place.lat, place.lng)) return Infinity;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const haversine =
    Math.sin(radians(place.lat! - lat) / 2) ** 2 +
    Math.cos(radians(lat)) * Math.cos(radians(place.lat!)) *
    Math.sin(radians(place.lng! - lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export async function detectNearbyLocation(
  cities: City[],
  lat: number,
  lng: number,
  request: SearchRequest,
): Promise<DetectedLocation | null> {
  if (!validPosition(lat, lng)) return null;
  const activeCities = cities.filter((city) => city.status !== "draft");
  const riverCity = greaterCairoCity(activeCities, lat, lng);
  let places: Place[] = [];
  for (const radiusKm of [15, 60]) {
    let raw: unknown;
    try {
      raw = await request("/v1/search/places", { lat, lng, radiusKm, limit: 100 });
    } catch (error) {
      if (riverCity) return { city: riverCity, region: null };
      throw error;
    }
    const payload = raw as { items?: Place[]; data?: Place[] } | null;
    const rows = Array.isArray(raw) ? raw : payload?.items ?? payload?.data ?? [];
    places = rows;
    if (places.length) break;
  }
  if (!places.length) {
    const city = riverCity ?? nearestCity(activeCities, lat, lng);
    return city ? { city, region: null } : null;
  }
  const ranked = places
    .map((place, index) => ({ place, index, distance: distanceKm(lat, lng, place) }))
    .filter((entry) => Number.isFinite(entry.distance))
    .sort((first, second) => first.distance - second.distance || first.index - second.index);
  if (riverCity) {
    const nearest = ranked.find(({ place }) => place.cityId === riverCity.id);
    return { city: riverCity, region: nearest && nearest.distance <= 3 ? nearest.place.region || null : null };
  }
  const scores = activeCities.flatMap((city) => {
    const matches = ranked.filter(({ place }) => place.cityId === city.id);
    if (!matches.length) return [];
    return [{
      city,
      nearest: matches[0],
      score: matches.reduce((score, entry) => score + 1 / (1 + entry.distance), 0),
    }];
  });
  scores.sort((first, second) =>
    (Math.abs(first.score - second.score) > 1e-9 ? second.score - first.score : 0) ||
    first.nearest.distance - second.nearest.distance ||
    first.city.slug.localeCompare(second.city.slug),
  );
  const winner = scores[0];
  return winner ? {
    city: winner.city,
    region: winner.nearest.distance <= 3 ? winner.nearest.place.region || null : null,
  } : null;
}

export function detectedCityAddress(locale: string, detected: DetectedLocation): string {
  const address = `/${locale}/explorer/${encodeURIComponent(detected.city.slug)}/`;
  return detected.region && detected.city.areaKeys?.includes(detected.region)
    ? `${address}?${new URLSearchParams({ region: detected.region })}`
    : address;
}

type SearchStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function recentSearches(storage?: SearchStorage) {
  const key = "khg-recent-searches";
  let searches: string[] = [];
  const clean = (values: unknown): string[] => {
    if (!Array.isArray(values)) return [];
    const unique = new Set<string>();
    return values
      .filter((value): value is string => {
        if (
          typeof value !== "string" ||
          value.trim().length < 2 ||
          value.length > 200 ||
          unique.has(value.trim().toLocaleLowerCase())
        )
          return false;
        unique.add(value.trim().toLocaleLowerCase());
        return true;
      })
      .slice(0, 3)
      .map((value) => value.trim());
  };
  return {
    read() {
      try {
        if (storage) searches = clean(JSON.parse(storage.getItem(key) ?? "[]"));
      } catch {}
      return searches;
    },
    add(value: string) {
      const trimmed = value.trim().slice(0, 200);
      if (trimmed.length < 2) return searches;
      searches = clean([trimmed, ...searches]);
      try {
        storage?.setItem(key, JSON.stringify(searches));
      } catch {}
      return searches;
    },
    clear() {
      searches = [];
      try {
        storage?.removeItem(key);
      } catch {}
      return searches;
    },
  };
}

export function moveHighlight(
  current: number,
  key: string,
  count: number,
): number {
  if (key === "Escape" || !count) return -1;
  if (key === "ArrowDown") return (current + 1) % count;
  if (key === "ArrowUp")
    return current < 0 ? count - 1 : (current - 1 + count) % count;
  return current;
}

export function bestSearchCity(
  cities: City[],
  places: Place[],
  query: string,
): City | undefined {
  const term = query.trim().toLocaleLowerCase();
  const named = cities.filter((city) =>
    [city.name, city.nameEn].some((name) => name?.toLocaleLowerCase() === term),
  );
  if (named.length === 1) return named[0];
  const scores = cities
    .map((city) => ({
      city,
      count: places.filter((place) => place.cityId === city.id).length,
    }))
    .sort((first, second) => second.count - first.count);
  return scores[0]?.count > places.length / 2 &&
    scores[0].count > (scores[1]?.count ?? 0)
    ? scores[0].city
    : undefined;
}
