"use client";
/**
 * useHomeDiscovery — the single source of truth for the home discovery scenario
 * (US-VISITOR-CIT-001: "pick a region → routes to /explorer/{citySlug}").
 *
 * Container/presenter split: this hook holds ALL state, data, and actions. The two
 * presentational shells — HomeMobile / HomeDesktop — consume it, so behavior lives
 * once and can never drift between the two device experiences.
 *
 * Data is REAL (khargny backend): categories from GET /v1/categories, rails from
 * GET /v1/places, city names from GET /v1/cities, saves via POST /v1/saved-places.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { REGIONS, getRegionToCitySlug, type RegionName } from "@/lib/regions";
import { useCategories } from "@/lib/api/hooks/use-categories";
import { usePlaces } from "@/lib/api/hooks/use-places";
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
  const { data: placeData } = usePlaces({ limit: 12 });
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
        icon: ICON_BY_SLUG[c.slug] || c.icon || "map-pin",
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

    // PREFERRED: admin-curated sections (US-admin-STF-001). Each enabled section becomes a rail,
    // titled by locale, in the admin's order.
    if (homeSections && homeSections.length > 0) {
      return homeSections
        .filter((s) => (s.places?.length ?? 0) > 0)
        .map((s) => ({
          title: (locale === "ar" ? s.titleAr : s.titleEn || s.titleAr) || s.key,
          places: s.places.map((p) => toRail(p, s.kind === "featured" ? t("home.popular") : undefined)),
        }));
    }

    // FALLBACK: no curated sections → the built-in Popular / Recommended split.
    const items = placeData?.items ?? [];
    const popular = items.slice(0, 6).map((p) => toRail(p, p.featured ? t("home.popular") : undefined));
    const recommended = items.slice(6, 12).map((p) => toRail(p));
    const out: Rail[] = [];
    if (popular.length) out.push({ title: t("home.popular"), places: popular });
    if (recommended.length)
      out.push({ title: t("home.recommended"), places: recommended });
    return out;
  }, [homeSections, placeData, cityNameById, citySlugById, locale, t]);

  // Open a place from a home rail card → its detail page (needs the city slug).
  const onOpenPlace = React.useCallback(
    (p: RailPlace) => {
      if (p.citySlug && p.slug) router.push(`/explorer/${p.citySlug}/${p.slug}`);
    },
    [router],
  );

  const onRegionSelect = React.useCallback(
    (label: RegionName) => {
      setFiltersOpen(false);
      router.push(`/explorer/${getRegionToCitySlug(label)}`);
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

  return {
    regions: REGIONS,
    categories,
    rails,
    cat,
    setCat,
    filtersOpen,
    openFilters: () => setFiltersOpen(true),
    closeFilters: () => setFiltersOpen(false),
    onRegionSelect,
    onOpenPlace,
    toast,
    dismissToast: () => setToast(null),
    onSavePlace,
  };
}

export type HomeDiscovery = ReturnType<typeof useHomeDiscovery>;
