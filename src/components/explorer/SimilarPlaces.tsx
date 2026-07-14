'use client';

import type { Place } from '@/lib/api/types';
import { PlaceCard } from './PlaceCard';

interface SimilarPlacesProps {
  places: Place[];
  citySlug: string;
}

export function SimilarPlaces({ places, citySlug }: SimilarPlacesProps) {
  if (places.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Similar Places</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {places.map((place) => (
          <PlaceCard
            key={place.id}
            title={place.name}
            area={place.address || ''}
            rating={place.rating > 0 ? place.rating.toString() : undefined}
            image={undefined}
            citySlug={citySlug}
            placeSlug={place.slug}
            size="sm"
          />
        ))}
      </div>
    </section>
  );
}
