'use client';

import { useEffect, useRef } from 'react';
import { createSettledSearch } from '@/lib/search-signals';
import type { Locale } from '@/i18n/dictionaries';

export function useSearchSignals(term: string, cityId: string | undefined, locale: Locale, ready = true) {
  const intent = useRef<ReturnType<typeof createSettledSearch> | null>(null);
  if (intent.current == null) intent.current = createSettledSearch();
  useEffect(() => {
    if (ready) intent.current?.update(term, cityId, locale);
  }, [term, cityId, locale, ready]);
  useEffect(() => () => intent.current?.dispose(), []);
  return {
    change(value: string) { if (ready) intent.current?.update(value, cityId, locale); },
    settle() { intent.current?.settle(); },
  };
}
