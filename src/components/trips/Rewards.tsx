'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/i18n/LocaleProvider';
import { tripsRequest, useErrorText, type Me, type Reward } from '@/lib/trips/api';
import s from './Trips.module.css';

/** The organizer a reward is collected from: the reward's own name, else its booking's. */
export function rewardAgency(reward: Reward, me: Me, fallback: string) {
  return reward.agencyName ?? me.bookings.find((b) => b.id === reward.sourceBookingId)?.agency.name ?? fallback;
}

/** Yes / No to "Did you receive the cash?" — used here and on the QR screen. */
export function AnswerButtons({
  reward,
  agency,
  onAnswered,
}: {
  reward: Reward;
  agency: string;
  onAnswered?: (received: boolean) => void;
}) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const queries = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const answer = async (received: boolean) => {
    setBusy(true);
    try {
      await tripsRequest('POST', `/customer/rewards/${reward.id}/answer`, { received });
      onAnswered?.(received);
      await queries.invalidateQueries({ queryKey: ['trips', 'me'] });
    } catch (failure) {
      setError(errorText(failure, t));
    }
    setBusy(false);
  };
  return (
    <div className={s.form} role="group" aria-label={t('tripsQr.question', { amount: reward.amountEgp, agency })}>
      <div className={s.row} style={{ justifyContent: 'center' }}>
        <button type="button" className={s.primary} disabled={busy} onClick={() => void answer(true)}>
          {t('tripsQr.yes')}
        </button>
        <button type="button" className={s.secondary} disabled={busy} onClick={() => void answer(false)}>
          {t('tripsQr.no')}
        </button>
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
