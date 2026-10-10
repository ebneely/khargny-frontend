'use client';

import { PlaceCard as PostCard } from '@/components/ds/PlaceCard';
import type { CardGallery } from '@/lib/post-gallery';

type Props = {
  image?: string | null; title: string; area: string; rating?: string; badge?: string;
  citySlug: string; placeSlug: string; favorite?: boolean; onToggleFavorite?: (saved: boolean) => void;
  size?: 'sm' | 'md'; hasMenu?: boolean; priceVerified?: boolean; visitedByUs?: boolean;
  placeId?: string; likeCount?: number; gallery?: CardGallery;
};

export function PlaceCard({ citySlug, placeSlug, image, ...props }: Props) {
  return <PostCard {...props} image={image ?? undefined} href={`/explorer/${citySlug}/${placeSlug}`} compact={props.size === 'sm'} />;
}
