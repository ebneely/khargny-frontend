'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@apollo/client/react';
import { GET_CITIES } from '@/graphql/queries';

interface CitySelectorProps {
  onCitySelect: (city: string) => void;
  selectedCity: string | null;
}

export function CitySelector({ onCitySelect, selectedCity }: CitySelectorProps) {
  const { data, loading, error } = useQuery<{ cities: string[] }>(GET_CITIES);

  if (error) {
    return <div className="text-sm text-red-500">Error loading cities</div>;
  }

  return (
    <Select
      value={selectedCity || undefined}
      onValueChange={onCitySelect}
      disabled={loading}
    >
      <SelectTrigger className="w-[200px] h-9">
        <SelectValue placeholder={loading ? 'Loading...' : 'Select city'} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] overflow-y-auto">
        {data?.cities?.map((city: string) => (
          <SelectItem key={city} value={city}>
            {city}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
