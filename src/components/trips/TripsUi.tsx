'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Eye, MapPin, Star } from 'lucide-react';
import { useI18n } from '@/i18n/LocaleProvider';
import { SiteHeader } from '@/components/ds/SiteHeader';
import { LikeIcon } from '@/components/ds/LikeIcon';
import { compactCount } from '@/lib/compact-count';
import { tripsRequest, coverSrc, useMe, useTripsToken, type Trip } from '@/lib/trips/api';
import card from '@/components/ds/PostCard.module.css';
import s from './Trips.module.css';

/** Seal path: a 12-point rosette (r 11 / 9.4) around a check. Same shape in the Expo app. */
export const SEAL_PATH =
  'M12 1L14.43 2.92L17.5 2.47L18.65 5.35L21.53 6.5L21.08 9.57L23 12L21.08 14.43L21.53 17.5L18.65 18.65L17.5 21.53L14.43 21.08L12 23L9.57 21.08L6.5 21.53L5.35 18.65L2.47 17.5L2.92 14.43L1 12L2.92 9.57L2.47 6.5L5.35 5.35L6.5 2.47L9.57 2.92Z';
export const SEAL_CHECK = 'M7.6 12.3l3 3 5.9-6.2';

export function VerifiedSeal({ size = 18 }: { size?: number }) {
  const { t } = useI18n();
  return (
    <svg
      className={s.seal}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={t('trips.verified')}
      data-verified-seal
    >
      <title>{t('trips.verified')}</title>
      <path d={SEAL_PATH} fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={SEAL_CHECK} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function useTripText() {
  const { locale, t } = useI18n();
  const tag = locale === 'ar' ? 'ar-EG' : 'en-GB';
  return {
    href: (path: string) => `/${locale}${path.replace(/\/?$/, '/')}`,
    title: (trip: Pick<Trip, 'title' | 'titleEn'>) => (locale === 'en' && trip.titleEn ? trip.titleEn : trip.title),
    price: (value: number) => t('trips.price', { price: new Intl.NumberFormat(tag).format(value) }),
    number: (value: number) => new Intl.NumberFormat(tag).format(value),
    date: (iso: string) => new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short' }).format(new Date(iso)),
    longDate: (iso: string) =>
      new Intl.DateTimeFormat(tag, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(iso)),
  };
}

export function TripsShell({
  active,
  children,
}: {
  active?: 'browse' | 'mine' | 'cash' | 'account';
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { href } = useTripText();
  const token = useTripsToken();
  const tabs = token ? (['browse', 'mine', 'cash'] as const) : (['browse', 'account'] as const);
  const paths = { browse: '/trips', mine: '/trips/me', cash: '/trips/cash', account: '/trips/sign-in' };
  return (
    <div className={s.page}>
      <SiteHeader active="trips" />
      <main className={s.main}>
        <nav className={s.tabs} aria-label={t('trips.nav')}>
          {tabs.map((tab) => (
            <Link
              key={tab}
              href={href(paths[tab])}
              className={s.tab}
              aria-current={active === tab ? 'page' : undefined}
            >
              {t(`trips.tabs.${tab}`)}
            </Link>
          ))}
        </nav>
        {children}
      </main>
    </div>
  );
}

/** One heart per visitor (guest cookie), optimistic, rolled back if the server refuses. */
export function TripLike({ trip }: { trip: Pick<Trip, 'id' | 'liked' | 'likeCount' | 'title' | 'titleEn'> }) {
  const { t } = useI18n();
  const { title } = useTripText();
  const [state, setState] = useState({ id: trip.id, liked: trip.liked, count: trip.likeCount, pop: 0 });
  if (state.id !== trip.id) setState({ id: trip.id, liked: trip.liked, count: trip.likeCount, pop: 0 });
  const toggle = async () => {
    const before = state;
    const liked = !before.liked;
    setState({
      ...before,
      liked,
      count: Math.max(0, before.count + (liked ? 1 : -1)),
      pop: liked ? before.pop + 1 : before.pop,
    });
    try {
      const answer = await tripsRequest<{ liked: boolean; likeCount: number }>(
        liked ? 'POST' : 'DELETE',
        `/trips/${trip.id}/like`,
      );
      setState((now) => ({ ...now, liked: answer.liked, count: answer.likeCount }));
    } catch {
      setState(before);
    }
  };
  return (
    <button
      type="button"
      className={s.like}
      aria-pressed={state.liked}
      aria-label={t(state.liked ? 'trips.unlikeLabel' : 'trips.likeLabel', { trip: title(trip) })}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggle();
      }}
    >
      <span key={state.pop} data-pop={state.pop || undefined} className={s.heart}>
        <LikeIcon filled={state.liked} size={24} />
      </span>
      <span dir="ltr" data-like-count>
        {compactCount(state.count)}
      </span>
    </button>
  );
}

export function RatingLine({ rating, count }: { rating: number | null; count: number }) {
  const { t } = useI18n();
  if (!count || rating === null)
    return (
      <span className={s.metric}>
        <Star size={18} aria-hidden="true" />
        {t('trips.noRatings')}
      </span>
    );
  return (
    <span className={s.metric} role="img" aria-label={t('trips.rating', { rating: rating.toFixed(1), count })}>
      <Star size={18} aria-hidden="true" fill="currentColor" style={{ color: 'var(--warning)' }} />
      <span dir="ltr" aria-hidden="true">
        {rating.toFixed(1)} ({count})
      </span>
    </span>
  );
}

export function Views({ count }: { count: number }) {
  const { t } = useI18n();
  return (
    <span className={s.metric} role="img" aria-label={t('trips.views', { count })}>
      <Eye size={20} aria-hidden="true" />
      <span dir="ltr" aria-hidden="true">
        {compactCount(count)}
      </span>
    </span>
  );
}

export function CashBadge({ trip }: { trip: Pick<Trip, 'monitored' | 'earlyBird'> }) {
  const { t } = useI18n();
  const { number } = useTripText();
  if (!trip.monitored || !trip.earlyBird) return null;
  return (
    <span className={s.cash} data-cash-badge>
      {t('trips.earlyBird', { count: number(trip.earlyBird) })}
    </span>
  );
}

export function ListerName({ agency }: { agency: Trip['agency'] }) {
  return (
    <span className={s.lister}>
      <span>{agency.name}</span>
      {agency.verified && <VerifiedSeal size={16} />}
    </span>
  );
}

export function TripCard({ trip }: { trip: Trip }) {
  const { t } = useI18n();
  const { href, title, price, date, number } = useTripText();
  const link = href(`/trips/${trip.id}`);
  const cover = coverSrc(trip);
  return (
    <article className={card.card} data-trip-card data-level={trip.level}>
      <Link href={link} className={s.cover} aria-hidden="true" tabIndex={-1}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover && <img src={cover} alt="" loading="lazy" />}
        <span className={s.coverBadges}>
          <span className={s.kindLabel}>{t(trip.kind === 'event' ? 'trips.kindEvent' : 'trips.kindTrip')}</span>
          <CashBadge trip={trip} />
        </span>
      </Link>
      <div className={card.actions}>
        <TripLike trip={trip} />
        <Views count={trip.viewCount} />
        <RatingLine rating={trip.rating} count={trip.ratingCount} />
      </div>
      <Link href={link} className={card.words}>
        <span className={card.title} data-trip-title>
          {title(trip)}
        </span>
        <span className={card.meta}>
          <MapPin size={14} aria-hidden="true" />
          {trip.destination} · <CalendarDays size={14} aria-hidden="true" />
          {date(trip.startsAt)} – {date(trip.endsAt)}
        </span>
        <span className={card.meta}>
          <ListerName agency={trip.agency} />
          {!trip.monitored && <span className={s.freeLabel}>{t('trips.freeListing')}</span>}
        </span>
      </Link>
      <div className={s.priceLine}>
        <span className={s.price}>{price(trip.priceEgp)}</span>
        <span className={s.seats} data-low={trip.seatsLeft <= 3 || undefined}>
          {trip.seatsLeft > 0 ? t('trips.seatsLeft', { count: number(trip.seatsLeft) }) : t('trips.full')}
        </span>
      </div>
    </article>
  );
}

/** Sends a signed-out visitor (or one without a profile) to sign-in, then back here. */
export function useCustomer(refetchInterval?: number) {
  const me = useMe(refetchInterval);
  const router = useRouter();
  const { href } = useTripText();
  const missing = me.token === null || (me.data && !me.data.profile) || me.isError;
  useEffect(() => {
    if (missing) router.replace(`${href('/trips/sign-in')}?next=${encodeURIComponent(window.location.pathname)}`);
  }, [missing, router, href]);
  return me;
}
