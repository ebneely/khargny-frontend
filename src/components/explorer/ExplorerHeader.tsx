'use client';

import Link from 'next/link';
import { Globe } from 'lucide-react';
import { CitySelector } from './CitySelector';
import type { City } from '@/lib/api/types';

interface ExplorerHeaderProps {
  cities: City[];
  currentCitySlug?: string;
  onCityChange?: (slug: string) => void;
}

export function ExplorerHeader({ cities, currentCitySlug, onCityChange }: ExplorerHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <Link href="/explorer" className="font-bold text-xl text-orange-700">
        Khargny
      </Link>
      <div className="flex items-center gap-3">
        <CitySelector
          cities={cities}
          currentCitySlug={currentCitySlug}
          onChange={onCityChange}
        />
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Language">
          <Globe className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
