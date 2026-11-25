/**
 * The headers this website's server puts on its own calls to the backend.
 *
 * DATA-PROTECTION.md (queued item 1): the server reaches the backend over the internal network and identifies itself
 * with the shared forwarder secret, so the backend can tell a call that came through us from one that came straight
 * off the internet, and can rate-limit the browser's own calls per real visitor. Nothing here is logged.
 *
 * No `server-only`: the forwarder route in the proxy needs the same helpers, and the file is safe to bundle (it only
 * reads environment variables when called). Never call it from a client component — `getApiBaseUrl` decides the
 * origin, and a browser has no `WEB_FORWARDER_SECRET` anyway.
 */

export const FORWARDER_HEADER = 'x-khargny-forwarder';
export const CLIENT_IP_HEADER = 'x-khargny-client-ip';

/** A header value that is a real IPv4 or IPv6 address, or null. */
export function isAddress(address: string | null | undefined): string | null {
  const value = (address ?? '').trim();
  if (!value) return null;
  if (/^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(value)) {
    return value.split('.').every((part) => Number(part) <= 255) ? value : null;
  }
  if (!value.includes(':') || !/^[a-f\d:.]+$/i.test(value)) return null;
  try {
    return new URL(`http://[${value}]/`).hostname ? value : null;
  } catch {
    return null;
  }
}

/** The shared secret, only when it is usable as a header value (32+ printable ASCII, no padding). */
export function forwarderSecret(value = process.env.WEB_FORWARDER_SECRET): string | null {
  const secret = (value ?? '').trim();
  if (secret.length < 32 || secret !== value || /[^\x20-\x7e]/.test(secret)) return null;
  return secret;
}

/**
 * The visitor's address, as Cloudflare or a local reverse proxy reports it. Cloudflare's header wins: it is the
 * address Cloudflare saw and cannot be spoofed through it.
 */
export function visitorAddress(source?: Headers | null): string | null {
  if (!source) return null;
  const cf = isAddress(source.get('cf-connecting-ip'));
  if (cf) return cf;
  const forwarded = source.get('x-forwarded-for');
  if (!forwarded) return null;
  for (const part of forwarded.split(',')) {
    const address = isAddress(part);
    if (address) return address;
  }
  return null;
}

/**
 * Headers for one server-side backend request. `source` is the visitor request the render is serving, when there is
 * one: a cached (ISR) render and a build-time render have no visitor, so they carry the forwarder only.
 */
export function backendHeaders(source?: Headers | null, secret = process.env.WEB_FORWARDER_SECRET): Record<string, string> {
  const headers: Record<string, string> = {};
  const key = forwarderSecret(secret);
  if (key) headers[FORWARDER_HEADER] = key;
  const address = visitorAddress(source);
  if (address) headers[CLIENT_IP_HEADER] = address;
  return headers;
}
