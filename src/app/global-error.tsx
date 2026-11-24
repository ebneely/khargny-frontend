'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { langOf } from '@5argny/core/rules/locale';
import { ErrorState } from '@/components/explorer/ErrorState';
import { dictionaries } from '@/i18n/dictionaries';
import './globals.css';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  // The address says the language (the URL is the only source, owner 2026-11-14). It used to be guessed from the error
  // digest, which the server had to know per request — one more thing a cacheable render cannot depend on.
  const locale = typeof window !== 'undefined' ? langOf(window.location.pathname) : 'en';
  return <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}><body><ErrorState message={dictionaries[locale].errors.loadFailed} onRetry={reset} /></body></html>;
}
