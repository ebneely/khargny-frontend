"use client";
/**
 * useHomeDiscovery — the single source of truth for the home discovery scenario
 * (US-VISITOR-CIT-001: "pick a region → routes to /explorer/{citySlug}").
 *
 * Container/presenter split: this hook holds ALL state, data, and actions. The single
 * responsive shell — Home — consumes it, so behavior lives once, independent of layout.
 *
 * Data is REAL (khargny backend): categories from GET /v1/categories, rails from
 * GET /v1/home (the sections curated in dashboard/storefront), city names from
 * GET /v1/cities, saves via POST /v1/saved-places.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useCategories } from "@/lib/api/hooks/use-categories";
import { useCities } from "@/lib/api/hooks/use-cities";
import { useHomeSections } from "@/lib/api/hooks/use-home";
import { useSavePlace } from "@/lib/api/hooks/use-saved-places";
import { useI18n } from "@/i18n/LocaleProvider";

export type Category = { key: string; label: string; icon: string };
export type RailPlace = {
  id: string;
  slug: string;
  citySlug: string;
  title: string;
  area: string;
  rating: string;
  badge?: string;
};
export type Rail = { title: string; places: RailPlace[] };

// Map a category slug to a lucide icon name the CategoryChip understands.
const ICON_BY_SLUG: Record<string, string> = {
  beach: "waves",
  historic: "landmark",
  nature: "trees",
  desert: "mountain",
  dining: "utensils",
  cafe: "coffee",
  shopping: "shopping-bag",
};

export type ToastState = { message: string; tone: "success" | "error" } | null;

export function useHomeDiscovery() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [cat, setCat] = React.useState<string>("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [toast, setToast] = React.useState<ToastState>(null);

  const { data: categoryData } = useCategories();
  const { data: cityData } = useCities();
  const { data: homeSections } = useHomeSections();
  const savePlace = useSavePlace();

  const cityNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cityData ?? []) {
      m.set(c.id, locale === "ar" ? c.name : c.nameEn || c.name);
    }
    return m;
  }, [cityData, locale]);

  // cityId → slug, so a home place card can route to /explorer/{citySlug}/{placeSlug}.
  const citySlugById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cityData ?? []) m.set(c.id, c.slug);
    return m;
  }, [cityData]);

  const categories = React.useMemo<Category[]>(() => {
    return (categoryData ?? [])
      .filter((c) => c.status !== "draft")
      .map((c) => ({
        key: c.slug,
        label: locale === "ar" ? c.nameAr : c.nameEn || c.nameAr,
        // Prefer the icon the ADMIN set in the dashboard; fall back to a slug guess, then a pin.
        icon: c.icon || ICON_BY_SLUG[c.slug] || "map-pin",
      }));
  }, [categoryData, locale]);

  const rails = React.useMemo<Rail[]>(() => {
    const toRail = (place: {
      id: string;
      slug: string;
      name: string;
      nameEn?: string | null;
      cityId: string;
      rating: number | string;
      featured?: boolean;
    }, badge?: string): RailPlace => ({
      id: place.id,
      slug: place.slug,
      citySlug: citySlugById.get(place.cityId) ?? "",
      title: locale === "ar" ? place.name : place.nameEn || place.name,
      area: cityNameById.get(place.cityId) ?? "",
      // Backend serializes numeric rating as a string; coerce before format.
      rating: Number(place.rating) > 0 ? Number(place.rating).toFixed(1) : "—",
      badge,
    });

    // Home rails are ENTIRELY admin-curated (US-admin-STF-001): each enabled section from
    // dashboard/storefront becomes a rail, titled by locale, in the admin's order. There is
    // deliberately no hardcoded fallback — a "Popular"/"Recommended" split invented here
    // would appear on the site without existing in the dashboard, so the admin could neither
    // reorder nor remove it. With no sections configured, the home still shows its hero,
    // categories and region grid. The Expo app renders the same endpoint the same way.
    return (homeSections ?? [])
      .filter((s) => (s.places?.length ?? 0) > 0)
      .map((s) => ({
        title: (locale === "ar" ? s.titleAr : s.titleEn || s.titleAr) || s.key,
        places: s.places.map((p) => toRail(p, s.kind === "featured" ? t("home.popular") : undefined)),
      }));
  }, [homeSections, cityNameById, citySlugById, locale, t]);

  // Open a place from a home rail card → its detail page (needs the city slug).
  const onOpenPlace = React.useCallback(
    (p: RailPlace) => {
      if (p.citySlug && p.slug) router.push(`/explorer/${p.citySlug}/${p.slug}`);
    },
    [router],
  );

  // "Explore by region" = the REAL cities the admin created (not a hardcoded 5-region list).
  // Each card routes to that city's explorer page by its real slug.
  const regionCities = React.useMemo(
    () =>
      (cityData ?? [])
        .filter((c) => c.status !== "draft")
        .map((c) => ({
          id: c.id,
          slug: c.slug,
          label: locale === "ar" ? c.name : c.nameEn || c.name,
          region: c.region ?? "",
        })),
    [cityData, locale],
  );

  const onCitySelect = React.useCallback(
    (slug: string) => {
      setFiltersOpen(false);
      if (slug) router.push(`/explorer/${slug}`);
    },
    [router],
  );

  // Real save — POST /v1/saved-places (guest-scoped). Feedback toast either way.
  const onSavePlace = React.useCallback(
    (placeId: string) => {
      if (!placeId) return;
      savePlace.mutate(placeId, {
        onSuccess: () =>
          setToast({ message: t("place.saved"), tone: "success" }),
        onError: () => setToast({ message: t("errors.generic"), tone: "error" }),
      });
    },
    [savePlace, t],
  );

  // The raw active City records, so the home can render the SAME CityGrid the explorer uses
  // instead of a second, near-identical card. regionCities stays for anything that only
  // needs the mapped label/slug shape.
  const activeCities = React.useMemo(
    () => (cityData ?? []).filter((c) => c.status !== "draft"),
    [cityData],
  );

  return {
    activeCities,
    regionCities,
    categories,
    rails,
    cat,
    setCat,
    filtersOpen,
    openFilters: () => setFiltersOpen(true),
    closeFilters: () => setFiltersOpen(false),
    onCitySelect,
    onOpenPlace,
    toast,
    dismissToast: () => setToast(null),
    onSavePlace,
  };
}

export type HomeDiscovery = ReturnType<typeof useHomeDiscovery>;
