'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  Flag,
  MapPin,
  Navigation,
  Star,
} from 'lucide-react';
import { useI18n } from '@/i18n/LocaleProvider';
import {
  coverSrc,
  tripsRequest,
  useErrorText,
  useMe,
  useRatings,
  useTrip,
  type Reward,
  type Trip,
} from '@/lib/trips/api';
import {
  CashBadge,
  ListerName,
  RatingLine,
  TripLike,
  TripsShell,
  VerifiedSeal,
  Views,
  useTripText,
} from '@/components/trips/TripsUi';
import { LoadingSkeleton } from '@/components/explorer/LoadingSkeleton';
import s from '@/components/trips/Trips.module.css';

const viewed = new Set<string>();

export function TripClient({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { href, title, date, longDate } = useTripText();
  const trip = useTrip(id);
  useEffect(() => {
    if (viewed.has(id)) return;
    viewed.add(id); // once per page open, even under React's dev double-effects
    void tripsRequest('POST', `/trips/${encodeURIComponent(id)}/view`).catch(() => {});
  }, [id]);
  const Back = locale === 'ar' ? ArrowRight : ArrowLeft;

  if (trip.isPending)
    return (
      <TripsShell active="browse">
        <LoadingSkeleton count={2} />
      </TripsShell>
    );
  if (trip.isError || !trip.data)
    return (
      <TripsShell active="browse">
        <p className={s.empty}>{t('trips.notFound')}</p>
      </TripsShell>
    );
  const data = trip.data;
  const cover = coverSrc(data);
  const includes = (data.includes ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const disclaimer = data.disclaimer?.[locale] ?? null;

  return (
    <TripsShell active="browse">
      <Link
        href={href('/trips')}
        className={s.muted}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBlockEnd: 'var(--space-4)' }}
      >
        <Back size={16} aria-hidden="true" />
        {t('trips.tabs.browse')}
      </Link>
      <div className={s.detail}>
        <div>
          <div className={s.heroPhoto}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {cover && <img src={cover} alt={title(data)} />}
          </div>
          <h1 className={s.h1} style={{ marginBlockStart: 'var(--space-5)' }}>
            {title(data)}
          </h1>
          <div className={s.facts}>
            <span className={s.fact}>
              <MapPin size={16} aria-hidden="true" />
              {data.destination}
            </span>
            <span className={s.fact}>
              <Navigation size={16} aria-hidden="true" />
              {t('trips.from', { city: data.departureCity })}
            </span>
            <span className={s.fact}>
              <CalendarDays size={16} aria-hidden="true" />
              {longDate(data.startsAt)} – {date(data.endsAt)}
            </span>
            <span className={s.fact}>
              <ListerName agency={data.agency} />
            </span>
            {!data.monitored && <span className={s.freeLabel}>{t('trips.freeListing')}</span>}
          </div>
          <div className={s.metrics}>
            <TripLike trip={data} />
            <Views count={data.viewCount} />
            <RatingLine rating={data.rating} count={data.ratingCount} />
          </div>

          {disclaimer && (
            <div className={s.disclaimer} role="note" data-disclaimer style={{ marginBlockStart: 'var(--space-5)' }}>
              <AlertTriangle size={22} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--warning)' }} />
              <div>
                <strong>{t('trips.disclaimerTitle')}</strong>
                <p>{disclaimer}</p>
              </div>
            </div>
          )}
          {data.monitored && !!data.earlyBird && (
            <div className={s.cashPanel} style={{ marginBlockStart: 'var(--space-5)' }}>
              <Banknote size={24} aria-hidden="true" />
              <CashBadge trip={data} />
            </div>
          )}

          {data.description && (
            <section className={s.section}>
              <h2 className={s.h2}>{t('trips.about')}</h2>
              <p className={s.body}>{data.description}</p>
            </section>
          )}
          {includes.length > 0 && (
            <section className={s.section}>
              <h2 className={s.h2}>{t('trips.includes')}</h2>
              <ul className={s.list}>
                {includes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          )}

          <section className={s.section}>
            <h2 className={s.h2}>{t('trips.organizer')}</h2>
            <Link
              href={href(`/trips/listers/${data.agency.id}`)}
              className={`${s.panel} ${s.listerCard}`}
              aria-label={`${t('trips.organizerPage')}: ${data.agency.name}`}
            >
              <span className={s.avatar} aria-hidden="true">
                {data.agency.name.slice(0, 1)}
              </span>
              <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  {data.agency.name}
                  {data.agency.verified && <VerifiedSeal size={18} />}
                </span>
                <span className={s.muted}>
                  {t(`trips.kind.${data.agency.kind}`)}
                  {data.agency.verified ? ` · ${t('trips.verified')}` : ''}
                </span>
                <span className={s.metrics}>
                  <RatingLine rating={data.agency.rating} count={data.agency.ratingCount} />
                </span>
              </span>
            </Link>
          </section>

          <Reviews id={id} />
          <Report trip={data} />
        </div>
        <aside className={s.aside}>
          <BookPanel trip={data} />
        </aside>
      </div>
    </TripsShell>
  );
}

function Reviews({ id }: { id: string }) {
  const { t } = useI18n();
  const { date } = useTripText();
  const ratings = useRatings(id);
  return (
    <section className={s.section} aria-labelledby="trip-reviews">
      <h2 className={s.h2} id="trip-reviews">
        {t('trips.reviews')}
      </h2>
      {!ratings.data?.length ? (
        <p className={s.muted}>{t('trips.noRatings')}</p>
      ) : (
        ratings.data.map((review) => (
          <article key={review.id} className={s.review}>
            <div className={s.row}>
              <strong>{review.name}</strong>
              <span className={s.stars} role="img" aria-label={t('tripsMe.stars', { count: review.stars })}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={14} aria-hidden="true" fill={i < review.stars ? 'currentColor' : 'none'} />
                ))}
              </span>
              <span className={s.muted}>{date(review.createdAt)}</span>
            </div>
            {review.comment && (
              <p className={s.body} style={{ marginBlockStart: 4 }}>
                {review.comment}
              </p>
            )}
          </article>
        ))
      )}
    </section>
  );
}

function useSignInGate() {
  const router = useRouter();
  const { href } = useTripText();
  return () => router.push(`${href('/trips/sign-in')}?next=${encodeURIComponent(window.location.pathname)}`);
}

function BookPanel({ trip }: { trip: Trip }) {
  const { t } = useI18n();
  const { price, href, number } = useTripText();
  const errorText = useErrorText();
  const me = useMe();
  const queries = useQueryClient();
  const signIn = useSignInGate();
  const [seats, setSeats] = useState(1);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ seats: number; reward: Reward | null } | null>(null);
  const max = Math.min(trip.seatsLeft, 10);
  const free = !trip.monitored;

  const book = async () => {
    setError('');
    if (!me.token || me.isError) return signIn();
    if (me.data && !me.data.profile) return signIn();
    if (free && !accepted) return setError(t('trips.tickRequired'));
    setBusy(true);
    try {
      const answer = await tripsRequest<{ booking: { seats: number }; reward: Reward | null }>(
        'POST',
        '/customer/bookings',
        { tripId: trip.id, seats, ...(free ? { acceptDisclaimer: true } : {}) },
      );
      setDone({ seats: answer.booking.seats, reward: answer.reward });
      void queries.invalidateQueries({ queryKey: ['trips'] });
    } catch (failure) {
      setError(errorText(failure, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.panel} data-book-panel>
      <div className={s.price} style={{ fontSize: 'var(--text-3xl)' }}>
        {price(trip.priceEgp)}
      </div>
      <p className={s.seats} data-low={trip.seatsLeft <= 3 || undefined} style={{ margin: '4px 0 var(--space-4)' }}>
        {trip.seatsLeft > 0 ? t('trips.seatsLeft', { count: number(trip.seatsLeft) }) : t('trips.full')}
      </p>
      {done ? (
        <div className={s.form}>
          <p className={s.success} role="status">
            {t('trips.booked', { count: done.seats })}
          </p>
          {done.reward && (
            <p className={s.cashPanel} style={{ margin: 0 }}>
              <Banknote size={22} aria-hidden="true" />
              {t('trips.bookedReward', { agency: trip.agency.name })}
            </p>
          )}
          <Link href={href(done.reward ? '/trips/cash' : '/trips/me')} className={`${s.secondary} ${s.wide}`}>
            {t(done.reward ? 'tripsCash.showQr' : 'trips.seeMyTrips')}
          </Link>
        </div>
      ) : (
        trip.seatsLeft > 0 && (
          <form
            className={s.form}
            onSubmit={(event) => {
              event.preventDefault();
              void book();
            }}
          >
            <div className={s.row} style={{ justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }} id="seats-label">
                {t('trips.seats')}
              </span>
              <span className={s.stepper} role="group" aria-labelledby="seats-label">
                <button
                  type="button"
                  aria-label={t('trips.fewer')}
                  disabled={seats <= 1}
                  onClick={() => setSeats(seats - 1)}
                >
                  −
                </button>
                <output aria-live="polite">{seats}</output>
                <button
                  type="button"
                  aria-label={t('trips.more')}
                  disabled={seats >= max}
                  onClick={() => setSeats(seats + 1)}
                >
                  +
                </button>
              </span>
            </div>
            <p className={s.muted} style={{ margin: 0 }}>
              {t('trips.total', { price: number(trip.priceEgp * seats) })}
            </p>
            {free && (
              <label className={s.check}>
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => {
                    setAccepted(e.target.checked);
                    setError('');
                  }}
                />
                <span>{t('trips.acceptDisclaimer')}</span>
              </label>
            )}
            {error && (
              <p className={s.error} role="alert">
                {error}
              </p>
            )}
            <button type="submit" className={`${s.primary} ${s.wide}`} disabled={busy}>
              {me.token ? t('trips.book') : t('trips.signInToBook')}
            </button>
          </form>
        )
      )}
    </div>
  );
}

function Report({ trip }: { trip: Trip }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const me = useMe();
  const signIn = useSignInGate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<{ sent?: boolean; error?: string }>({});
  if (state.sent)
    return (
      <p className={s.success} role="status" style={{ marginBlockStart: 'var(--space-6)' }}>
        {t('trips.reportSent')}
      </p>
    );
  return (
    <section className={s.section}>
      {!open ? (
        <button
          type="button"
          className={`${s.secondary} ${s.small}`}
          onClick={() => (me.token ? setOpen(true) : signIn())}
        >
          <Flag size={16} aria-hidden="true" />
          {t('trips.report')}
        </button>
      ) : (
        <form
          className={`${s.panel} ${s.form}`}
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await tripsRequest('POST', `/customer/trips/${trip.id}/report`, { reason });
              setState({ sent: true });
            } catch (failure) {
              setState({ error: errorText(failure, t) });
            }
          }}
        >
          <label className={s.field}>
            {t('trips.reportReason')}
            <textarea
              className={s.textarea}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={1000}
            />
          </label>
          {state.error && (
            <p className={s.error} role="alert">
              {state.error}
            </p>
          )}
          <div className={s.row}>
            <button type="submit" className={`${s.primary} ${s.small}`}>
              {t('trips.reportSend')}
            </button>
            <button type="button" className={`${s.secondary} ${s.small}`} onClick={() => setOpen(false)}>
              {t('trips.cancel')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
