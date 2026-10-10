'use client';

import { apiRequest } from '@/lib/api/client';
import { likeStore } from '@/lib/likes';
import type { Place } from '@/lib/api/types';

export function createLikedList(request: typeof apiRequest = apiRequest) {
  let places: Place[] = [];
  let skip = 0;
  let hasMore = true;
  let loading = false;
  let error = false;
  let version = 0;
  let pending: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  const emit = () => { version++; listeners.forEach(listener => listener()); };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => version,
    state: () => ({ places, hasMore, loading, error }),
    reset() { if (!pending) { places = []; skip = 0; hasMore = true; error = false; emit(); } },
    remove(placeId: string) { places = places.filter(place => place.id !== placeId); emit(); },
    load(): Promise<void> {
      if (pending) return pending;
      if (!hasMore) return Promise.resolve();
      loading = true; error = false; emit();
      pending = (async () => {
        try {
          const answer = await request<{ data: Place[]; meta: { has_more: boolean }; degraded?: boolean }>('GET', '/v1/likes/mine', { params: { skip, limit: 20 } });
          if (answer.degraded) throw new Error('Unavailable');
          const existing = new Set(places.map(place => place.id));
          places = [...places, ...answer.data.filter(place => !existing.has(place.id))];
          skip += 20; hasMore = answer.meta.has_more;
        } catch { error = true; }
        finally { loading = false; pending = undefined; emit(); }
      })();
      return pending;
    },
  };
}

export const likedList = createLikedList();
export const likedListAvailable = () => !likeStore.off();
