"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { normalizeFeaturedPlaces, normalizeTopPlaces } from "@/lib/ads/placements";

type RotationQuery = { state: { data?: { rotation: { nextAt: string } } | null; dataUpdatedAt: number } };

function rotationStaleTime(query: RotationQuery): number {
  const boundary = Date.parse(query.state.data?.rotation.nextAt ?? "");
  return Number.isFinite(boundary) ? Math.max(0, Math.min(600_000, boundary - query.state.dataUpdatedAt)) : 600_000;
}

function nextRotationInterval(query: RotationQuery): number {
  const boundary = Date.parse(query.state.data?.rotation.nextAt ?? "");
  if (!Number.isFinite(boundary)) return 600_000;
  if (boundary > Date.now()) return Math.min(600_000, Math.max(1, boundary - Date.now()));
  return query.state.dataUpdatedAt >= boundary ? 60_000 : 1;
}

async function readPlacement(path: string, signal: AbortSignal, city?: string): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const timeout = setTimeout(abort, 10_000);
  try {
    return await apiRequest<unknown>("GET", path, { signal: controller.signal, params: { city } });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}

export function useFeaturedPlaces() {
  return useQuery({
    queryKey: ["home", "featured"],
    queryFn: async ({ signal }) => normalizeFeaturedPlaces(await readPlacement("/v1/home/featured", signal)),
    staleTime: rotationStaleTime,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchInterval: nextRotationInterval,
  });
}

export function useTopPlaces(city?: string) {
  return useQuery({
    queryKey: ["home", "top-places", city ?? null],
    queryFn: async ({ signal }) => {
      const places = normalizeTopPlaces(await readPlacement("/v1/home/top-places", signal, city));
      return places ? { ...places, city } : null;
    },
    placeholderData: keepPreviousData,
    staleTime: rotationStaleTime,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchInterval: nextRotationInterval,
  });
}
