'use client';

import { ExplorerHeader } from '@/components/explorer/ExplorerHeader';
import { CityGrid } from '@/components/explorer/CityGrid';
import { SearchBar } from '@/components/explorer/SearchBar';
import { LoadingSkeleton } from '@/components/explorer/LoadingSkeleton';
import { ErrorState } from '@/components/explorer/ErrorState';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ExplorerPage() {
  const { data: cities, isLoading, isError, refetch } = useCities();
  const [search, setSearch] = useState('');
  const router = useRouter();

  const filtered = cities?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.nameEn?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  return (
    <div className="min-h-screen bg-[#FCFAF7]">
      <ExplorerHeader cities={cities || []} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">Khargny</h1>
          <p className="text-lg text-muted-foreground">Discover the best places in Egypt</p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <SearchBar value={search} onChange={setSearch} placeholder="Search cities..." />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message="Failed to load cities" onRetry={() => refetch()} />
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-4">Pick a city</h2>
            <CityGrid cities={filtered || []} />
          </>
        )}
      </main>
    </div>
  );
}
