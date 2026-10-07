'use client';

import Link from 'next/link';
import { Heart, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaceBadges } from '@/components/ds/PlaceBadges';
import { PhotoImage } from '@/components/ds/PhotoImage';

interface PlaceCardProps {
  image?: string | null;
  title: string;
  area: string;
  rating?: string;
  badge?: string;
  citySlug: string;
  placeSlug: string;
  favorite?: boolean;
  onToggleFavorite?: (saved: boolean) => void;
  size?: 'sm' | 'md';
  hasMenu?: boolean;
  priceVerified?: boolean;
  visitedByUs?: boolean;
}

export function PlaceCard({
  image,
  title,
  area,
  rating,
  badge: badgeText,
  citySlug,
  placeSlug,
  favorite = false,
  onToggleFavorite,
  size = 'md',
  hasMenu,
  priceVerified,
  visitedByUs,
}: PlaceCardProps) {
  const width = size === 'sm' ? 'w-[260px]' : 'w-[300px]';

  return (
    <div className={`${width} shrink-0 group relative`}>
    <Link href={`/explorer/${citySlug}/${placeSlug}`} className="khg-place-card-link block">
      <Card className="overflow-hidden border-0 shadow-none group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)] bg-card">
        <div className="relative aspect-square overflow-hidden">
          <PhotoImage photo={image} alt={title} frame="card" sizes={size === 'sm' ? 'auto, 260px' : 'auto, 300px'} />
          {badgeText && (
            <Badge variant="secondary" className="absolute top-2 start-2 bg-gray-100/90 text-gray-700 text-xs">
              {badgeText}
            </Badge>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-base leading-tight text-foreground line-clamp-1">{title}</h3>
          {rating && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm text-muted-foreground">{rating}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{area}</p>
          <div className="mt-1">
            <PlaceBadges hasMenu={hasMenu} priceVerified={priceVerified} visitedByUs={visitedByUs} variant="compact" />
          </div>
        </div>
      </Card>
    </Link>
    {onToggleFavorite && (
      <Button
        variant="ghost"
        size="icon"
        className="khg-heart-tap absolute top-2 end-2 bg-white/80 hover:bg-white rounded-full w-8 h-8"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleFavorite(!favorite);
        }}
      >
        <Heart className="w-4 h-4" fill={favorite ? 'var(--brand-600)' : 'none'} stroke={favorite ? 'var(--brand-600)' : 'var(--gray-700)'} aria-hidden="true" />
      </Button>
    )}
    </div>
  );
}
