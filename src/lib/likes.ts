'use client';

import { apiRequest } from '@/lib/api/client';

type LikeState = { liked: boolean; likeCount: number; degraded?: boolean };
type Mine = { data: string[]; meta: { skip: number; limit: number; has_more: boolean }; degraded?: boolean };
type Feedback = { kind: 'rate' | 'busy' | 'unavailable'; seconds: number };
type Entry = { liked: boolean; count: number; intended: boolean; revision: number; writing: boolean; timer?: ReturnType<typeof setTimeout>; retryAt: number };
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const OFF_KEY = 'khg-loves-off';

export function createLikeStore(request: typeof apiRequest = apiRequest, storage?: Storage) {
  const entries = new Map<string, Entry>();
  const likedIds = new Set<string>();
  const probes = new Set<string>();
  const listeners = new Set<() => void>();
  let status: 'unknown' | 'on' | 'off' = 'unknown';
  let version = 0;
  let startup: Promise<void> | undefined;
  let message: Feedback | null = null;
  let refreshPending: Promise<void> | undefined;
  let refreshRetryAt = 0;
  let refreshFailures = 0;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  const watches = new Set<{ id: string; interval: number; visible: () => boolean }>();
  const updated = new Map<string, number>();
  const publicCounts = new Set<string>();
  const actions = new Map<string, { sequence: number; liked: boolean }>();
  const readRetryDelay = (error: unknown) => {
    const seconds = (error as { retryAfter?: number }).retryAfter;
    return Math.max(seconds ?? 0, Math.min(120, Math.max(1, seconds ?? 20) * 2 ** (refreshFailures - 1))) * 1000;
  };
  const emit = () => { version++; listeners.forEach(listener => listener()); };
  const browserStorage = () => storage ?? (typeof window === 'undefined' ? undefined : window.sessionStorage);
  const entry = (placeId: string, count = 0) => {
    let current = entries.get(placeId);
    if (!current) {
      const liked = likedIds.has(placeId);
      current = { liked, intended: liked, count, revision: 0, writing: false, retryAt: 0 };
      entries.set(placeId, current);
    }
    return current;
  };
  const off = () => {
    status = 'off';
    if (pollTimer) clearTimeout(pollTimer);
    entries.forEach(current => { if (current.timer) clearTimeout(current.timer); });
    try { browserStorage()?.setItem(OFF_KEY, '1'); } catch {}
    emit();
  };
  const refuse = (error: unknown, current?: Entry) => {
    const failure = error as { status?: number; code?: string; retryAfter?: number };
    if (failure.code === 'likes_disabled') { off(); return; }
    const seconds = failure.retryAfter ?? (failure.status === 503 ? 2 : failure.status === 429 ? 60 : 0);
    if (current) current.retryAt = Date.now() + seconds * 1000;
    if (current && seconds) setTimeout(() => { if (status === 'on') emit(); }, seconds * 1000);
    message = { kind: failure.status === 429 ? 'rate' : failure.status === 503 ? 'busy' : 'unavailable', seconds };
  };
  const schedule = (placeId: string, current: Entry) => {
    if (current.timer) clearTimeout(current.timer);
    if (current.writing || current.intended === current.liked || status !== 'on') return;
    current.timer = setTimeout(() => { current.timer = undefined; void write(placeId, current); }, Math.max(150, current.retryAt - Date.now()));
  };
  const write = async (placeId: string, current: Entry) => {
    if (status !== 'on' || current.writing || current.intended === current.liked) return;
    const intended = current.intended;
    const revision = current.revision;
    current.writing = true;
    try {
      const send = (state: boolean) => request<LikeState>(state ? 'PUT' : 'DELETE', `/v1/places/${encodeURIComponent(placeId)}/like`, { headers: { 'X-Client-Platform': 'web' } });
      let answer: LikeState;
      try { answer = await send(intended); }
      catch (error) {
        const failure = error as { status?: number; code?: string };
        if (failure.status !== 503 || failure.code !== 'likes_unavailable') throw error;
        await prepare(false);
        if (status !== 'on' || current.intended === current.liked) return;
        answer = await send(current.intended);
      }
      if (status !== 'on') return;
      current.liked = answer.liked;
      current.count = Math.max(0, answer.likeCount);
      publicCounts.add(placeId);
      updated.set(placeId, Date.now());
      if (answer.liked) likedIds.add(placeId); else likedIds.delete(placeId);
      if (current.revision === revision) current.intended = answer.liked;
      current.revision++;
    } catch (error) {
      refuse(error, current);
      current.intended = current.liked;
    } finally {
      current.writing = false;
      emit();
      schedule(placeId, current);
    }
  };

  const prepare = async (apply: boolean) => {
    const ids = new Set<string>();
    let skip = 0;
    for (;;) {
      const result = await request<Mine>('GET', '/v1/likes/mine', { params: { fields: 'ids', limit: 100, skip } });
      if (result.degraded) throw { status: 503, code: 'likes_unavailable', retryAfter: 2 };
      result.data.forEach(identifier => ids.add(identifier));
      if (!result.meta.has_more) break;
      skip += 100;
    }
    if (apply) {
      likedIds.clear(); ids.forEach(identifier => likedIds.add(identifier));
      entries.forEach((current, identifier) => { current.liked = current.intended = likedIds.has(identifier); });
    }
  };
  const available = () => typeof window === 'undefined' || (window.document?.visibilityState !== 'hidden' && window.navigator?.onLine !== false);
  const refresh = (identifiers: string[]): Promise<void> => {
    if (status !== 'on' || !available() || Date.now() < refreshRetryAt || !identifiers.length) return Promise.resolve();
    if (refreshPending) return refreshPending;
    const ids = [...new Set(identifiers)].slice(0, 100);
    const revisions = new Map(ids.map(identifier => [identifier, entries.get(identifier)?.revision ?? 0]));
    refreshPending = (async () => {
      try {
        const states = await request<Record<string, LikeState>>('GET', '/v1/likes/state', { params: { placeIds: ids.join(',') } });
        if (status !== 'on') return;
        if (!Object.keys(states).length) { off(); return; }
        for (const [identifier, state] of Object.entries(states)) {
          const current = entry(identifier, state.likeCount);
          updated.set(identifier, Date.now());
          if (state.degraded || current.writing || current.timer || current.revision !== revisions.get(identifier)) continue;
          current.count = Math.max(0, state.likeCount);
          publicCounts.add(identifier);
          current.liked = current.intended = state.liked;
          if (state.liked) likedIds.add(identifier); else likedIds.delete(identifier);
        }
        refreshFailures = 0; refreshRetryAt = 0; emit();
      } catch (error) {
        if ((error as { code?: string }).code === 'likes_disabled') { off(); return; }
        refreshFailures++;
        refreshRetryAt = Date.now() + readRetryDelay(error);
      } finally { refreshPending = undefined; }
    })();
    return refreshPending;
  };
  const poll = () => {
    if (pollTimer) clearTimeout(pollTimer);
    if (!watches.size || status === 'off') return;
    pollTimer = setTimeout(async () => {
      const due = [...watches].filter(watch => watch.visible() && (status === 'unknown' || Date.now() - (updated.get(watch.id) ?? 0) >= watch.interval));
      if (status === 'unknown' && available() && due[0] && !startup) await store.start(due[0].id);
      else await refresh(due.map(watch => watch.id));
      poll();
    }, available() ? Math.max(1000, status === 'unknown' ? 1000 : Math.min(...[...watches].filter(watch => watch.visible()).map(watch => Math.max(1000, watch.interval - (Date.now() - (updated.get(watch.id) ?? 0)))), 20000), refreshRetryAt - Date.now()) : 20000);
  };

  const store = {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => version,
    enabled: () => status === 'on',
    visible: () => status === 'on' || (status === 'unknown' && refreshFailures > 0),
    off: () => { try { return status === 'off' || browserStorage()?.getItem(OFF_KEY) === '1'; } catch { return status === 'off'; } },
    settled: (placeId: string) => !entries.get(placeId)?.writing && !entries.get(placeId)?.timer,
    blocked: (placeId: string) => status !== 'on' || !available() || Date.now() < (entries.get(placeId)?.retryAt ?? 0),
    refresh,
    watch(placeId: string, detail: boolean, visible: () => boolean) {
      const watch = { id: placeId, interval: detail ? 10000 : 20000, visible };
      watches.add(watch); poll();
      const resume = () => { if (available()) { updated.delete(placeId); poll(); } emit(); };
      if (typeof window !== 'undefined') {
        window.addEventListener?.('online', resume);
        window.addEventListener?.('offline', resume);
        window.document?.addEventListener('visibilitychange', resume);
      }
      return () => {
        watches.delete(watch); poll();
        if (typeof window !== 'undefined') {
          window.removeEventListener?.('online', resume);
          window.removeEventListener?.('offline', resume);
          window.document?.removeEventListener('visibilitychange', resume);
        }
      };
    },
    liked: (placeId: string) => entries.get(placeId)?.intended ?? likedIds.has(placeId),
    hasCount: (placeId: string) => publicCounts.has(placeId),
    count: (placeId: string, fallback = 0) => {
      const current = entries.get(placeId);
      return current ? Math.max(0, current.count + Number(current.intended) - Number(current.liked)) : fallback;
    },
    feedback: () => message,
    action: (placeId: string) => actions.get(placeId),
    dismiss() { message = null; emit(); },
    seed(placeId: string, count = 0) { entry(placeId, count); },
    start(placeId: string): Promise<void> {
      probes.add(placeId);
      if (startup) return startup;
      if (status === 'unknown' && Date.now() < refreshRetryAt) return Promise.resolve();
      startup = (async () => {
        try {
          if (browserStorage()?.getItem(OFF_KEY) === '1') { off(); return; }
        } catch {}
        try {
          await Promise.resolve();
          const states = await request<Record<string, LikeState>>('GET', '/v1/likes/state', { params: { placeIds: [...probes].slice(0, 100).join(',') } });
          if (!Object.keys(states).length) { off(); return; }
          for (const [identifier, state] of Object.entries(states)) {
            if (state.liked && !state.degraded) likedIds.add(identifier);
            const current = entry(identifier, state.likeCount);
            if (!state.degraded) current.liked = current.intended = state.liked;
            current.count = state.likeCount;
            if (!state.degraded) publicCounts.add(identifier);
            updated.set(identifier, Date.now());
          }
          try { await prepare(true); } catch (error) { if (!(error as { status?: number }).status) throw error; }
          status = 'on';
          refreshFailures = 0; refreshRetryAt = 0;
          emit();
          poll();
        } catch (error) {
          startup = undefined;
          refreshFailures++;
          refreshRetryAt = Date.now() + readRetryDelay(error);
          refuse(error); emit(); poll();
        }
      })();
      return startup;
    },
    set(placeId: string, intended: boolean) {
      if (status !== 'on') return;
      const current = entry(placeId);
      if (!available() || Date.now() < current.retryAt) { emit(); return; }
      if (current.intended === intended) return;
      current.intended = intended;
      current.revision++;
      actions.set(placeId, { sequence: current.revision, liked: intended });
      emit();
      schedule(placeId, current);
    },
  };
  return store;
}

export const likeStore = createLikeStore();
