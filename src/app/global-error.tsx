'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { ErrorState } from '@/components/explorer/ErrorState';
import { dictionaries } from '@/i18n/dictionaries';
import './globals.css';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  const locale = error.digest === 'khargny-public-en' ? 'en' : 'ar';
  return <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}><body><ErrorState message={dictionaries[locale].errors.loadFailed} onRetry={reset} /></body></html>;
}
