'use client';

import { likeStore } from './likes';
import { LIKE_HEART_PATH } from '@/components/ds/LikeIcon';
import type { TapPoint } from './like-interaction';

export const reducedLikeMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export function setVisitorLike(placeId: string, liked: boolean) {
  if (!likeStore.enabled() || likeStore.blocked(placeId) || likeStore.liked(placeId) === liked) return;
  likeStore.set(placeId, liked);
  if (liked && typeof navigator !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches && typeof navigator.vibrate === 'function') navigator.vibrate(10);
}

export function burstLike(host: HTMLElement, point: TapPoint) {
  if (reducedLikeMotion()) return;
  const bounds = host.getBoundingClientRect();
  const heart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  heart.setAttribute('viewBox', '0 0 24 24');
  heart.setAttribute('aria-hidden', 'true');
  heart.setAttribute('data-like-burst', '');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', LIKE_HEART_PATH); heart.append(path);
  Object.assign(heart.style, { position: 'absolute', left: `${point.x - bounds.left}px`, top: `${point.y - bounds.top}px`, width: '88px', height: '88px', fill: 'var(--white)', filter: 'drop-shadow(0 2px 8px var(--gray-700))', pointerEvents: 'none', zIndex: '5', opacity: '0' });
  host.append(heart);
  const animation = heart.animate([
    { transform: 'translate(-50%, -50%) scale(.2) rotate(-12deg)', opacity: 0 },
    { transform: 'translate(-50%, -50%) scale(1.15) rotate(0deg)', opacity: 1, offset: .3 },
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: .65 },
    { transform: 'translate(-50%, -65%) scale(1.1)', opacity: 0 },
  ], { duration: 800, easing: 'ease-out' });
  animation.finished.then(() => heart.remove(), () => heart.remove());
}
