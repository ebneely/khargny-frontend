'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useI18n } from '@/i18n/LocaleProvider';
import { likeStore } from '@/lib/likes';
import { reducedLikeMotion, setVisitorLike } from '@/lib/like-effects';
import { likeMotion, socialProofKey } from '@/lib/like-interaction';
import { LikeIcon } from './LikeIcon';
import { Toast } from './Toast';
import { RollingCount } from './RollingCount';
import styles from './LikeButton.module.css';

const serverSnapshot = () => 0;

export function LikeButton({ placeId, name, likeCount = 0, detail = false, rail = false }: { placeId: string; name: string; likeCount?: number; detail?: boolean; rail?: boolean }) {
  const { t, locale } = useI18n();
  const version = useSyncExternalStore(likeStore.subscribe, likeStore.snapshot, serverSnapshot);
  const control = useRef<HTMLButtonElement>(null);
  const action = likeStore.action(placeId);
  const [motion, setMotion] = useState({ sequence: action?.sequence, kind: '' });
  const initialized = Boolean(version);
  if (motion.sequence !== action?.sequence) setMotion({ sequence: action?.sequence, kind: action ? likeMotion(reducedLikeMotion(), !action.liked, action.liked, true) : '' });
  useEffect(() => {
    likeStore.seed(placeId, likeCount);
    void likeStore.start(placeId);
    let visible = true;
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); }, { rootMargin: '200px' });
    if (control.current) observer?.observe(control.current);
    const release = likeStore.watch(placeId, detail, () => visible);
    return () => { observer?.disconnect(); release(); };
  }, [placeId, likeCount, detail, initialized]);
  if (!version || !likeStore.visible()) return null;
  const liked = likeStore.liked(placeId);
  const count = likeStore.count(placeId, likeCount);
  const agreement = count === 0 ? 'zero' : new Intl.PluralRules(locale).select(count);
  return (
    <button ref={control} type="button" data-like-button data-like-motion={motion.kind || undefined} data-detail={detail || undefined} data-rail={rail || undefined} className={styles.button} aria-pressed={liked}
      aria-busy={!likeStore.enabled() || !likeStore.settled(placeId)} aria-disabled={likeStore.blocked(placeId)}
      aria-label={t(liked ? 'place.unlikeLabel' : 'place.likeLabel', { place: name, likes: t(`place.likeCount.${agreement}`, { count }) })}
      onClick={event => { event.preventDefault(); event.stopPropagation(); setVisitorLike(placeId, !likeStore.liked(placeId)); }}>
      <span key={motion.sequence} className={`${styles.icon} ${motion.kind ? styles[motion.kind] : ''}`} onAnimationEnd={() => setMotion(previous => ({ ...previous, kind: '' }))}>
        <LikeIcon size={detail ? 28 : 24} filled={liked} />
        {motion.kind === 'celebrate' && <><span className={styles.ring} />{Array.from({ length: 6 }, (_, index) => <span key={index} className={styles.particle} style={{ '--angle': `${index * 60}deg` } as React.CSSProperties} />)}</>}
      </span>
      {rail && <span className={styles.word} aria-hidden="true">{t(liked ? 'place.liked' : 'place.like')}</span>}
      <RollingCount count={count} className={styles.count} />
    </button>
  );
}

export function LikeSocialProof({ placeId }: { placeId: string }) {
  const { t } = useI18n();
  const version = useSyncExternalStore(likeStore.subscribe, likeStore.snapshot, serverSnapshot);
  const count = likeStore.count(placeId);
  const key = version && likeStore.enabled() && likeStore.hasCount(placeId) ? socialProofKey(count) : null;
  return <p data-like-proof className={styles.proof}>
    <span className={styles.proofDesktop}>{key ? t(key, { count }) : '\u00a0'}</span>
    <span className={styles.proofPhone}>{key ? t(key === 'place.likeProof' ? 'place.likeProofQuiet' : key) : '\u00a0'}</span>
  </p>;
}

export function LikeFeedback() {
  const { t, locale } = useI18n();
  const version = useSyncExternalStore(likeStore.subscribe, likeStore.snapshot, serverSnapshot);
  const feedback = version ? likeStore.feedback() : null;
  if (!feedback) return null;
  const wording = feedback.kind === 'rate' ? 'place.likeRateLimit' : feedback.kind === 'busy' ? 'place.likeBusy' : 'place.likeUnavailable';
  const agreement = feedback.seconds === 0 ? 'zero' : new Intl.PluralRules(locale).select(feedback.seconds);
  const delay = t(`place.likeRetryDelay.${agreement}`, { seconds: feedback.seconds });
  return <Toast message={t(wording, { delay })} tone="error" onDismiss={likeStore.dismiss} />;
}
