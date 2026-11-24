import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePlaceAddress } from './place-redirect';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const ok = (data: unknown) => json({ data });

const request = (placeSlug: string) => ({
  citySlug: 'cairo',
  placeSlug,
  locale: 'en' as const,
  search: '',
});

describe('place address endpoint', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the lightweight address route and never the full place detail route', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => ok({ slug: 'zooba', citySlug: 'cairo', cityId: 'c1' }));
    vi.stubGlobal('fetch', fetchMock);

    const resolution = await resolvePlaceAddress({
      citySlug: 'matrouh',
      placeSlug: 'old-address-resolver-1',
      locale: 'en',
      search: '',
    });

    expect(resolution).toEqual({ status: 'ok', canonical: '/explorer/cairo/zooba/' });
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls[0]).toContain('/v1/places/old-address-resolver-1/address');
    expect(urls.some((url) => url.endsWith('/v1/places/old-address-resolver-1'))).toBe(false);
  });

  it('answers missing only for the address route place-not-found body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({
      success: false,
      error: { message: 'Place with slug "unknown-address-resolver-2" not found' },
    }, 404)));
    const resolution = await resolvePlaceAddress(request('unknown-address-resolver-2'));
    expect(resolution).toEqual({ status: 'missing' });
  });

  it('treats a route-missing 404 as an error and does not cache it as missing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ error: { message: 'Cannot GET /v1/places/route-404-resolver-3/address' } }, 404))
      .mockResolvedValueOnce(ok({ slug: 'zooba', citySlug: 'cairo' }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await resolvePlaceAddress(request('route-404-resolver-3'))).toEqual({ status: 'error' });
    expect(await resolvePlaceAddress(request('route-404-resolver-3'))).toEqual({
      status: 'ok',
      canonical: '/explorer/cairo/zooba/',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats a non-JSON 404 as an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 404 })));
    expect(await resolvePlaceAddress(request('non-json-404-resolver-4'))).toEqual({ status: 'error' });
  });

  it('does not call a slug-less or city-less 2xx a missing place', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ citySlug: 'cairo' })));
    expect(await resolvePlaceAddress(request('malformed-address-resolver-5'))).toEqual({ status: 'error' });
  });

  it('keeps Arabic in the redirect when the API gives a current slug', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ slug: 'zooba', citySlug: 'cairo', cityId: 'c1' })));
    const resolution = await resolvePlaceAddress({
      citySlug: 'cairo',
      placeSlug: 'old-address-resolver-6',
      locale: 'ar',
      search: '?q=coffee',
    });
    expect(resolution).toEqual({ status: 'ok', canonical: '/ar/explorer/cairo/zooba/?q=coffee' });
  });
});
