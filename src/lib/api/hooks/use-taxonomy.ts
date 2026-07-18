import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";

// Public amenities + tags — the admin-managed taxonomy the visitor filters by. These populate the
// filter panel so the filter OPTIONS come from what the admin created, not a hardcoded list.
export interface Amenity {
  id: string;
  name: string;
  nameEn?: string | null;
  icon?: string | null;
}
export interface Tag {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
}

function unwrap<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const r = raw as { data?: T[] } | null;
  return Array.isArray(r?.data) ? (r!.data as T[]) : [];
}

export function useAmenities() {
  return useQuery({
    queryKey: ["amenities"],
    queryFn: async () => unwrap<Amenity>(await apiRequest("GET", "/v1/amenities")),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => unwrap<Tag>(await apiRequest("GET", "/v1/tags")),
    staleTime: 5 * 60 * 1000,
  });
}
