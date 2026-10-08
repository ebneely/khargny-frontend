import type { City, Place } from "@/lib/api/types";

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
