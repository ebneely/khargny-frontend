'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, ShieldCheck, Star } from 'lucide-react';
import { useI18n } from '@/i18n/LocaleProvider';
import { tripsRequest, useErrorText, type Booking, type Message } from '@/lib/trips/api';
import { TripsShell, useCustomer, useTripText } from '@/components/trips/TripsUi';
import { LoadingSkeleton } from '@/components/explorer/LoadingSkeleton';
import s from '@/components/trips/Trips.module.css';

export default function MyTripsPage() {
  const { t } = useI18n();
  const { href } = useTripText();
  const me = useCustomer();
  if (!me.data?.profile)
    return (
      <TripsShell active="mine">
        <LoadingSkeleton count={2} />
      </TripsShell>
    );
  const bookings = [...me.data.bookings].sort((a, b) =>
    a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === 'booked' ? -1 : 1,
  );
  return (
    <TripsShell active="mine">
      <h1 className={s.h1}>{t('tripsMe.title')}</h1>
      {!bookings.length ? (
        <div className={s.empty}>
          <p>{t('tripsMe.empty')}</p>
          <Link href={href('/trips')} className={s.primary}>
            {t('tripsMe.browse')}
          </Link>
        </div>
      ) : (
        <div className={s.stack} style={{ marginBlockStart: 'var(--space-5)' }}>
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </TripsShell>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const { t } = useI18n();
  const { href, title, longDate, price, number } = useTripText();
  const errorText = useErrorText();
  const queries = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const cancel = async () => {
    try {
      await tripsRequest('POST', `/customer/bookings/${booking.id}/cancel`);
      await queries.invalidateQueries({ queryKey: ['trips'] });
    } catch (failure) {
      setError(errorText(failure, t));
    }
    setConfirming(false);
  };
  const live = booking.status === 'booked';
  return (
    <article className={`${s.panel} ${s.form}`} data-booking={booking.id} aria-label={title(booking.trip)}>
      <div className={s.bookingHead}>
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <Link
            href={href(`/trips/${booking.trip.id}`)}
            style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'inherit' }}
          >
            {title(booking.trip)}
          </Link>
          <span className={s.muted}>
            {booking.trip.destination} · {longDate(booking.trip.startsAt)}
          </span>
          <span className={s.muted}>
            {booking.agency.name} · {t('tripsMe.seats', { count: number(booking.seats) })} ·{' '}
            {price(booking.trip.priceEgp * booking.seats)}
          </span>
        </div>
        <span className={s.status} data-status={booking.status}>
          {t(live ? 'tripsMe.booked' : 'tripsMe.cancelled')}
        </span>
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {live && (
        <div className={s.row}>
          <button
            type="button"
            className={`${s.secondary} ${s.small}`}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <MessageCircle size={16} aria-hidden="true" />
            {t(open ? 'tripsMe.hideMessages' : 'tripsMe.messages')}
          </button>
          {!confirming ? (
            <button type="button" className={`${s.danger} ${s.small}`} onClick={() => setConfirming(true)}>
              {t('tripsMe.cancel')}
            </button>
          ) : (
            <span className={s.row} role="group" aria-label={t('tripsMe.cancelConfirm')}>
              <span>{t('tripsMe.cancelConfirm')}</span>
              <button type="button" className={`${s.danger} ${s.small}`} onClick={() => void cancel()}>
                {t('tripsMe.cancelYes')}
              </button>
              <button type="button" className={`${s.secondary} ${s.small}`} onClick={() => setConfirming(false)}>
                {t('tripsMe.cancelNo')}
              </button>
            </span>
          )}
        </div>
      )}
      {live && open && <Thread bookingId={booking.id} />}
      {live && <RateBox booking={booking} />}
    </article>
  );
}

function Thread({ bookingId }: { bookingId: string }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const messages = useQuery({
    queryKey: ['trips', 'messages', bookingId],
    queryFn: () => tripsRequest<Message[]>('GET', `/customer/bookings/${bookingId}/messages`),
    refetchInterval: 5000,
  });
  const count = messages.data?.length ?? 0;
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [count]);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setError('');
    try {
      await tripsRequest('POST', `/customer/bookings/${bookingId}/messages`, { body });
      setBody('');
      await messages.refetch();
    } catch (failure) {
      setError(errorText(failure, t));
    }
  };
  return (
    <section className={s.form} aria-label={t('tripsMe.messages')}>
      <p className={s.note}>
        <ShieldCheck size={16} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--success)' }} />
        {t('tripsMe.messagesNote')}
      </p>
      <div className={s.thread} ref={list} role="log" aria-live="polite">
        {!count ? (
          <p className={s.muted} style={{ margin: 0 }}>
            {t('tripsMe.noMessages')}
          </p>
        ) : (
          messages.data!.map((message) => (
            <p
              key={message.id}
              className={s.bubble}
              data-mine={message.sender === 'customer' || undefined}
              style={{ margin: 0 }}
            >
              {message.body}
            </p>
          ))
        )}
      </div>
      <form className={s.row} onSubmit={send}>
        <input
          className={s.input}
          style={{ flex: 1 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('tripsMe.messagePlaceholder')}
          aria-label={t('tripsMe.messagePlaceholder')}
          maxLength={2000}
        />
        <button type="submit" className={`${s.primary} ${s.small}`}>
          {t('tripsMe.send')}
        </button>
      </form>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function RateBox({ booking }: { booking: Booking }) {
  const { t } = useI18n();
  const { date } = useTripText();
  const errorText = useErrorText();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<{ done?: boolean; error?: string }>({});
  if (new Date(booking.trip.startsAt) > new Date())
    return (
      <p className={s.note}>
        <Star size={16} aria-hidden="true" />
        {t('tripsMe.rateAfter', { date: date(booking.trip.startsAt) })}
      </p>
    );
  if (state.done)
    return (
      <p className={s.success} role="status">
        {t('tripsMe.rated')}
      </p>
    );
  return (
    <form
      className={s.form}
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await tripsRequest('POST', `/customer/bookings/${booking.id}/rating`, {
            stars,
            ...(comment.trim() ? { comment } : {}),
          });
          setState({ done: true });
        } catch (failure) {
          setState({ error: errorText(failure, t) });
        }
      }}
    >
      <strong>{t('tripsMe.rate')}</strong>
      <span className={s.starPick} role="radiogroup" aria-label={t('tripsMe.rate')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === stars}
            aria-label={t('tripsMe.stars', { count: n })}
            onClick={() => setStars(n)}
          >
            <Star size={28} aria-hidden="true" fill={n <= stars ? 'currentColor' : 'none'} />
          </button>
        ))}
      </span>
      <textarea
        className={s.textarea}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('tripsMe.commentPlaceholder')}
        aria-label={t('tripsMe.commentPlaceholder')}
        maxLength={1000}
      />
      {state.error && (
        <p className={s.error} role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className={`${s.primary} ${s.small}`} disabled={!stars}>
        {t('tripsMe.rateSend')}
      </button>
    </form>
  );
}
