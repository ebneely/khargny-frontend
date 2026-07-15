"use client";
/**
 * useHomeDiscovery — the single source of truth for the home discovery scenario
 * (US-VISITOR-CIT-001: "pick a region → routes to /explorer/{citySlug}").
 *
 * Container/presenter split: this hook holds ALL state, data, and actions. The two
 * presentational shells — HomeMobile (mobile-first column) and HomeDesktop (distinct
 * desktop layout) — consume it, so behavior lives once and can never drift between
 * the two device experiences. Adding a real API later means changing only this file.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { REGIONS, getRegionToCitySlug, type RegionName } from "@/lib/regions";

export type Category = { key: string; label: string; icon: string };
export type RailPlace = { title: string; area: string; rating: string; badge?: string };
export type Rail = { title: string; places: RailPlace[] };

export const CATEGORIES: Category[] = [
  { key: "beach", label: "Beach", icon: "waves" },
  { key: "historic", label: "Historic", icon: "landmark" },
  { key: "nature", label: "Nature", icon: "trees" },
  { key: "desert", label: "Desert", icon: "mountain" },
  { key: "dining", label: "Dining", icon: "utensils" },
];

export const RAILS: Rail[] = [
  {
    title: "Popular near Cairo",
    places: [
      { title: "Wadi Degla Protectorate", area: "Maadi, Cairo", rating: "4.9", badge: "Guest favorite" },
      { title: "Al-Azhar Park", area: "Islamic Cairo", rating: "4.8" },
      { title: "Zamalek Nile Corniche", area: "Zamalek, Cairo", rating: "4.7" },
    ],
  },
  {
    title: "Weekend getaways",
    places: [
      { title: "Siwa Oasis Camp", area: "Siwa", rating: "4.9", badge: "Curated" },
      { title: "Ain Sokhna Beach House", area: "Ain Sokhna", rating: "4.6" },
      { title: "Fayoum Lakeside", area: "Fayoum", rating: "4.8" },
    ],
  },
];

export type ToastState = { message: string; tone: "success" | "error" } | null;

export function useHomeDiscovery() {
  const router = useRouter();
  const [cat, setCat] = React.useState<string>("beach");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [toast, setToast] = React.useState<ToastState>(null);

  const onRegionSelect = React.useCallback(
    (label: RegionName) => {
      setFiltersOpen(false);
      router.push(`/explorer/${getRegionToCitySlug(label)}`);
    },
    [router],
  );

  const onSavePlace = React.useCallback((title: string) => {
    // Heart tap is a no-op on the homepage this pass — TASK-0009 wires it to the
    // saved-places backend (POST/DELETE /v1/saved-places). Feedback toast only.
    setToast({ message: `Added ${title} to your plan`, tone: "success" });
  }, []);

  return {
    regions: REGIONS,
    categories: CATEGORIES,
    rails: RAILS,
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
