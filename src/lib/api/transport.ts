import { getApiBaseUrl } from '@/lib/config';
import { backendHeaders } from '@/lib/backend-headers';
import { visitorId } from '@/lib/analytics/visitor';
import { waitForGuestHandover } from './guest-handover';

/** The server's own calls identify themselves; a browser call never sees the forwarder secret. */
function withBackendHeaders(options: RequestInit): RequestInit {
  if (typeof window !== 'undefined') return options;
  return { ...options, headers: { ...(options.headers as Record<string, string> | undefined), ...backendHeaders() } };
}

let sessionReady = false;
let sessionRequest: Promise<Response> | undefined;

export async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const base = getApiBaseUrl();
  const forwarded = base === '/api';
  if (forwarded) await waitForGuestHandover();
  const send = () => {
    if (!forwarded) return fetch(`${base}${path}`, withBackendHeaders(options));
    // Through the same-origin forwarder every browser call carries the site's visitor id, so the backend's per-device
    // public-read limit counts this browser rather than the address it shares behind a carrier or an office NAT. The
    // forwarder passes this header through (src/lib/server/api-forwarder.ts). No id (storage blocked) = no header.
    const headers = new Headers(options.headers);
    const id = visitorId();
    if (id && !headers.has('x-device-id')) headers.set('x-device-id', id);
    return fetch(`${base}${path}`, { ...options, headers, cache: 'no-store' });
  };
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
