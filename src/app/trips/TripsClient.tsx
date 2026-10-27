'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';
import { useI18n } from '@/i18n/LocaleProvider';
import { saveInvite, useTrips, useTripsToken } from '@/lib/trips/api';
import { TripCard, TripsShell, useTripText } from '@/components/trips/TripsUi';
import { LoadingSkeleton } from '@/components/explorer/LoadingSkeleton';
import { ErrorState } from '@/components/explorer/ErrorState';
import s from '@/components/trips/Trips.module.css';

export function TripsClient() {
  const { t } = useI18n();
  const { href, number } = useTripText();
  const params = useSearchParams();
  const invite = params.get('invite');
  const token = useTripsToken();
  const [kind, setKind] = useState('');
  const [verified, setVerified] = useState(false);
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQ(typed.trim()), 250);
    return () => clearTimeout(timer);
  }, [typed]);
  useEffect(() => {
    if (invite) saveInvite(invite);
  }, [invite]);
  const trips = useTrips({ kind, level: verified ? 'monitored' : '', q });

  return (
    <TripsShell active="browse">
      <header className={s.hero}>
        <h1 className={s.h1}>{t('trips.hero')}</h1>
        <p className={s.lead}>{t('trips.heroSub')}</p>
      </header>
      {invite && token === null && (
        <p className={s.success} style={{ marginBlockEnd: 'var(--space-6)' }}>
          {t('trips.invited')}{' '}
          <Link href={`${href('/trips/sign-in')}?mode=up&invite=${encodeURIComponent(invite)}`}>
            {t('trips.invitedCta')}
          </Link>
        </p>
      )}
      <div className={s.filters} role="group" aria-label={t('trips.filters')}>
        <div className={s.segment}>
          {(
            [
              ['', 'trips.kindAll'],
              ['trip', 'trips.kindTrip'],
              ['event', 'trips.kindEvent'],
            ] as const
          ).map(([value, key]) => (
            <button key={key} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>
              {t(key)}
            </button>
          ))}
        </div>
        <button type="button" className={s.toggle} aria-pressed={verified} onClick={() => setVerified((v) => !v)}>
          <BadgeCheck size={18} aria-hidden="true" />
          {t('trips.verifiedOnly')}
        </button>
        <input
          className={s.search}
          type="search"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={t('trips.search')}
          aria-label={t('trips.search')}
        />
      </div>
      {trips.isPending ? (
        <LoadingSkeleton />
      ) : trips.isError ? (
        <ErrorState message={t('errors.loadFailed')} onRetry={() => void trips.refetch()} />
      ) : (
        <>
          <p className={s.muted} role="status" style={{ marginBlockEnd: 'var(--space-3)' }}>
            {t('trips.results', { count: number(trips.data.length) })}
          </p>
          {trips.data.length ? (
            <div className={s.grid}>
              {trips.data.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          ) : (
            <p className={s.empty}>{t('trips.empty')}</p>
          )}
        </>
      )}
    </TripsShell>
  );
}
