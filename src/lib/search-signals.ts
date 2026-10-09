'use client';

import { apiRequest } from '@/lib/api/client';
import { isTrackingAllowed } from '@/lib/analytics/track';
import type { Locale } from '@/i18n/dictionaries';

type SearchIntent = { term: string; cityId?: string; locale: Locale };
const key = (intent: SearchIntent) => JSON.stringify([intent.term, intent.cityId, intent.locale]);

export async function sendSettledSearch(intent: SearchIntent): Promise<void> {
  if (!intent.term || !isTrackingAllowed()) return;
  try {
    await apiRequest('GET', '/v1/search/places', {
      params: { q: intent.term, cityId: intent.cityId, settled: 1, platform: 'web', locale: intent.locale, limit: 1 },
      headers: { 'Accept-Language': intent.locale },
      keepalive: true,
    });
  } catch {}
}

export function createSettledSearch(send: (intent: SearchIntent) => unknown = sendSettledSearch, storage?: Pick<Storage, 'getItem' | 'setItem'>) {
  let current: SearchIntent = { term: '', locale: 'ar' };
  let sent = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let initial = true;
  const marker = 'khg-settled-search';
  const browserStorage = () => storage ?? (typeof window === 'undefined' ? undefined : window.sessionStorage);
  const cancel = () => { if (timer) clearTimeout(timer); timer = undefined; };
  const settle = () => {
    cancel();
    if (!current.term || sent === key(current)) return;
    sent = key(current);
    try { browserStorage()?.setItem(marker, JSON.stringify({ key: sent, at: Date.now() })); } catch {}
    void send({ ...current });
  };
  return {
    update(term: string, cityId: string | undefined, locale: Locale) {
      const next = { term: term.trim().slice(0, 256), cityId, locale };
      if (key(current) === key(next)) {
        if (!next.term) initial = false;
        if (next.term && sent !== key(next) && !timer) timer = setTimeout(settle, 1500);
        return;
      }
      cancel();
      current = next;
      sent = '';
      if (initial) {
        initial = false;
        try {
          const saved = JSON.parse(browserStorage()?.getItem(marker) ?? 'null');
          if (saved?.key === key(current) && Date.now() - saved.at < 30 * 60 * 1000) sent = key(current);
        } catch {}
      }
      if (current.term && sent !== key(current)) timer = setTimeout(settle, 1500);
    },
    settle,
    dispose: cancel,
  };
}
