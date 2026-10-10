'use client';

import { likeStore } from './likes';
import { LIKE_HEART_PATH } from '@/components/ds/LikeIcon';
import type { TapPoint } from './like-interaction';
import { MOTION, MOTION_EASING, motionProperties } from './motion';
import { reducedMotion } from './motion-client';

const flights = new Map<string, () => void>();

export function setVisitorLike(placeId: string, liked: boolean, source: 'button' | 'photo' = 'button') {
  if (!likeStore.enabled() || likeStore.blocked(placeId) || likeStore.liked(placeId) === liked) return false;
  if (!liked) flights.get(placeId)?.();
  likeStore.set(placeId, liked, { source, immediate: true });
  return true;
}

export function flightFrames(point: TapPoint, destination: TapPoint, size: number) {
  const translate = (x: number, y: number, scale: number) => `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
  const dx = destination.x - point.x;
  const dy = destination.y - point.y;
  return [{ transform: translate(0, 0, 1), opacity: 1 }, { transform: translate(dx / 2, dy / 2 - 24, (1 + size / 56) / 2), opacity: 1, offset: .5 }, { transform: translate(dx, dy, size / 56), opacity: 0 }];
}

export function dropPhotoLike(host: HTMLElement, point: TapPoint, placeId: string) {
  const already = likeStore.liked(placeId);
  if (!already && !setVisitorLike(placeId, true, 'photo')) return () => {};
  flights.get(placeId)?.();
  if (reducedMotion()) return () => {};
  const doc = host.ownerDocument;
  const buttons = () => Array.from(doc.querySelectorAll<HTMLButtonElement>('[data-like-button]')).filter(button => button.dataset.likePlaceId === placeId);
  const visible = (button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    const style = window.getComputedStyle(button);
    if (!rect.width || !rect.height || rect.left < 0 || rect.right > window.innerWidth || rect.top < 0 || rect.bottom > window.innerHeight || style.visibility === 'hidden' || style.display === 'none') return false;
    const hit = doc.elementFromPoint?.(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return !hit || button.contains(hit);
  };
  const arrive = (target?: HTMLButtonElement) => buttons().forEach(button => button.dispatchEvent(new window.CustomEvent('khg-like-land', { detail: { already, quiet: button !== target || reducedMotion() } })));
  const heart = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  heart.setAttribute('viewBox', '0 0 24 24');
  heart.setAttribute('aria-hidden', 'true');
  heart.setAttribute('data-like-flight', 'drop');
  const boundsAtTap = host.getBoundingClientRect();
  const ripple = doc.createElement('span');
  ripple.setAttribute('data-like-photo-ripple', '');
  Object.assign(ripple.style, { position: 'absolute', left: `${point.x - boundsAtTap.left}px`, top: `${point.y - boundsAtTap.top + 28}px`, width: '120px', height: '26px', background: 'var(--white)', borderRadius: '50%', pointerEvents: 'none', opacity: '0', zIndex: '5', transform: 'translate(-50%, -50%)' });
  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  for (const [key, value] of Object.entries({ d: LIKE_HEART_PATH, fill: 'var(--like-red)', stroke: 'var(--white)', 'stroke-width': '2', 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' })) path.setAttribute(key, value);
  heart.append(path); host.append(ripple);
  Object.assign(heart.style, { position: 'fixed', left: `${point.x}px`, top: `${point.y}px`, width: '56px', height: '56px', overflow: 'visible', pointerEvents: 'none', zIndex: '2147483647', transform: 'translate(-50%, -50%)' });
  for (const [key, value] of Object.entries(motionProperties())) heart.style.setProperty(key, value);
  doc.body.append(heart);
  const timers: ReturnType<typeof setTimeout>[] = [];
  const animations: Animation[] = [];
  let closed = false;
  let completed = false;
  let unsubscribe = () => {};
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const stop = () => {
    if (closed) return;
    closed = true; timers.forEach(clearTimeout); animations.forEach(animation => animation.cancel()); heart.remove(); ripple.remove(); unsubscribe();
    preference?.removeEventListener?.('change', quiet);
    doc.removeEventListener('visibilitychange', quiet);
    if (flights.get(placeId) === stop) flights.delete(placeId);
    if (!completed) arrive();
  };
  const quiet = () => { if (reducedMotion() || doc.visibilityState === 'hidden') stop(); };
  flights.set(placeId, stop);
  unsubscribe = likeStore.subscribe(() => { if (!likeStore.liked(placeId) || !likeStore.enabled()) stop(); });
  preference?.addEventListener?.('change', quiet); doc.addEventListener('visibilitychange', quiet);
  if (!heart.animate) { stop(); return stop; }
  const tilt = window.getComputedStyle(host).direction === 'rtl' ? 6 : -6;
  animations.push(heart.animate([{ transform: `translate(-50%, -50%) translateY(-28px) rotate(${tilt}deg)` }, { transform: 'translate(-50%, -50%) translateY(1px) scale(1.12,.86)', offset: MOTION.landingAt / MOTION.photoDrop }, { transform: 'translate(-50%, -50%) translateY(-.5px) scale(.99,1.02)', offset: .85 }, { transform: 'translate(-50%, -50%)' }], { duration: MOTION.photoDrop, easing: MOTION_EASING.drop, fill: 'both' }));
  animations.push(ripple.animate([{ transform: 'translate(-50%, -50%) scaleX(.6)', opacity: .35 }, { transform: 'translate(-50%, -50%) scaleX(1.6)', opacity: 0 }], { duration: MOTION.ripple, delay: MOTION.landingAt, easing: MOTION_EASING.settle, fill: 'forwards' }));
  timers.push(setTimeout(() => heart.setAttribute('data-like-flight', 'rest'), MOTION.photoDrop));
  timers.push(setTimeout(() => {
    if (!host.isConnected) { stop(); return; }
    const scoped = host.closest('[data-place-card]')?.querySelector<HTMLButtonElement>('[data-like-button]');
    const target = scoped ? visible(scoped) ? scoped : undefined : buttons().find(visible);
    const icon = target?.querySelector<SVGSVGElement>('svg');
    const rect = icon?.getBoundingClientRect();
    const bounds = host.getBoundingClientRect();
    const destination = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: point.x, y: Math.min(window.innerHeight - 28, bounds.bottom - 14) };
    heart.setAttribute('data-like-flight', target ? 'travel' : 'sink');
    animations[0]?.cancel();
    animations.push(heart.animate(flightFrames(point, destination, rect?.width ?? 24), { duration: MOTION.flight, easing: MOTION_EASING.flight, fill: 'forwards' }));
    timers.push(setTimeout(() => { completed = true; arrive(target); stop(); }, MOTION.flight));
  }, MOTION.photoDrop + MOTION.photoRest));
  return stop;
}
