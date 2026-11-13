'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { renderSVG } from 'uqr';
import { CheckCircle2, Info } from 'lucide-react';
import { useI18n } from '@/i18n/LocaleProvider';
import { tripsRequest } from '@/lib/trips/api';
import { AnswerButtons, rewardAgency } from '@/components/trips/Rewards';
import { TripsShell, useCustomer, useTripText } from '@/components/trips/TripsUi';
import s from '@/components/trips/Trips.module.css';

type Qr = { token: string; expiresAt: string; refreshSeconds: number };

export default function QrPage() {
  const { t } = useI18n();
  const { href, number } = useTripText();
  const me = useCustomer(3000); // the organizer's "Cash given" shows up here within 3 s
  const qr = useQuery({
    queryKey: ['trips', 'qr'],
    queryFn: () => tripsRequest<Qr>('GET', '/customer/qr'),
    enabled: Boolean(me.data?.profile),
    gcTime: 0,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const total = qr.data?.refreshSeconds ?? 30;
  const left = qr.data ? Math.max(0, Math.ceil((Date.parse(qr.data.expiresAt) - now) / 1000)) : total;
  const refetching = useRef(false);
  useEffect(() => {
    if (!qr.data || left > 0 || refetching.current) return;
    refetching.current = true;
    void qr.refetch().finally(() => {
      refetching.current = false;
    });
  }, [left, qr]);
  const svg = useMemo(() => (qr.data ? renderSVG(qr.data.token, { border: 1 }) : ''), [qr.data]);

  // The question stays open for the reward the visitor is answering, even after `me` moves on.
  const [answered, setAnswered] = useState<{ id: string; received: boolean; agency: string } | null>(null);
  const pending = me.data?.rewards.find((reward) => reward.status === 'cash_given');

  if (!me.data?.profile)
    return (
      <TripsShell active="cash">
        <p className={s.empty}>…</p>
      </TripsShell>
    );
  const agencyOf = (reward: NonNullable<typeof pending>) => rewardAgency(reward, me.data!, t('tripsCash.anyOrganizer'));
  const circumference = 2 * Math.PI * 24;

  return (
    <TripsShell active="cash">
      <div className={s.qrScreen}>
        <h1 className={s.h1} style={{ margin: 0 }}>
          {t('tripsQr.title')}
        </h1>
        <p className={s.lead}>{t('tripsQr.hint')}</p>
        <div
          className={s.qrBox}
          role="img"
          aria-label={t('tripsQr.title')}
          data-qr-token={qr.data?.token}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className={s.row} style={{ justifyContent: 'center' }} aria-live="off">
          <span className={s.ring} aria-hidden="true">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="var(--gray-200)" strokeWidth="4" />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="var(--brand-600)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - left / total)}
                style={{ transition: 'stroke-dashoffset 250ms linear' }}
              />
            </svg>
            <output>{number(left)}</output>
          </span>
          <span className={s.muted} data-qr-countdown>
            {t('tripsQr.refresh', { seconds: number(left) })}
          </span>
        </div>
        <Link href={href('/trips/cash')} className={`${s.secondary} ${s.small}`}>
          {t('tripsQr.back')}
        </Link>
      </div>

      {(pending || answered) && (
        <div className={s.scrim}>
          <div className={s.sheet} role="dialog" aria-modal="true" aria-labelledby="cash-question">
            {answered ? (
              <>
                {answered.received ? (
                  <CheckCircle2 size={48} style={{ margin: '0 auto', color: 'var(--success)' }} aria-hidden="true" />
                ) : (
                  <Info size={48} style={{ margin: '0 auto', color: 'var(--warning)' }} aria-hidden="true" />
                )}
                <h2 className={s.h2} id="cash-question" style={{ margin: 0 }}>
                  {t(answered.received ? 'tripsQr.confirmed' : 'tripsQr.disputed', { agency: answered.agency })}
                </h2>
                <button type="button" className={`${s.primary} ${s.wide}`} onClick={() => setAnswered(null)} autoFocus>
                  {t('tripsQr.done')}
                </button>
              </>
            ) : (
              pending && (
                <>
                  <h2 className={s.h2} id="cash-question" style={{ margin: 0 }}>
                    {t('tripsQr.question', { amount: number(pending.amountEgp), agency: agencyOf(pending) })}
                  </h2>
                  <AnswerButtons
                    reward={pending}
                    agency={agencyOf(pending)}
                    onAnswered={(received) => setAnswered({ id: pending.id, received, agency: agencyOf(pending) })}
                  />
                </>
              )
            )}
          </div>
        </div>
      )}
    </TripsShell>
  );
}
