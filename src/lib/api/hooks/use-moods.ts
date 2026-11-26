'use client';
// The dashboard's moods (GET /v1/moods), the same list the app's Mood dropdown shows: slug, names, icon, accent token.
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

export type Mood = { slug: string; name: string; nameEn: string; nameAr: string; icon: string; accent: string; sort: number };

/** Every mood in the dashboard's order; [] until it answers or when the call fails (the pill then shows "Mood"). */
export function useMoods(): Mood[] {
  return useQuery({
    queryKey: ['moods'], staleTime: 10 * 60_000, retry: false,
    queryFn: async () => {
      const raw = await apiRequest<unknown>('GET', '/v1/moods').catch(() => null);
      const list = Array.isArray(raw) ? raw : (raw as { data?: unknown } | null)?.data;
      return Array.isArray(list) ? (list as Mood[]).filter((m) => m && m.slug) : [];
    },
  }).data ?? [];
}
