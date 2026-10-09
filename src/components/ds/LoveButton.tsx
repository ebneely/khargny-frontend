'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Heart } from 'lucide-react';
import { useI18n } from '@/i18n/LocaleProvider';
import { loveStore } from '@/lib/loves';
import { compactCount } from '@/lib/compact-count';
import { Toast } from './Toast';
import styles from './LoveButton.module.css';

const serverSnapshot = () => 0;

export function LoveButton({ placeId, name, likeCount = 0 }: { placeId: string; name: string; likeCount?: number }) {
  const { t } = useI18n();
  const version = useSyncExternalStore(loveStore.subscribe, loveStore.snapshot, serverSnapshot);
  useEffect(() => {
    loveStore.seed(placeId, likeCount);
    void loveStore.start(placeId);
  }, [placeId, likeCount]);
  if (!version || !loveStore.enabled()) return null;
  const liked = loveStore.liked(placeId);
  const count = loveStore.count(placeId, likeCount);
  return (
    <button type="button" className={styles.button} aria-pressed={liked}
      aria-label={t(liked ? 'place.unloveLabel' : 'place.loveLabel', { place: name, count })}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        loveStore.set(placeId, !loveStore.liked(placeId));
      }}>
      <Heart size={18} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
      {count > 0 && <span dir="ltr" aria-hidden="true">{compactCount(count)}</span>}
    </button>
  );
}

export function LoveFeedback() {
  const { t, locale } = useI18n();
  const version = useSyncExternalStore(loveStore.subscribe, loveStore.snapshot, serverSnapshot);
  const feedback = version ? loveStore.feedback() : null;
  if (!feedback) return null;
  const wording = feedback.kind === 'rate' ? 'place.loveRateLimit' : feedback.kind === 'busy' ? 'place.loveBusy' : 'place.loveUnavailable';
  const agreement = feedback.seconds === 0 ? 'zero' : new Intl.PluralRules(locale).select(feedback.seconds);
  const delay = t(`place.loveRetryDelay.${agreement}`, { seconds: feedback.seconds });
  return <Toast message={t(wording, { delay })} tone="error" onDismiss={loveStore.dismiss} />;
}
