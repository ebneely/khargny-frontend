'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Banknote, Copy, QrCode, Share2, Users } from 'lucide-react';
import { useI18n } from '@/i18n/LocaleProvider';
import type { Me, Reward } from '@/lib/trips/api';
import { AnswerButtons, rewardAgency } from '@/components/trips/Rewards';
import { TripsShell, useCustomer, useTripText } from '@/components/trips/TripsUi';
import { LoadingSkeleton } from '@/components/explorer/LoadingSkeleton';
import s from '@/components/trips/Trips.module.css';

export default function MyCashPage() {
  const { t } = useI18n();
  const { href } = useTripText();
  const me = useCustomer();
  if (!me.data?.profile)
    return (
      <TripsShell active="cash">
        <LoadingSkeleton count={2} />
      </TripsShell>
    );
  const data = me.data;
  return (
    <TripsShell active="cash">
      <h1 className={s.h1}>{t('tripsCash.title')}</h1>
      <p className={s.lead} style={{ marginBlockEnd: 'var(--space-5)' }}>
        {t('tripsCash.sub')}
      </p>
      <Link
        href={href('/trips/qr')}
        className={`${s.primary} ${s.wide}`}
        style={{ minHeight: 60, fontSize: 'var(--text-lg)', marginBlockEnd: 'var(--space-6)' }}
      >
        <QrCode size={24} aria-hidden="true" />
        {t('tripsCash.showQr')}
      </Link>
      {!data.rewards.length ? (
        <p className={s.empty}>{t('tripsCash.empty')}</p>
      ) : (
        <div className={s.stack}>
          {data.rewards.map((reward) => (
            <RewardCard key={reward.id} reward={reward} me={data} />
          ))}
        </div>
      )}
      {data.invites && <Invite invites={data.invites} />}
    </TripsShell>
  );
}

function RewardCard({ reward, me }: { reward: Reward; me: Me }) {
  const { t } = useI18n();
  const { number } = useTripText();
  const agency = rewardAgency(reward, me, t('tripsCash.anyOrganizer'));
  return (
    <article className={`${s.panel} ${s.form}`} data-reward={reward.id} data-reward-status={reward.status}>
      <div className={s.bookingHead}>
        <span className={s.rewardAmount}>{t('trips.price', { price: number(reward.amountEgp) })}</span>
        <span className={s.status} data-status={reward.status}>
          {t(`tripsCash.kind.${reward.kind}`)}
        </span>
      </div>
      <p style={{ margin: 0 }}>
        {t(`tripsCash.status.${reward.status}`, { agency, amount: number(reward.amountEgp) })}
      </p>
      {reward.status === 'cash_given' && <AnswerButtons reward={reward} agency={agency} />}
    </article>
  );
}

function Invite({ invites }: { invites: NonNullable<Me['invites']> }) {
  const { t, locale } = useI18n();
  const { number } = useTripText();
  const [copied, setCopied] = useState(false);
  const link = `${typeof window === 'undefined' ? '' : window.location.origin}/${locale}/trips/?invite=${encodeURIComponent(invites.code)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <section className={`${s.panel} ${s.form} ${s.section}`} aria-labelledby="invite-title">
      <h2 className={s.h2} id="invite-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Users size={22} aria-hidden="true" />
        {t('tripsCash.invite')}
      </h2>
      <p className={s.muted} style={{ margin: 0 }}>
        {t('tripsCash.inviteSub')}
      </p>
      <div>
        <span className={s.muted}>{t('tripsCash.code')}</span>
        <div className={s.codeBox} dir="ltr" data-invite-code>
          {invites.code}
        </div>
      </div>
      <div>
        <span className={s.muted}>{t('tripsCash.link')}</span>
        <p className={s.linkBox} dir="ltr" data-invite-link style={{ margin: '4px 0 0' }}>
          {link}
        </p>
      </div>
      <div className={s.row}>
        <button type="button" className={`${s.secondary} ${s.small}`} onClick={() => void copy()}>
          <Copy size={16} aria-hidden="true" />
          {t(copied ? 'tripsCash.copied' : 'tripsCash.copy')}
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            className={`${s.secondary} ${s.small}`}
            onClick={() => void navigator.share({ url: link, text: t('trips.invited') }).catch(() => {})}
          >
            <Share2 size={16} aria-hidden="true" />
            {t('tripsCash.share')}
          </button>
        )}
      </div>
      <div className={s.metrics}>
        <span className={s.metric}>
          <Users size={18} aria-hidden="true" />
          {t('tripsCash.friends', { count: number(invites.friendsJoined), cap: number(invites.cap) })}
        </span>
        <span className={s.metric}>
          <Banknote size={18} aria-hidden="true" />
          {t('tripsCash.earned', { count: number(invites.rewardsEarned) })}
        </span>
      </div>
    </section>
  );
}
