"use client";
/**
 * Saved-places hooks — wire the heart icon to the saved-places backend.
 * Mirrors `Modules/saved-places/contract.ts`:
 *   GET  /v1/saved-places        → SavedPlaceWithPlace[] (the visitor's plan)
 *   POST /v1/saved-places        → upsert a save (idempotent on (guestId, placeId))
 *   DELETE /v1/saved-places/:id  → remove a save
 *
 * Auth is the guest cookie (`khargny_guest_id`, HttpOnly, issued by khargny-backend
 * middleware). No login — see `Modules/saved-places/contract.ts` for the contract
 * and `business_story/khargny/US-VISITOR-SAV-001.md` for the story.
 *
 * TASK-0009. The Khargny design system never has booking/payment copy — every
 * mutation here is "add to your plan" / "remove from your plan", no "book" / "pay"
 * / price / currency anywhere in this file.
 */
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";

/** Mirrors `Modules/saved-places/contract.ts` SavedPlaceWithPlace. */
export interface SavedPlace {
  id: string;
  guestId: string;
  placeId: string;
  /** ISO datetime string. `null` = saved with no specific day/time. */
  plannedFor: string | null;
  createdAt: string;
}

export interface SavedPlaceWithPlace extends SavedPlace {
  place: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    address: string | null;
    rating: number;
    /** cityId is the FK the backend returns; used to derive the explorer URL. */
    cityId: string;
  };
}

export const savedPlacesKeys = {
  all: ["saved-places"] as const,
  isSaved: (placeId: string) => ["saved-places", "is-saved", placeId] as const,
};

/** GET /v1/saved-places — the visitor's full plan (places with optional plannedFor). */
export function useSavedPlaces(enabled: boolean = true) {
  return useQuery({
    queryKey: savedPlacesKeys.all,
    queryFn: () => apiRequest<SavedPlaceWithPlace[]>("GET", "/v1/saved-places"),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Check whether a specific place is already saved by the current guest.
 * Walks the `useSavedPlaces()` cache (no extra network round-trip).
 */
export function useIsPlaceSaved(placeId: string | null | undefined): boolean {
  const { data } = useSavedPlaces(Boolean(placeId));
  if (!data || !placeId) return false;
  return data.some((sp) => sp.placeId === placeId);
}

/** POST /v1/saved-places — add (or upsert) a save. */
export function useSavePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (placeId: string) =>
      apiRequest<SavedPlace>("POST", "/v1/saved-places", { body: { placeId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: savedPlacesKeys.all });
    },
  });
}

/** DELETE /v1/saved-places/:placeId — remove a save. */
export function useUnsavePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (placeId: string) =>
      apiRequest<SavedPlace>("DELETE", `/v1/saved-places/${placeId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: savedPlacesKeys.all });
    },
  });
}

/**
 * Composite hook for a single PlaceCard / place-detail heart icon.
 * Returns `saved` (the current state) and a `toggle` function that
 * saves if currently un-saved, unsaves if currently saved.
 *
 * No booking/payment copy is surfaced in any callback or UI rendered here.
 * The place-card and the place-detail both use this hook the same way.
 */
export function useSaveToggle(placeId: string | null | undefined) {
  const saved = useIsPlaceSaved(placeId);
  const save = useSavePlace();
  const unsave = useUnsavePlace();

  const toggle = React.useCallback(() => {
    if (!placeId) return;
    if (saved) {
      unsave.mutate(placeId);
    } else {
      save.mutate(placeId);
    }
  }, [placeId, saved, save, unsave]);

  return { saved, toggle, isPending: save.isPending || unsave.isPending };
}
