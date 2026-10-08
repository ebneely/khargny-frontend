import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { getApiBaseUrl } from '@/lib/config';

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

function isAddress(address: string): boolean {
  if (/^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(address)) {
    return address.split('.').every((part) => Number(part) <= 255);
  }
  if (!address.includes(':') || !/^[a-f\d:.]+$/i.test(address)) return false;
  try {
    return Boolean(new URL(`http://[${address}]/`).hostname);
  } catch {
    return false;
  }
}

function unavailable(code: string): NextResponse {
  return NextResponse.json({
    success: false, error: { code, message: 'API forwarding is unavailable' },
  }, { status: 503, headers: NO_STORE });
}

export function forwardBrowserApi(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (process.env.NEXT_PUBLIC_API_MODE !== 'same-origin' || !pathname.startsWith('/api/v1/')) return null;

  const secret = process.env.WEB_FORWARDER_SECRET;
  if (!secret || secret.trim().length < 32 || secret !== secret.trim() || /[^\x20-\x7e]/.test(secret)) {
    return unavailable('WEB_FORWARDER_UNAVAILABLE');
  }
  const address = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.trim() : undefined;
  if (!address || !isAddress(address)) return unavailable('WEB_FORWARDER_IP_UNAVAILABLE');

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
  const destination = `${getApiBaseUrl({ browser: false })}${pathname.slice('/api'.length)}${search}`;
  return NextResponse.rewrite(destination, { request: { headers }, headers: NO_STORE });
}
