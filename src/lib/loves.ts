'use client';

import { apiRequest } from '@/lib/api/client';

type LoveState = { liked: boolean; likeCount: number; degraded?: boolean };
type Mine = { data: string[]; meta: { skip: number; limit: number; has_more: boolean }; degraded?: boolean };
type Feedback = { kind: 'rate' | 'busy' | 'unavailable'; seconds: number };
type Entry = { liked: boolean; count: number; intended: boolean; revision: number; writing: boolean; timer?: ReturnType<typeof setTimeout>; retryAt: number };
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const OFF_KEY = 'khg-loves-off';

export function createLoveStore(request: typeof apiRequest = apiRequest, storage?: Storage) {
  const entries = new Map<string, Entry>();
  const loved = new Set<string>();
  const probes = new Set<string>();
  const listeners = new Set<() => void>();
  let status: 'unknown' | 'on' | 'off' = 'unknown';
  let version = 0;
  let startup: Promise<void> | undefined;
  let message: Feedback | null = null;
  const emit = () => { version++; listeners.forEach(listener => listener()); };
  const browserStorage = () => storage ?? (typeof window === 'undefined' ? undefined : window.sessionStorage);
  const entry = (placeId: string, count = 0) => {
    let current = entries.get(placeId);
    if (!current) {
      const liked = loved.has(placeId);
      current = { liked, intended: liked, count, revision: 0, writing: false, retryAt: 0 };
      entries.set(placeId, current);
    }
    return current;
  };
  const off = () => {
    status = 'off';
    entries.forEach(current => { if (current.timer) clearTimeout(current.timer); });
    try { browserStorage()?.setItem(OFF_KEY, '1'); } catch {}
    emit();
  };
  const refuse = (error: unknown, current?: Entry) => {
    const failure = error as { status?: number; code?: string; retryAfter?: number };
    if (failure.code === 'likes_disabled') { off(); return; }
    const seconds = failure.retryAfter ?? (failure.status === 503 ? 2 : failure.status === 429 ? 60 : 0);
    if (current) current.retryAt = Date.now() + seconds * 1000;
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
      const answer = await request<LoveState>(intended ? 'PUT' : 'DELETE', `/v1/places/${encodeURIComponent(placeId)}/like`, { headers: { 'X-Client-Platform': 'web' } });
      if (status !== 'on') return;
      current.liked = answer.liked;
      current.count = Math.max(0, answer.likeCount);
      if (answer.liked) loved.add(placeId); else loved.delete(placeId);
      if (current.revision === revision) current.intended = answer.liked;
    } catch (error) {
      refuse(error, current);
      current.intended = current.liked;
    } finally {
      current.writing = false;
      emit();
      schedule(placeId, current);
    }
  };

  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => version,
    enabled: () => status === 'on',
    liked: (placeId: string) => entries.get(placeId)?.intended ?? loved.has(placeId),
    count: (placeId: string, fallback = 0) => {
      const current = entries.get(placeId);
      return current ? Math.max(0, current.count + Number(current.intended) - Number(current.liked)) : fallback;
    },
    feedback: () => message,
    dismiss() { message = null; emit(); },
    seed(placeId: string, count = 0) { entry(placeId, count); },
    start(placeId: string): Promise<void> {
      probes.add(placeId);
      if (startup) return startup;
      startup = (async () => {
        try {
          if (browserStorage()?.getItem(OFF_KEY) === '1') { off(); return; }
        } catch {}
        try {
          await Promise.resolve();
          const states = await request<Record<string, LoveState>>('GET', '/v1/likes/state', { params: { placeIds: [...probes].slice(0, 100).join(',') } });
          if (!Object.keys(states).length) { off(); return; }
          for (const [identifier, state] of Object.entries(states)) {
            if (state.liked && !state.degraded) loved.add(identifier);
            const current = entry(identifier, state.likeCount);
            if (!state.degraded) current.liked = current.intended = state.liked;
            current.count = state.likeCount;
          }
          const ids = new Set<string>();
          let skip = 0;
          let degraded = false;
          for (;;) {
            const result = await request<Mine>('GET', '/v1/likes/mine', { params: { fields: 'ids', limit: 100, skip } });
            if (result.degraded) { degraded = true; break; }
            result.data.forEach(identifier => ids.add(identifier));
            if (!result.meta.has_more) break;
            skip += 100;
          }
          if (!degraded) {
            loved.clear(); ids.forEach(identifier => loved.add(identifier));
            entries.forEach((current, identifier) => { current.liked = current.intended = loved.has(identifier); });
          }
          status = 'on';
          emit();
        } catch (error) { refuse(error); emit(); }
      })();
      return startup;
    },
    set(placeId: string, intended: boolean) {
      if (status !== 'on') return;
      const current = entry(placeId);
      if (Date.now() < current.retryAt) { emit(); return; }
      current.intended = intended;
      current.revision++;
      emit();
      schedule(placeId, current);
    },
  };
}

export const loveStore = createLoveStore();
