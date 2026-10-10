import { getApiBaseUrl } from '@/lib/config';
import { waitForGuestHandover } from './guest-handover';

let sessionReady = false;
let sessionRequest: Promise<Response> | undefined;

export async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const base = getApiBaseUrl();
  if (base === '/api') await waitForGuestHandover();
  const send = () => fetch(`${base}${path}`, base === '/api' ? { ...options, cache: 'no-store' } : options);
  if (typeof window === 'undefined' || options.credentials !== 'include') return send();
  while (!sessionReady) {
    if (!sessionRequest) {
      sessionRequest = send();
      try {
        const response = await sessionRequest;
        sessionReady = true;
        return response;
      } finally { sessionRequest = undefined; }
    }
    await sessionRequest.catch(() => {});
  }
  return send();
}

export function sendApiBeacon(path: string): void {
  const base = getApiBaseUrl();
  const send = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        if (sessionReady) navigator.sendBeacon(`${base}${path}`);
        else void fetchApi(path, { method: 'POST', credentials: 'include', keepalive: true, cache: 'no-store' }).catch(() => {});
      } else {
        void fetchApi(path, { method: 'POST', credentials: 'include', keepalive: true, cache: 'no-store' }).catch(() => {});
      }
    } catch {}
  };
  if (base === '/api') void waitForGuestHandover().then(send);
  else send();
}
