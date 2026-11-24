'use client';

import { use } from 'react';
import { MapPin } from 'lucide-react';
import { useI18n } from '@/i18n/LocaleProvider';
import { useLister } from '@/lib/trips/api';
import { RatingLine, TripCard, TripsShell, VerifiedSeal, Views, useTripText } from '@/components/trips/TripsUi';
import { LikeIcon } from '@/components/ds/LikeIcon';
import { LoadingSkeleton } from '@/components/explorer/LoadingSkeleton';
import { compactCount } from '@/lib/compact-count';
import s from '@/components/trips/Trips.module.css';

export default function ListerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const { number } = useTripText();
  const lister = useLister(id);
  if (lister.isPending)
    return (
      <TripsShell active="browse">
        <LoadingSkeleton count={2} />
      </TripsShell>
    );
  if (lister.isError || !lister.data)
    return (
      <TripsShell active="browse">
        <p className={s.empty}>{t('trips.notFound')}</p>
      </TripsShell>
    );
  const { name, kind, city, verified, metrics, trips } = lister.data;
  return (
    <TripsShell active="browse">
      <header className={s.hero} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        <span className={s.avatar} style={{ width: 72, height: 72, fontSize: 'var(--text-3xl)' }} aria-hidden="true">
          {name.slice(0, 1)}
        </span>
        <div>
          <h1 className={s.h1} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            {name}
            {verified && <VerifiedSeal size={26} />}
          </h1>
          <p className={s.muted} style={{ margin: '4px 0 0' }}>
            {t(`trips.kind.${kind}`)}
            {city && (
              <>
                {' '}
                · <MapPin size={14} aria-hidden="true" /> {city}
              </>
            )}
            {verified ? ` · ${t('trips.verified')}` : ` · ${t('trips.freeListing')}`}
          </p>
        </div>
      </header>
      <section className={s.panel} aria-label={t('trips.listerMetrics')} style={{ marginBlockEnd: 'var(--space-6)' }}>
        <div className={s.metrics}>
          <span className={s.metric} role="img" aria-label={t('trips.likes', { count: metrics.likeCount })}>
            <LikeIcon size={20} />
            <span dir="ltr" aria-hidden="true">
              {compactCount(metrics.likeCount)}
            </span>
          </span>
          <Views count={metrics.viewCount} />
          <RatingLine rating={metrics.rating} count={metrics.ratingCount} />
          <span className={s.metric}>{t('trips.tripsCount', { count: number(metrics.trips) })}</span>
        </div>
      </section>
      <h2 className={s.h2}>{t('trips.listerTrips', { name })}</h2>
      {trips.length ? (
        <div className={s.grid}>
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <p className={s.empty}>{t('trips.empty')}</p>
      )}
    </TripsShell>
  );
}
