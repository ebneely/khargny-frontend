import type { Event } from '@sentry/nextjs';

export function redactForwarderEvent<TEvent extends Event>(event: TEvent): TEvent {
  const request = event.request;
  if (!request?.url) return event;
  let pathname: string;
  try {
    pathname = new URL(request.url, 'https://forwarder.invalid').pathname;
  } catch {
    return event;
  }
  if (!pathname.startsWith('/api/v1/')) return event;

  const headers = { ...request.headers };
  for (const name of Object.keys(headers)) {
    const normalized = name.toLowerCase();
    if (normalized === 'cookie' || normalized === 'set-cookie' || normalized === 'authorization' ||
        normalized.startsWith('x-khargny-') || normalized.startsWith('x-middleware-request-')) {
      delete headers[name];
    }
  }
  event.request = { ...request, headers };
  delete event.request.data;
  delete event.request.cookies;
  return event;
}
