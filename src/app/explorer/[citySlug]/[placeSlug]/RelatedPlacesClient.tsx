'use client';

import { useSimilarPlaces } from '@/lib/api/hooks/use-places';
import { SimilarPlaces } from '@/components/explorer/SimilarPlaces';

export function RelatedPlacesClient({ id, citySlug }: { id: string; citySlug: string }) {
  const { data } = useSimilarPlaces(id);
  return data?.length ? <SimilarPlaces places={data} citySlug={citySlug} /> : null;
}
