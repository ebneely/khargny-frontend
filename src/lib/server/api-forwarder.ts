import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { getApiBaseUrl } from '@/lib/config';
import { forwarderSecret, isAddress } from '@/lib/backend-headers';

const NO_STORE = {
  'Cache-Control': 'private, no-store',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'x-vercel-enable-rewrite-caching': '0',
};
const FORWARDED_HEADERS = [
  'accept', 'accept-encoding', 'accept-language', 'authorization', 'content-encoding', 'content-type', 'cookie',
  'origin', 'user-agent', 'x-device-id', 'x-request-id',
];

function unavailable(code: string): NextResponse {
  return NextResponse.json({
    success: false, error: { code, message: 'API forwarding is unavailable' },
  }, { status: 503, headers: NO_STORE });
}

export function forwardBrowserApi(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (process.env.NEXT_PUBLIC_API_MODE !== 'same-origin' || !pathname.startsWith('/api/v1/')) return null;

  const secret = forwarderSecret();
  if (!secret) return unavailable('WEB_FORWARDER_UNAVAILABLE');
  // The edge's own header is the only one trusted here (Cloudflare now, the old platform before it): a client cannot
  // forge it, and it is the address the backend's per-visitor limits count.
  const address = process.env.VERCEL === '1'
    ? isAddress(request.headers.get('x-vercel-forwarded-for'))
    : isAddress(request.headers.get('cf-connecting-ip'));
  if (!address) return unavailable('WEB_FORWARDER_IP_UNAVAILABLE');

  const incoming = new Headers(request.headers);
  incoming.delete('x-khargny-forwarder');
  incoming.delete('x-khargny-client-ip');
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = incoming.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set('x-khargny-forwarder', secret);
  headers.set('x-khargny-client-ip', address);
  headers.set('cache-control', 'no-store');
  // trailingSlash: true redirects /api/v1/x to /api/v1/x/ before this runs. Nest ignores the
  // slash, but Better Auth (/v1/tourism/auth/*) answers 404 to it, so forward the path as asked.
  const destination = `${getApiBaseUrl({ browser: false })}${pathname.slice('/api'.length).replace(/\/+$/, '')}${search}`;
  return NextResponse.rewrite(destination, { request: { headers }, headers: NO_STORE });
}
