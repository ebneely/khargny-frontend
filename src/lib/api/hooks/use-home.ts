import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import type { Place } from "@/lib/api/types";

// GET /v1/home — admin-curated homepage sections (enabled, in order, each with its places).
// This replaces the frontend's hardcoded slice(0,6) rails with real editorial control
// (US-admin-STF-001). If the endpoint returns nothing, the home falls back to its region grid.
export interface HomeSection {
  id: string;
  key: string;
  titleAr: string;
  titleEn: string | null;
  kind: "featured" | "top_rated" | "recommended" | "custom";
  places: Place[];
}

export function useHomeSections() {
  return useQuery({
    queryKey: ["home", "sections"],
    queryFn: async () => {
      const raw = await apiRequest<HomeSection[] | { data?: HomeSection[] }>(
        "GET",
        "/v1/home",
      );
      return Array.isArray(raw) ? raw : raw?.data ?? [];
    },
    staleTime: 60 * 1000,
  });
}
