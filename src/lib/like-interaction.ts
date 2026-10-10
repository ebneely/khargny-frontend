import { MOTION } from './motion';

export const PHOTO_TAP_DELAY = 280;
export type TapPoint = { x: number; y: number };

export function createPhotoTap(single: () => void, double: (point: TapPoint) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let first: TapPoint | undefined;
  const cancel = () => { if (timer) clearTimeout(timer); timer = undefined; first = undefined; };
  return {
    cancel,
    tap(point: TapPoint) {
      if (timer && first && Math.hypot(point.x - first.x, point.y - first.y) < 40) {
        cancel(); double(point); return;
      }
      cancel(); first = point;
      timer = setTimeout(() => { cancel(); single(); }, PHOTO_TAP_DELAY);
    },
  };
}

export const LIKE_MILESTONES = [10, 25, 50, 100, 250, 500, 1000] as const;
export type LikeGesture = {
  phase: 'lift' | 'drop' | 'fill' | 'rest';
  kind: 'none' | 'like' | 'waiting' | 'landing' | 'drain' | 'restore' | 'squash' | 'live';
  sequence: number;
  milestone: boolean;
  delay: number;
  rayDelay: number;
};
type LiveTick = { before: number; count: number; visible: boolean; own: boolean; reduced: boolean };

export function shouldLiveTick({ before, count, visible, own, reduced }: LiveTick) {
  return count > before && visible && !own && !reduced;
}

export function createLikeGesture(change: (state: LikeGesture) => void, initialRefresh = 0) {
  let state: LikeGesture = { phase: 'rest', kind: 'none', sequence: 0, milestone: false, delay: 0, rayDelay: 0 };
  let timers: ReturnType<typeof setTimeout>[] = [];
  let lastRefresh = initialRefresh;
  let landsAt = 0;
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const update = (next: Partial<LikeGesture>) => { state = { ...state, ...next }; change(state); };
  const later = (delay: number, phase: LikeGesture['phase']) => timers.push(setTimeout(() => update({ phase, ...(phase === 'rest' ? { kind: 'none', milestone: false, delay: 0 } : {}) }), delay));
  const begin = (kind: LikeGesture['kind'], phase: LikeGesture['phase'], count: number, delay = 0) => {
    clear(); landsAt = Date.now() + delay;
    update({ kind, phase, sequence: state.sequence + 1, delay, rayDelay: delay, milestone: (kind === 'like' || kind === 'landing') && LIKE_MILESTONES.some(value => value === count) });
  };
  const tap = (liked: boolean, reduced: boolean, source: 'button' | 'photo', count: number) => {
    if (reduced) { begin('none', 'rest', count); return; }
    if (!liked) { begin('drain', 'fill', count); later(MOTION.drain, 'rest'); return; }
    if (source === 'photo') { begin('waiting', 'rest', count); return; }
    begin('like', 'lift', count, MOTION.landingAt);
    later(MOTION.lift, 'drop'); later(MOTION.landingAt, 'fill'); later(MOTION.buttonTotal, 'rest');
  };
  return {
    tap,
    arrive(already: boolean, reduced: boolean, count: number) {
      if (reduced) { begin('none', 'rest', count); return; }
      begin(already ? 'squash' : 'landing', already ? 'drop' : 'fill', count);
      later(already ? MOTION.land : MOTION.ripple, 'rest');
    },
    rollback(liked: boolean, reduced: boolean) {
      if (!liked || reduced) { tap(liked, reduced, 'button', 0); return; }
      begin('restore', 'fill', 0); later(MOTION.fill, 'rest');
    },
    live(refresh: number, tick: LiveTick) {
      if (refresh <= lastRefresh) return;
      lastRefresh = refresh;
      if (!shouldLiveTick({ ...tick, own: tick.own || !['none', 'live'].includes(state.kind) })) return;
      begin('live', 'rest', tick.count); later(MOTION.live, 'rest');
    },
    reduce() { begin('none', 'rest', 0); },
    recount(count: number) {
      if (!['like', 'landing'].includes(state.kind)) return;
      const milestone = LIKE_MILESTONES.some(value => value === count);
      if (milestone !== state.milestone) update({ milestone, rayDelay: Math.max(0, landsAt - Date.now()) });
    },
    snapshot: () => state,
    dispose: clear,
  };
}

export function socialProofKey(count: number) {
  return count === 0 ? 'place.firstLike' : count >= 3 ? 'place.likeProof' : null;
}
