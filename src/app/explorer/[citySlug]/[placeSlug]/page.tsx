'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Globe, Instagram, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageGallery } from '@/components/explorer/ImageGallery';
import { HoursTable } from '@/components/explorer/HoursTable';
import { SimilarPlaces } from '@/components/explorer/SimilarPlaces';
import { LoadingSkeleton } from '@/components/explorer/LoadingSkeleton';
import { ErrorState } from '@/components/explorer/ErrorState';
import { NotFoundState } from '@/components/explorer/NotFoundState';
import { usePlace, useSimilarPlaces } from '@/lib/api/hooks/use-places';
import { useCities } from '@/lib/api/hooks/use-cities';

function PlaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const citySlug = params.citySlug as string;
  const placeSlug = params.placeSlug as string;

  const { data: place, isLoading, isError, error, refetch } = usePlace(placeSlug);
  const { data: similar } = useSimilarPlaces(place?.id ?? null);
  const { data: cities } = useCities();

  const currentCity = cities?.find((c) => c.slug === citySlug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FCFAF7]">
        <LoadingSkeleton variant="detail" />
      </div>
    );
  }

  if (isError) {
    if (error && 'status' in error && (error as { status: number }).status === 404) {
      return (
        <div className="min-h-screen bg-[#FCFAF7]">
          <NotFoundState
            backHref={`/explorer/${citySlug}`}
            backLabel={`Back to ${currentCity?.name || 'places'}`}
          />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#FCFAF7]">
        <ErrorState message="Failed to load place" onRetry={() => refetch()} />
      </div>
    );
  }

  if (!place) return null;

  const hasContact =
    place.address || place.phone || place.website || place.instagram || place.facebook;
  const priceSymbols = place.priceRange ? '₹'.repeat(Math.min(place.priceRange, 5)) : null;

  return (
    <div className="min-h-screen bg-[#FCFAF7]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <nav className="text-sm text-muted-foreground flex items-center gap-2">
            <button onClick={() => router.push('/explorer')} className="hover:text-foreground">
              Home
            </button>
            <span>/</span>
            <button
              onClick={() => router.push(`/explorer/${citySlug}`)}
              className="hover:text-foreground"
            >
              {currentCity?.name || citySlug}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Gallery */}
        <ImageGallery
          images={(place as any).images?.map((img: any) => ({ url: img.url, alt: img.alt })) || []}
        />

        {/* Name + rating + price */}
        <div>
          <div className="flex items-start justify-between">
            <h1 className="text-3xl font-bold text-foreground">{place.name}</h1>
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{place.rating > 0 ? place.rating.toFixed(1) : '—'}</span>
            </div>
          </div>
          {priceSymbols && (
            <span className="text-sm text-muted-foreground">{priceSymbols}</span>
          )}
        </div>

        {/* Contact info */}
        {hasContact && (
          <div className="space-y-3">
            {place.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{place.address}</span>
              </div>
            )}
            {place.phone && (
              <a href={`tel:${place.phone}`} className="flex items-center gap-2 text-sm hover:text-orange-600">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{place.phone}</span>
              </a>
            )}
            {place.website && (
              <a href={place.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-orange-600">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{place.website}</span>
              </a>
            )}
            {place.instagram && (
              <a href={`https://instagram.com/${place.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-orange-600">
                <Instagram className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{place.instagram}</span>
              </a>
            )}
          </div>
        )}

        {/* Description */}
        {place.description && (
          <section>
            <h2 className="text-lg font-semibold mb-2">About</h2>
            <p className="text-muted-foreground leading-relaxed">{place.description}</p>
          </section>
        )}

        {/* Opening Hours */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Opening Hours</h2>
          <HoursTable hours={[]} />
          <p className="text-xs text-muted-foreground mt-1">
            Hours data not available from API yet
          </p>
        </section>

        {/* Similar Places */}
        {similar && similar.length > 0 && (
          <SimilarPlaces places={similar} citySlug={citySlug} />
        )}
      </main>
    </div>
  );
}

export default PlaceDetailPage;
