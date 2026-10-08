const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./offline-loader.cjs');
const { dependencies, city, place, origin } = require('./seo-fixtures.cjs');

function sitemapWith({ env, cities = [city], places = [place], failAt, malformed = false } = {}) {
  const requests = [];
  const deps = dependencies({ env, fetch: async (url) => {
    requests.push(url);
    if (url.includes(failAt || 'never-match')) return { ok: false, status: 503 };
    if (malformed) return { ok: true, json: async () => ({ data: { unexpected: true } }) };
    const data = url.endsWith('/v1/cities') ? cities : places;
    return { ok: true, json: async () => ({ data: { data } }) };
  } });
  return { sitemap: load('src/lib/sitemap.ts', deps).default, requests };
}

test('sitemap uses current public slugs, real record dates and the fixed build date', async () => {
  const { sitemap } = sitemapWith();
  const first = await sitemap();
  const second = await sitemap();
  assert.equal(first.length, 12);
  for (const item of first) {
    assert.ok(item.url.endsWith('/'));
    assert.ok(!item.url.includes('?') && !item.url.includes('/plan/') && !item.url.includes('alqahrh'));
    const timestamp = item.lastModified instanceof Date ? item.lastModified.toISOString() : new Date(item.lastModified).toISOString();
    const expected = item.url.includes('/new-place/') ? '2026-09-02T12:00:00.000Z' : item.url.includes('/cairo/') ? '2026-09-01T10:00:00.000Z' : '2026-09-30T00:00:00.000Z';
    assert.equal(timestamp, expected);
    assert.equal(new Date(second.find((entry) => entry.url === item.url).lastModified).toISOString(), timestamp);
    assert.deepEqual(Object.keys(item.alternates.languages).sort(), ['ar', 'en', 'x-default']);
    const plainPath = new URL(item.url).pathname.replace(/^\/(ar|en)/, '');
    assert.equal(item.alternates.languages.ar, origin + '/ar' + plainPath);
    assert.equal(item.alternates.languages.en, origin + '/en' + plainPath);
    assert.equal(item.alternates.languages['x-default'], item.alternates.languages.ar);
  }
  const { resolveRouteData } = require('next/dist/build/webpack/loaders/metadata/resolve-route-data');
  const xml = resolveRouteData(JSON.parse(JSON.stringify(first)), 'sitemap');
  assert.match(xml, /<lastmod>2026-09-30T00:00:00\.000Z<\/lastmod>/);
  assert.match(xml, /<lastmod>2026-09-01T10:00:00\.000Z<\/lastmod>/);
  assert.match(xml, /<lastmod>2026-09-02T12:00:00\.000Z<\/lastmod>/);
  assert.equal((xml.match(/hreflang="ar"/g) || []).length, first.length);
});

test('public lists are the only source; missing dates are omitted, drafts and deleted records stay absent', async () => {
  const { sitemap, requests } = sitemapWith({
    cities: [city, { ...city, id: 'draft-city', slug: 'draft-city', status: 'draft' }],
    places: [
      { ...place, updatedAt: undefined },
      { ...place, slug: 'draft-place', status: 'draft' },
      { ...place, slug: 'deleted-place', deletedAt: '2026-09-01T00:00:00Z' },
      { ...place, slug: 'other-city', cityId: 'somewhere-else' },
    ],
  });
  const entries = await sitemap();
  assert.ok(entries.some((entry) => entry.url.endsWith('/new-place/')));
  assert.equal(entries.find((entry) => entry.url.endsWith('/new-place/')).lastModified, undefined);
  assert.ok(!entries.some((entry) => /draft|deleted|other-city/.test(entry.url)));
  assert.ok(requests.filter((url) => url.includes('/v1/places?')).every((url) => new URL(url).searchParams.get('cityId') === city.id));
});

test('sitemap fetches every public page, beyond the old 2000-place cap, and deduplicates URLs', async () => {
  const requests = [];
  const deps = dependencies({ fetch: async (url) => {
    requests.push(url);
    if (url.endsWith('/v1/cities')) return { ok: true, json: async () => ({ data: [city] }) };
    const skip = Number(new URL(url).searchParams.get('skip'));
    const data = Array.from({ length: Math.min(100, 2001 - skip) }, (_, index) => ({ ...place, slug: 'place-' + (skip + index) }));
    return { ok: true, json: async () => ({ data: { data, meta: { total: 2001 } } }) };
  } });
  const entries = await load('src/lib/sitemap.ts', deps).default();
  assert.equal(entries.filter((entry) => /\/place-\d+\/$/.test(entry.url)).length, 4002);
  assert.equal(new Set(entries.map((entry) => entry.url)).size, entries.length);
  assert.ok(requests.some((url) => url.includes('skip=2000')));
});

test('any upstream error, malformed payload or missing API config rejects instead of publishing a short sitemap', async () => {
  for (const options of [{ failAt: '/v1/cities' }, { failAt: '/v1/places?' }, { malformed: true }]) {
    await assert.rejects(sitemapWith(options).sitemap());
  }
  const deps = dependencies({ fetch: async () => { throw new Error('Simulated network outage'); } });
  await assert.rejects(load('src/lib/sitemap.ts', deps).default());
  deps['@/lib/config'].API_BASE_URL = '';
  await assert.rejects(load('src/lib/sitemap.ts', deps).default());
  const paginated = dependencies({ fetch: async (url) => {
    if (url.endsWith('/v1/cities')) return { ok: true, json: async () => ({ data: [city] }) };
    if (url.includes('skip=100')) return { ok: false, status: 503 };
    return { ok: true, json: async () => ({ data: Array.from({ length: 100 }, (_, index) => ({ ...place, slug: 'place-' + index })) }) };
  } });
  await assert.rejects(load('src/lib/sitemap.ts', paginated).default());
});

test('preview sitemap contains no noindex pages and never reads the API', async () => {
  const { sitemap, requests } = sitemapWith({ env: { VERCEL_ENV: 'preview' } });
  assert.equal((await sitemap()).length, 0);
  assert.equal(requests.length, 0);
});

test('dynamic sitemap HTTP response caches only complete successes, never upstream failures', async () => {
  const routePath = 'src/app/sitemap.xml/route.ts';
  const deps = dependencies({ fetch: async (url) => ({ ok: true, json: async () => ({ data: url.endsWith('/v1/cities') ? [city] : [place] }) }) });
  const route = load(routePath, deps);
  assert.equal(route.dynamic, 'force-dynamic');
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, s-maxage=600, stale-while-revalidate=3600');
  assert.match(response.headers.get('content-type'), /application\/xml/);
  const xml = await response.text();
  assert.equal((xml.match(/<loc>/g) || []).length, 12);
  assert.equal((xml.match(/hreflang="(?:ar|en|x-default)"/g) || []).length, 36);
  assert.match(xml, /<lastmod>2026-09-02T12:00:00\.000Z<\/lastmod>/);
  for (const failAt of ['/v1/cities', '/v1/places?']) {
    const failedDeps = dependencies({ fetch: async (url) => url.includes(failAt)
      ? { ok: false, status: 503 }
      : { ok: true, json: async () => ({ data: [city] }) } });
    const failure = await load(routePath, failedDeps).GET();
    assert.equal(failure.status, 500);
    assert.equal(failure.headers.get('cache-control'), 'private, no-store');
    assert.ok(!(await failure.text()).includes('<urlset'));
  }
  const laterPageDeps = dependencies({ fetch: async (url) => {
    if (url.endsWith('/v1/cities')) return { ok: true, json: async () => ({ data: [city] }) };
    if (url.includes('skip=100')) return { ok: false, status: 503 };
    return { ok: true, json: async () => ({ data: Array.from({ length: 100 }, (_, index) => ({ ...place, slug: 'place-' + index })) }) };
  } });
  const lateFailure = await load(routePath, laterPageDeps).GET();
  assert.equal(lateFailure.status, 500);
  assert.equal(lateFailure.headers.get('cache-control'), 'private, no-store');
  assert.ok(!(await lateFailure.text()).includes('<loc>'));
  const previewDeps = dependencies({ env: { VERCEL_ENV: 'preview' }, fetch: async () => { throw new Error('Preview must not fetch'); } });
  const preview = await load(routePath, previewDeps).GET();
  assert.equal(preview.status, 200);
  assert.ok(!(await preview.text()).includes('<loc>'));
});

test('sitemap XML preserves alternates and safely escapes special characters', () => {
  const { sitemapXml } = load('src/lib/crawler-responses.ts');
  const xml = sitemapXml([{ url: 'https://web.invalid/a&b/', priority: 0, alternates: { languages: { ar: 'https://web.invalid/"<&/' } } }]);
  assert.ok(xml.includes('<loc>https://web.invalid/a&amp;b/</loc>'));
  assert.ok(xml.includes('href="https://web.invalid/&quot;&lt;&amp;/"'));
  assert.ok(xml.includes('<priority>0</priority>'));
  assert.ok(!xml.includes('<lastmod>'));
  assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
});

test('robots HTTP response caches environment-specific rules without changing their scope', async () => {
  for (const preview of [false, true]) {
    const route = load('src/app/robots.txt/route.ts', dependencies({ env: { VERCEL_ENV: preview ? 'preview' : 'production' } }));
    assert.equal(route.dynamic, 'force-dynamic');
    const response = await route.GET();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/plain/);
    assert.equal(response.headers.get('cache-control'), 'public, s-maxage=600, stale-while-revalidate=3600');
    const body = await response.text();
    if (preview) assert.equal(body, 'User-Agent: *\nDisallow: /\n');
    else {
      assert.match(body, /Allow: \/\n/);
      assert.ok(body.includes('Sitemap: ' + origin + '/sitemap.xml'));
      assert.match(body, /Disallow: \/en\/plan/);
    }
  }
});
