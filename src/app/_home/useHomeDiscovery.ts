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
import { useSavePlace } from "@/lib/api/hooks/use-saved-places";
import { useI18n } from "@/i18n/LocaleProvider";

export type Category = { key: string; label: string; icon: string };
export type RailPlace = {
  id: string;
  slug: string;
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
  const savePlace = useSavePlace();

  const cityNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cityData ?? []) {
      m.set(c.id, locale === "ar" ? c.name : c.nameEn || c.name);
    }
    return m;
  }, [cityData, locale]);

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
    const items = placeData?.items ?? [];
    const toRail = (
      place: (typeof items)[number],
      featured: boolean,
    ): RailPlace => ({
      id: place.id,
      slug: place.slug,
      title: locale === "ar" ? place.name : place.nameEn || place.name,
      area: cityNameById.get(place.cityId) ?? "",
      rating: place.rating > 0 ? place.rating.toFixed(1) : "—",
      badge: featured ? t("home.popular") : undefined,
    });
    const popular = items.slice(0, 6).map((p) => toRail(p, p.featured));
    const recommended = items.slice(6, 12).map((p) => toRail(p, false));
    const out: Rail[] = [];
    if (popular.length) out.push({ title: t("home.popular"), places: popular });
    if (recommended.length)
      out.push({ title: t("home.recommended"), places: recommended });
    return out;
  }, [placeData, cityNameById, locale, t]);

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
    toast,
    dismissToast: () => setToast(null),
    onSavePlace,
  };
}

export type HomeDiscovery = ReturnType<typeof useHomeDiscovery>;
