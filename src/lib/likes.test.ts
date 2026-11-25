import { describe, expect, it, vi } from 'vitest';
import type { apiRequest } from '@/lib/api/client';
import { createLikeStore } from './likes';

const PLACE = 'place-1';
const outage = () => Object.assign(new Error('likes unavailable'), { status: 503, code: 'likes_unavailable', retryAfter: 2 });
const state = { [PLACE]: { liked: false, likeCount: 4 } };
const mine = { data: [] as string[], meta: { skip: 0, limit: 100, has_more: false } };

function memory(): Pick<Storage, 'getItem' | 'setItem'> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
}

function storeWith(handler: (method: string, path: string) => unknown) {
  const request = (async (method: string, path: string) => handler(method, path)) as unknown as typeof apiRequest;
  return createLikeStore(request, memory());
}

describe('likes feedback (#33)', () => {
  it('says nothing when the startup probe finds the service down', async () => {
    const store = storeWith(() => { throw outage(); });

    store.seed(PLACE, 4);
    await store.start(PLACE);

    // The visitor has not tapped: no message. The control stays in place and inert.
    expect(store.feedback()).toBeNull();
    expect(store.enabled()).toBe(false);
    expect(store.visible()).toBe(true);
    expect(store.blocked(PLACE)).toBe(true);

    // A tap while it is inert still changes nothing and still says nothing.
    store.set(PLACE, true, { immediate: true });
    expect(store.liked(PLACE)).toBe(false);
    expect(store.feedback()).toBeNull();
  });

  it('says nothing when a background refresh fails', async () => {
    let down = false;
    const store = storeWith((_method, path) => {
      if (path.startsWith('/v1/likes/state')) {
        if (down) throw outage();
        return state;
      }
      return mine;
    });

    await store.start(PLACE);
    expect(store.enabled()).toBe(true);
    expect(store.feedback()).toBeNull();

    down = true;
    await store.refresh([PLACE]);

    expect(store.feedback()).toBeNull();
  });

  it('reports a failure only after the visitor taps Like', async () => {
    const store = storeWith((method, path) => {
      if (method === 'GET' && path.startsWith('/v1/likes/state')) return state;
      if (method === 'GET') return mine;
      throw outage();
    });

    await store.start(PLACE);
    expect(store.feedback()).toBeNull();

    store.set(PLACE, true, { immediate: true });

    await vi.waitFor(() => expect(store.feedback()).not.toBeNull());
    expect(store.feedback()?.kind).toBe('busy');
    expect(store.feedback()?.seconds).toBe(2);
  });
});
