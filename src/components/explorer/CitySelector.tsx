'use client';

import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { City } from '@/lib/api/types';

interface CitySelectorProps {
  cities: City[];
  currentCitySlug?: string;
  onChange?: (slug: string) => void;
}

export function CitySelector({ cities, currentCitySlug, onChange }: CitySelectorProps) {
  const currentCity = cities.find((c) => c.slug === currentCitySlug);

  return (
    <Select
      value={currentCitySlug || ''}
      onValueChange={(slug) => onChange?.(slug)}
    >
      <SelectTrigger className="w-[160px] h-9 rounded-full border-border bg-background text-sm">
        <SelectValue placeholder={currentCity?.name || 'Pick a city'} />
      </SelectTrigger>
      <SelectContent>
        {cities.map((city) => (
          <SelectItem key={city.id} value={city.slug}>
            {city.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
