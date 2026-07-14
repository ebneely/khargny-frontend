import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import type { Category, PlaceListByCategory } from '@/lib/api/types';

export const categoriesKeys = {
  all: ['categories'] as const,
  detail: (slug: string) => ['categories', slug] as const,
  places: (slug: string) => ['categories', slug, 'places'] as const,
};

/** GET /v1/categories — public list. */
export function useCategories() {
  return useQuery({
    queryKey: categoriesKeys.all,
    queryFn: () => apiRequest<Category[]>('GET', '/v1/categories'),
    staleTime: 5 * 60 * 1000,
  });
}

/** GET /v1/categories/:slug */
export function useCategory(slug: string | null | undefined) {
  return useQuery({
    queryKey: categoriesKeys.detail(slug ?? ''),
    queryFn: () => apiRequest<Category>('GET', `/v1/categories/${slug}`),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}

/** GET /v1/categories/:slug/places */
export function useCategoryPlaces(slug: string | null | undefined) {
  return useQuery({
    queryKey: categoriesKeys.places(slug ?? ''),
    queryFn: () => apiRequest<PlaceListByCategory>('GET', `/v1/categories/${slug}/places`),
    enabled: Boolean(slug),
    staleTime: 60 * 1000,
  });
}
