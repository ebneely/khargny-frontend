'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { useI18n } from '@/i18n/LocaleProvider';
import { likeStore } from '@/lib/likes';
import { setVisitorLike } from '@/lib/like-effects';
import { createLikeGesture, socialProofKey, type LikeGesture } from '@/lib/like-interaction';
import { motionProperties } from '@/lib/motion';
import { useMotionVisibility, useReducedMotion } from '@/lib/motion-client';
import { usePressFeedback } from '@/lib/use-press-feedback';
import { WaterHeart } from './WaterHeart';
import { Toast } from './Toast';
import { RollingCount } from './RollingCount';
import styles from './LikeButton.module.css';
import dropStyles from './DropMotion.module.css';

const serverSnapshot = () => 0;
const horizonRays = Array.from({ length: 8 }, (_, index) => {
  const angle = index * Math.PI / 7;
  return `M${18 + Math.cos(angle) * 11} ${19 - Math.sin(angle) * 11}L${18 + Math.cos(angle) * 16} ${19 - Math.sin(angle) * 16}`;
}).join(' ');

export function LikeButton({ placeId, name, likeCount = 0, detail = false, rail = false }: { placeId: string; name: string; likeCount?: number; detail?: boolean; rail?: boolean }) {
  const { t, locale } = useI18n();
  const version = useSyncExternalStore(likeStore.subscribe, likeStore.snapshot, serverSnapshot);
  const press = usePressFeedback();
  const control = useRef<HTMLButtonElement>(null);
  const [motion, setMotion] = useState<LikeGesture>({ phase: 'rest', kind: 'none', sequence: 0, milestone: false, delay: 0, rayDelay: 0 });
  const [observedAction, setObservedAction] = useState(() => likeStore.action(placeId)?.sequence);
  const gesture = useRef<ReturnType<typeof createLikeGesture> | null>(null);
  if (gesture.current === null) { gesture.current = createLikeGesture(setMotion, likeStore.refreshSignal(placeId)?.sequence); }
  const previous = useRef({ sequence: likeStore.action(placeId)?.sequence, liked: likeStore.liked(placeId) });
  const reduced = useReducedMotion();
  const initialized = Boolean(version);
  const visible = useMotionVisibility(control, initialized);
  const count = likeStore.count(placeId, likeCount);
  const action = likeStore.action(placeId);
  const held = Boolean(action && action.sequence !== observedAction);
  const awaitingAnswer = Boolean(action && !likeStore.settled(placeId));
  const countHeld = awaitingAnswer || (!reduced && (held || motion.kind === 'waiting' || motion.kind === 'drain' || (motion.kind === 'like' && motion.phase !== 'fill' && motion.phase !== 'rest')));
  const [displayedCount, setDisplayedCount] = useState(count);
  if (!countHeld && displayedCount !== count) setDisplayedCount(count);
  useLayoutEffect(() => {
    const action = likeStore.action(placeId);
    const liked = likeStore.liked(placeId);
    if (action?.sequence !== previous.current.sequence && action) {
      setObservedAction(action.sequence);
      gesture.current?.tap(action.liked, reduced, action.source, likeStore.count(placeId));
    } else if (action && liked !== previous.current.liked && liked !== action.liked) {
      gesture.current?.rollback(liked, reduced);
    }
    previous.current = { sequence: action?.sequence, liked };
    if (action?.count !== undefined) gesture.current?.recount(action.count);
    const refresh = likeStore.refreshSignal(placeId);
    if (refresh) gesture.current?.live(refresh.sequence, { ...refresh, visible, own: false, reduced });
  }, [placeId, version, reduced, visible]);
  useEffect(() => {
    const button = control.current;
    const land = (event: Event) => {
      const { already, quiet } = (event as CustomEvent<{ already: boolean; quiet: boolean }>).detail;
      if (likeStore.liked(placeId)) gesture.current?.arrive(already, reduced || quiet, likeStore.count(placeId));
    };
    button?.addEventListener('khg-like-land', land);
    return () => button?.removeEventListener('khg-like-land', land);
  }, [placeId, initialized, reduced]);
  useEffect(() => { if (reduced) gesture.current?.reduce(); }, [reduced]);
  useEffect(() => () => gesture.current?.dispose(), []);
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
  const offscreenRefresh = motion.kind === 'none' && likeStore.refreshSignal(placeId)?.count === count && !visible;
  const agreement = displayedCount === 0 ? 'zero' : new Intl.PluralRules(locale).select(displayedCount);
  return (
    <button {...press} ref={control} type="button" data-like-button data-like-place-id={placeId} data-like-phase={motion.phase} data-like-gesture={motion.kind} data-detail={detail || undefined} data-rail={rail || undefined} className={styles.button} style={{ ...motionProperties(), '--drop-turn': locale === 'ar' ? '6deg' : '-6deg' } as CSSProperties} aria-pressed={liked}
      aria-busy={!likeStore.enabled() || !likeStore.settled(placeId)} aria-disabled={likeStore.blocked(placeId)}
      aria-label={t(liked ? 'place.unlikeLabel' : 'place.likeLabel', { place: name, likes: t(`place.likeCount.${agreement}`, { count: displayedCount }) })}
      onClick={event => { press.onClick(); event.preventDefault(); event.stopPropagation(); setVisitorLike(placeId, !likeStore.liked(placeId)); }}>
      <span className={styles.icon}>
        <WaterHeart filled={liked} motion={motion} reduced={reduced} held={held} size={detail ? 28 : 24} />
        {['like', 'landing'].includes(motion.kind) && !reduced && (motion.milestone ?
          <svg key={motion.sequence} className={dropStyles.rays} viewBox="0 0 36 20" aria-hidden="true" style={{ animationDelay: `${motion.rayDelay}ms` }}><path d={horizonRays} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" /></svg> :
          <span key={motion.sequence} className={dropStyles.ground} style={{ animationDelay: `${motion.delay}ms` }} />)}
      </span>
      {rail && <span className={styles.word} aria-hidden="true">{t(liked ? 'place.liked' : 'place.like')}</span>}
      <RollingCount count={displayedCount} className={styles.count} quiet={reduced || motion.kind === 'waiting' || offscreenRefresh} />
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
