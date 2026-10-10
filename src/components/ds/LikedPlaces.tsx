'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { likeStore } from '@/lib/likes';
import { likedList, likedListAvailable } from '@/lib/liked-list';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { regionLabel } from '@/lib/egypt-regions';
import { displayName } from '@/lib/display-name';
import { useI18n } from '@/i18n/LocaleProvider';
import { PlaceCard } from './PlaceCard';

const serverSnapshot = () => 0;

export function LikedPlaces() {
  const { t, locale } = useI18n();
  useSyncExternalStore(likedList.subscribe, likedList.snapshot, serverSnapshot);
  const likeVersion = useSyncExternalStore(likeStore.subscribe, likeStore.snapshot, serverSnapshot);
  const { data: cities } = useCities();
  const { data: categories } = useCategories();
  const state = likedList.state();
  useEffect(() => {
    if (likedListAvailable()) { likedList.reset(); void likedList.load(); }
  }, []);
  const places = state.places.filter(place => !likeStore.enabled() || likeStore.liked(place.id));
  useEffect(() => {
    if (state.places[0]) void likeStore.start(state.places[0].id);
    if (!likeStore.enabled()) return;
    state.places.forEach(place => { if (!likeStore.liked(place.id) && likeStore.settled(place.id)) likedList.remove(place.id); });
  }, [likeVersion, state.places]);
  if (likeStore.off()) return <p>{t('place.likeUnavailable')}</p>;
  return <section data-liked-list aria-label={t('plan.liked')}>
    <div className="khg-place-grid">{places.map((place, index) => <PlaceCard key={place.id} placeId={place.id} likeCount={place.likeCount} gallery={place.gallery} priority={index === 0} title={displayName(place, locale)} image={place.coverImage ?? undefined} area={regionLabel(place.region, locale, cities?.find(city => city.id === place.cityId)?.nameEn ?? place.cityId)} category={categories?.find(category => category.id === place.categoryId)?.[locale === 'ar' ? 'nameAr' : 'nameEn'] || categories?.find(category => category.id === place.categoryId)?.nameAr}
      href={`/explorer/${cities?.find(city => city.id === place.cityId)?.slug ?? place.cityId}/${place.slug}`} hasMenu={place.hasMenu} priceVerified={place.priceVerified} visitedByUs={place.visitedByUs} metrics={{ saves: place.saveCount, directions: place.directionsCount, views: place.viewCount }} />)}</div>
    {!state.loading && !state.error && !places.length && <div><h2>{t('plan.likedEmptyTitle')}</h2><p>{t('plan.likedEmpty')}</p><Link href={`/${locale}/explorer/`}>{t('plan.startExploring')}</Link></div>}
    {state.error && <p role="alert">{t('errors.loadFailed')}</p>}
    {(state.hasMore || state.error) && <button type="button" disabled={state.loading} aria-busy={state.loading} onClick={() => { if (likedListAvailable()) void likedList.load(); }} style={{ minHeight: 44, paddingInline: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', background: 'var(--surface-card)' }}>{state.error ? t('errors.tryAgain') : state.loading ? t('common.loading') : t('plan.moreLiked')}</button>}
  </section>;
}
