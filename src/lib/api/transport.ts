import { getApiBaseUrl } from '@/lib/config';
import { waitForGuestHandover } from './guest-handover';

export async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const base = getApiBaseUrl();
  if (base === '/api') await waitForGuestHandover();
  return fetch(`${base}${path}`, base === '/api' ? { ...options, cache: 'no-store' } : options);
}

export function sendApiBeacon(path: string): void {
  const base = getApiBaseUrl();
  const send = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(`${base}${path}`);
      } else {
        void fetch(`${base}${path}`, { method: 'POST', credentials: 'include', keepalive: true, cache: 'no-store' }).catch(() => {});
      }
    } catch {}
  };
  if (base === '/api') void waitForGuestHandover().then(send);
  else send();
}
