'use client';

import Link from 'next/link';
import type { City } from '@/lib/api/types';

interface CityGridProps {
  cities: City[];
}

export function CityGrid({ cities }: CityGridProps) {
  if (cities.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">No cities available yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {cities.map((city) => (
        <Link
          key={city.id}
          href={`/explorer/${city.slug}`}
          className="group block p-6 rounded-xl bg-card border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)]"
        >
          <h3 className="font-semibold text-lg text-foreground group-hover:text-orange-600 transition-colors">
            {city.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Explore places
          </p>
        </Link>
      ))}
    </div>
  );
}
