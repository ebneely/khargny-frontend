import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePlaceAddress } from './place-redirect';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data }), { status, headers: { 'content-type': 'application/json' } });

describe('place address endpoint', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the lightweight address route and never the full place detail route', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => json({ slug: 'zooba', citySlug: 'cairo', cityId: 'c1' }));
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

  it('answers missing for a 404 from the address route', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    const resolution = await resolvePlaceAddress({
      citySlug: 'cairo',
      placeSlug: 'unknown-address-resolver-2',
      locale: 'en',
      search: '',
    });
    expect(resolution).toEqual({ status: 'missing' });
  });

  it('keeps Arabic in the redirect when the API gives a current slug', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ slug: 'zooba', citySlug: 'cairo', cityId: 'c1' })));
    const resolution = await resolvePlaceAddress({
      citySlug: 'cairo',
      placeSlug: 'old-address-resolver-3',
      locale: 'ar',
      search: '?q=coffee',
    });
    expect(resolution).toEqual({ status: 'ok', canonical: '/ar/explorer/cairo/zooba/?q=coffee' });
  });
});
