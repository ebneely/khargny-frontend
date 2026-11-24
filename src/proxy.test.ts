import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/api-forwarder', () => ({ forwardBrowserApi: () => null }));
vi.mock('@/lib/server/place-redirect', () => ({
  resolvePlaceAddress: vi.fn(async ({ placeSlug }: { placeSlug: string }) => {
    if (placeSlug === 'gone-place') return { status: 'missing' };
    if (placeSlug === 'old-place') {
      return { status: 'ok', canonical: '/explorer/cairo/new-place/?utm_source=news' };
    }
    return { status: 'ok', canonical: null };
  }),
}));

import { proxy } from './proxy';

const request = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(url, { headers });

describe('proxy trusted headers', () => {
  it('drops forged locale, path, search and marker headers from an external request', async () => {
    const res = await proxy(request('https://www.example.com/', {
      'x-khargny-locale': 'ar',
      'x-khargny-path': '/ar/attacker',
      'x-khargny-search': '?q=attacker',
      'x-khargny-internal-rewrite': '1',
    }));

    expect(res.headers.get('x-middleware-request-x-khargny-locale')).toBe('en');
    expect(res.headers.get('x-middleware-request-x-khargny-path')).toBe('/');
    expect(res.headers.get('x-middleware-request-x-khargny-search')).toBe('');
    // The marker is a per-process secret, never the forged value a client can guess.
    expect(res.headers.get('x-middleware-request-x-khargny-internal-rewrite')).not.toBe('1');
    expect(res.headers.get('x-middleware-request-x-khargny-internal-rewrite')).toBeTruthy();
  });

  it('keeps Arabic in the [lang] address and adds noindex for a search query', async () => {
    const res = await proxy(request('https://www.example.com/ar/explorer/?q=cafe'));

    expect(res.headers.get('x-middleware-request-x-khargny-locale')).toBe('ar');
    expect(res.headers.get('x-middleware-rewrite')).toBe('https://www.example.com/ar/explorer/?q=cafe');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, follow');
  });

  it('routes English through the [lang] segment and keeps the address plain', async () => {
    const res = await proxy(request('https://www.example.com/explorer/'));

    expect(res.headers.get('x-middleware-request-x-khargny-locale')).toBe('en');
    expect(res.headers.get('x-middleware-rewrite')).toBe('https://www.example.com/en/explorer/');
  });

  it('does not noindex a query with only campaign tracking keys', async () => {
    const res = await proxy(request('https://www.example.com/explorer/?utm_source=news&fbclid=abc&gclid=def'));
    expect(res.headers.get('X-Robots-Tag')).toBeNull();
  });

  it('builds a rewrite from nextUrl, never from the Host header', async () => {
    const res = await proxy(request('https://www.example.com/ar/', { host: 'evil.example' }));

    expect(res.headers.get('x-middleware-rewrite')).toBe('https://www.example.com/ar/');
    expect(res.headers.get('x-middleware-rewrite')).not.toContain('evil.example');
  });

  it('sends a typed /en address back to the plain one in one 308', async () => {
    const plain = await proxy(request('https://www.example.com/en/explorer/'));
    expect(plain.status).toBe(308);
    expect(plain.headers.get('location')).toBe('https://www.example.com/explorer/');

    // An old city address lands on its redesign route in the same hop.
    const city = await proxy(request('https://www.example.com/en/explorer/cairo/'));
    expect(city.status).toBe(308);
    expect(city.headers.get('location')).toBe('https://www.example.com/explorer/?city=cairo');
  });

  it('accepts a rewrite second pass only with the per-process secret', async () => {
    const first = await proxy(request('https://www.example.com/ar/explorer/'));
    const token = first.headers.get('x-middleware-request-x-khargny-internal-rewrite');
    expect(token).toBeTruthy();
    expect(token).not.toBe('1');

    const second = await proxy(request('https://www.example.com/ar/explorer/', {
      'x-khargny-locale': 'ar',
      'x-khargny-path': '/explorer',
      'x-khargny-search': '',
      'x-khargny-internal-rewrite': token!,
    }));
    expect(second.headers.get('x-middleware-next')).toBe('1');
    expect(second.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('serves the styled 404 document for a place the backend says is gone', async () => {
    const res = await proxy(request('https://www.example.com/explorer/cairo/gone-place/'));

    expect(res.status).toBe(404);
    expect(res.headers.get('x-middleware-rewrite')).toBe('https://www.example.com/en/not-found-place/view/');
    expect(res.headers.get('x-middleware-request-x-khargny-locale')).toBe('en');
    expect(res.headers.get('x-robots-tag')).toBe('noindex, follow');
  });

  it('keeps the query string on a moved place (301)', async () => {
    const { resolvePlaceAddress } = await import('@/lib/server/place-redirect');
    const res = await proxy(request('https://www.example.com/explorer/cairo/old-place/?utm_source=news'));

    // The query string is handed to the resolver, which builds the canonical address with it.
    expect(vi.mocked(resolvePlaceAddress)).toHaveBeenCalledWith(
      expect.objectContaining({ placeSlug: 'old-place', locale: 'en', search: '?utm_source=news' }),
    );
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://www.5argny.com/explorer/cairo/new-place/?utm_source=news');
  });
});
