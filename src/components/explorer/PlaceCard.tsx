'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Star, ImageOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

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
}: PlaceCardProps) {
  const [imgError, setImgError] = useState(false);
  const width = size === 'sm' ? 'w-[260px]' : 'w-[300px]';

  return (
    <Link href={`/explorer/${citySlug}/${placeSlug}`} className={`${width} shrink-0 group`}>
      <Card className="overflow-hidden border-0 shadow-none group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)] bg-card">
        <div className="relative aspect-square overflow-hidden">
          {image && !imgError ? (
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-250"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <ImageOff className="w-8 h-8 text-white/60" />
            </div>
          )}
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full w-8 h-8"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(!favorite);
              }}
            >
              <Heart className={`w-4 h-4 ${favorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
            </Button>
          )}
          {badgeText && (
            <Badge variant="secondary" className="absolute top-2 left-2 bg-gray-100/90 text-gray-700 text-xs">
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
        </div>
      </Card>
    </Link>
  );
}
