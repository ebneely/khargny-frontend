const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { QueryClient, QueryObserver, hydrate } = require('@tanstack/react-query');
const { fixture, renderRoute, city, places } = require('./seo-body-fixtures.cjs');
const { load } = require('./offline-loader.cjs');
const { inspectHtml, htmlFailures, crawl } = require('./crawl-check.cjs');

const routes = [
  { file: 'src/app/page.tsx', route: '/', kind: 'home', heading: { en: 'Find your next outing', ar: 'اكتشف خروجة جديدة' } },
  { file: 'src/app/explorer/page.tsx', route: '/explorer/', kind: 'explorer' },
  { file: 'src/app/explorer/[citySlug]/page.tsx', route: '/explorer/aswan/', kind: 'city' },
  { file: 'src/app/explorer/[citySlug]/[placeSlug]/page.tsx', route: '/explorer/aswan/place-1/', kind: 'place' },
];

for (const locale of ['ar', 'en']) for (const route of routes) {
  test(`${locale} ${route.kind}: real body and links in HTML, no JavaScript`, async () => {
    const context = fixture({ locale, route: route.route });
    const html = await renderRoute(context, route.file);
    const result = inspectHtml(html);
    const dictionary = load('src/i18n/dictionaries.ts').dictionaries[locale];
    const heading = route.kind === 'home' ? dictionary.home.heroTitle : route.kind === 'explorer' ? dictionary.explorer.title : route.kind === 'city' ? (locale === 'ar' ? city.name : city.nameEn) : (locale === 'ar' ? places[0].name : places[0].nameEn);
    assert.deepEqual(result.headings, [heading]);
    assert.deepEqual(htmlFailures(result, { ...route, locale, cityTotal: places.length }), []);
    const description = route.kind === 'home' ? dictionary.home.heroSubtitle : route.kind === 'explorer' ? dictionary.explorer.subtitle : route.kind === 'city' ? (locale === 'ar' ? city.descriptionAr : city.descriptionEn) : (locale === 'ar' ? places[0].description : places[0].descriptionEn);
    assert.ok(result.text.includes(description));
    assert.ok(html.includes(`lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`));
    assert.doesNotMatch(html, /<h1[^>]*>\s*Loading|LoadingSkeleton|No places yet|جار[يٍ] التحميل/);
    assert.ok(result.photos.length > 0);
    if (route.kind === 'city') { assert.equal(new Set(result.places).size, 24); assert.ok(result.links.includes('?page=2'));
      // The category strip is gone from the page (categories live in the Filters sheet, which is
      // closed in the first HTML). Category names reach a crawler on each card instead; that is
      // checked on a real build by crawl-check, where the server has the categories.
      assert.doesNotMatch(html, /khg-cat-row/);
      assert.doesNotMatch(html, /<select/);
    }
    if (route.kind === 'home') { assert.ok(result.places.length >= 5); assert.ok(html.includes(dictionary.home.sponsored)); }
    if (route.kind === 'place') {
      assert.ok(result.links.includes('tel:+201234567890'));
      for (const text of ['12 Nile Road', locale === 'ar' ? 'مشروبات' : 'Drinks', locale === 'ar' ? 'شاي' : 'Tea', '25', '9:00', locale === 'ar' ? 'مطاعم' : 'Restaurants']) assert.ok(html.includes(text), text);
      for (const key of ['menu', 'priceVerified', 'visitedByUs']) assert.ok(html.includes(dictionary.place[key]), key);
      const photos = result.photos.filter((photo) => /alt="(?:Place 1|مكان 1) — \d+"/.test(photo));
      assert.equal(photos.length, 3);
      assert.match(photos[0], /loading="eager"/);
      assert.match(photos[0], /fetchPriority="high"/);
      for (const photo of photos) { assert.match(photo, /width="1200" height="900"/); assert.ok(!photo.includes('original.jpg')); }
      for (const photo of photos.slice(1)) assert.match(photo, /loading="lazy"/);
      assert.equal(context.calls.filter((call) => new URL(call.address).pathname === '/v1/places/place-1').length, 1);
    }
    assert.ok(context.calls.every((call) => !/saved-places|impressions|events/.test(call.address)));
  });
}

test('page two renders its own 24 cards and self-canonical; search remains noindex', async () => {
  const context = fixture({ route: '/explorer/aswan/', search: '?page=2' });
  const html = await renderRoute(context, 'src/app/explorer/[citySlug]/page.tsx');
  const result = inspectHtml(html);
  assert.ok(html.includes('Place 25'));
  assert.ok(!result.places.includes('/en/explorer/aswan/place-1/'));
  assert.equal(new Set(result.places).size, 24);
  const layout = load('src/app/explorer/[citySlug]/layout.tsx', context.dependencies);
  const metadata = await layout.generateMetadata({ params: Promise.resolve({ citySlug: 'aswan' }) });
  assert.equal(metadata.alternates.canonical, 'https://web.invalid/en/explorer/aswan/?page=2');
  assert.equal(metadata.robots.index, true);
  assert.equal(metadata.pagination.next, 'https://web.invalid/en/explorer/aswan/?page=3');
  const searchContext = fixture({ route: '/explorer/aswan/', search: '?q=roof&page=2' });
  const filtered = await load('src/app/explorer/[citySlug]/layout.tsx', searchContext.dependencies).generateMetadata({ params: Promise.resolve({ citySlug: 'aswan' }) });
  assert.equal(filtered.robots.index, false);
  assert.equal(filtered.robots.follow, true);
  assert.equal(filtered.alternates.canonical, 'https://web.invalid/en/explorer/aswan/');
});

test('layout, metadata, root gate and page share the one place request', async () => {
  const context = fixture({ route: '/explorer/aswan/place-1/' });
  const props = { params: Promise.resolve({ citySlug: 'aswan', placeSlug: 'place-1' }), children: null };
  const layout = load('src/app/explorer/[citySlug]/[placeSlug]/layout.tsx', context.dependencies);
  await Promise.all([layout.generateMetadata(props), layout.default(props), renderRoute(context, routes[3].file)]);
  assert.equal(context.calls.filter((call) => new URL(call.address).pathname === '/v1/places/place-1').length, 1);
  for (const call of context.calls.filter((call) => !call.address.includes('/home/'))) { assert.equal(call.options.next.revalidate, 300); assert.ok(call.options.next.tags.includes('public-discovery')); assert.ok(!call.options.headers && !call.options.credentials); }
});

test('hydrated public hooks mount fresh, with no duplicate API read; saved state is absent', async () => {
  const context = fixture({ route: '/explorer/aswan/place-1/' });
  const server = load('src/lib/server/public-data.ts', context.dependencies);
  const data = await server.getPlacePage('place-1');
  const [list, count, menu, similar, sections, featured, top] = await Promise.all([server.getPlaceList(city.id), server.getCityCount(city.slug), server.getMenu('place-1'), server.getSimilar('place-1'), server.getHomeSections(), server.getFeatured(), server.getTopPlaces()]);
  const state = server.publicHydration([
    [['places', 'detail', 'place-1'], data.place], [['cities'], data.cities], [['categories'], data.categories],
    [['cities', city.slug], city], [['cities', city.slug, 'places', 1], count],
    [['places', 'list', { cityId: city.id, skip: 0, limit: 24 }], list], [['places', 'similar', 'place-1'], similar],
    [['places', 'menu', 'place-1'], menu], [['home', 'sections'], sections], [['home', 'featured'], featured], [['home', 'top-places', null], top],
  ]);
  assert.ok(state.queries.every((query) => !query.queryKey.includes('saved-places')));
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  hydrate(client, state);
  const dependencies = { ...context.dependencies, '@tanstack/react-query': { useQuery: (options) => options } };
  const placeHooks = load('src/lib/api/hooks/use-places.ts', dependencies);
  const cityHooks = load('src/lib/api/hooks/use-cities.ts', dependencies);
  const adsHooks = load('src/lib/api/hooks/use-home-ads.ts', dependencies);
  const options = [placeHooks.usePlace('place-1'), cityHooks.useCities(), load('src/lib/api/hooks/use-categories.ts', dependencies).useCategories(),
    cityHooks.useCity(city.slug), cityHooks.useCityPlaces(city.slug, { limit: 1 }), placeHooks.usePlaces({ cityId: city.id, skip: 0, limit: 24 }), placeHooks.useSimilarPlaces('place-1'),
    { queryKey: ['places', 'menu', 'place-1'], queryFn: () => { throw new Error('unexpected menu refetch'); }, staleTime: 300000 },
    load('src/lib/api/hooks/use-home.ts', dependencies).useHomeSections(), adsHooks.useFeaturedPlaces(), adsHooks.useTopPlaces(),
  ];
  const reads = context.calls.length;
  const observers = options.map((option) => new QueryObserver(client, option));
  const unsubscribe = observers.map((observer) => observer.subscribe(() => {}));
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(context.calls.length, reads);
  assert.equal(observers[0].getCurrentResult().data.nameEn, 'Place 1');
  for (const observer of observers) assert.ok(observer.getCurrentResult().data);
  unsubscribe.forEach((stop) => stop());
  client.clear();
});

test('gallery overflow photos remain real lazy images without JavaScript', () => {
  const context = fixture();
  const Showcase = load('src/components/explorer/MediaShowcase.tsx', context.dependencies).MediaShowcase;
  const items = Array.from({ length: 9 }, (_, index) => ({ type: 'image', photo: places[0].images[0], alt: `Place 1 — ${index + 2}` }));
  const html = renderToStaticMarkup(React.createElement(Showcase, { items }));
  const photos = inspectHtml(html).photos.filter((photo) => /alt="Place 1/.test(photo));
  assert.equal(photos.length, 9);
  assert.ok(html.includes('<noscript>'));
  for (const photo of photos) { assert.match(photo, /loading="lazy"/); assert.match(photo, /width="1200" height="900"/); }
});

test('main failures reject instead of publishing empty content; missing resources remain 404', async () => {
  for (const route of routes) await assert.rejects(renderRoute(fixture({ route: route.route, failure: 503 }), route.file), (error) => error.status === 503);
  await assert.rejects(renderRoute(fixture({ route: routes[3].route, failure: 404 }), routes[3].file), (error) => error.status === 404);
  await assert.rejects(renderRoute(fixture({ route: routes[2].route, failure: 404 }), routes[2].file), (error) => error.status === 404);
  const malformed = fixture({ route: routes[2].route });
  const originalFetch = malformed.dependencies.fetch;
  malformed.dependencies.fetch = async (address, options) => new URL(address).pathname === '/v1/places'
    ? { ok: true, status: 200, json: async () => ({ success: true, data: {} }) } : originalFetch(address, options);
  await assert.rejects(renderRoute(malformed, routes[2].file), (error) => error.status === 502);
});

test('secondary blocks do not delay the main resource and failures preserve the main body', async () => {
  const context = fixture({ route: routes[3].route, secondaryFailure: true });
  await load(routes[3].file, context.dependencies).default({ params: Promise.resolve({ citySlug: 'aswan', placeSlug: 'place-1' }) });
  assert.equal(context.calls.length, 3);
  const html = await renderRoute(context, routes[3].file);
  assert.deepEqual(inspectHtml(html).headings, ['Place 1']);
  assert.ok(html.includes('A place overlooking the Nile.'));
});

test('the root waits for main data before any HTML and renders the existing localized error state', async () => {
  for (const locale of ['ar', 'en']) {
    const context = fixture({ route: '/explorer/aswan/', locale, failure: 503 });
    const Root = load('src/app/layout.tsx', context.dependencies).default;
    let failure;
    try { await Root({ children: React.createElement('h1', null, 'must not render') }); } catch (error) { failure = error; }
    assert.equal(failure.status, 503);
    assert.equal(failure.digest, `khargny-public-${locale}`);
    const GlobalError = load('src/app/global-error.tsx', context.dependencies).default;
    const html = renderToStaticMarkup(React.createElement(GlobalError, { error: failure, reset() {} }));
    assert.ok(html.includes(`lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`));
    assert.ok(inspectHtml(html).text.includes(load('src/i18n/dictionaries.ts').dictionaries[locale].errors.loadFailed));
    assert.ok(!html.includes('must not render'));
  }
});

test('crawl-check visits the sitemap sample of 20 places in both languages without JavaScript', async () => {
  const originalFetch = global.fetch;
  const originalLog = console.log;
  const requests = [];
  const lines = [];
  const links = (locale, count) => Array.from({ length: count }, (_, index) => `<a href="/${locale}/explorer/aswan/place-${index + 1}/">Place ${index + 1}</a>`).join('');
  global.fetch = async (address, options) => {
    const url = new URL(address);
    requests.push({ url, options });
    if (url.pathname === '/sitemap.xml') return new Response(`<urlset><url><loc>https://production.invalid/en/explorer/aswan/</loc></url>${Array.from({ length: 40 }, (_, index) => `<url><loc>https://production.invalid/en/explorer/aswan/place-${index + 1}/</loc></url>`).join('')}</urlset>`);
    const locale = url.pathname.split('/')[1];
    const kind = url.pathname.split('/').filter(Boolean).length;
    const cityLink = `<a href="/${locale}/explorer/aswan/">Aswan</a>`;
    const breadcrumbs = `<a href="/${locale}/">Home</a><a href="/${locale}/explorer/">Explore</a>${cityLink}`;
    const body = kind <= 2 ? cityLink : kind === 3 ? `${links(locale, 24)}<a href="?page=2">2</a>` : `${breadcrumbs}${links(locale, 8)}`;
    return new Response(`<html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><body><main data-city-total="147" data-page-size="24"><h1>Real content</h1>${body}<img src="/photo.webp" alt="Place 1" width="1200" height="900" /></main></body></html>`);
  };
  console.log = (line) => lines.push(line);
  try {
    await crawl('http://local.invalid:3200');
    assert.equal(requests.length, 47);
    for (const locale of ['ar', 'en']) assert.equal(requests.filter(({ url }) => url.pathname.startsWith(`/${locale}/explorer/aswan/place-`)).length, 20);
    assert.ok(requests.every(({ url, options }) => url.hostname === 'local.invalid' && options.redirect === 'manual'));
    assert.ok(lines.every((line) => !line.includes('FAIL')));
    assert.ok(lines.at(-1).includes('page-size=24 pages=7'));
  } finally { global.fetch = originalFetch; console.log = originalLog; }
});

test('crawl-check ignores RSC/scripts and rejects loading bodies, too few links and missing image alt', () => {
  assert.ok(htmlFailures(inspectHtml('<h1>ثانية واحدة…</h1>'), { kind: 'city' }).includes('empty/loading heading'));
  const html = '<script><h1>False positive</h1><a href="/en/explorer/aswan/fake/">fake</a></script><h1>Loading…</h1><img src="/logo.png" />';
  const result = inspectHtml(html);
  assert.deepEqual(result.headings, ['Loading…']);
  assert.equal(result.places.length, 0);
  const failures = htmlFailures(result, { kind: 'city', locale: 'en' });
  assert.ok(failures.includes('empty/loading heading'));
  assert.ok(failures.includes('image without alt'));
  assert.ok(failures.includes('expected 1 place links'));
});

for (const route of ['src/app/page.tsx', 'src/app/explorer/page.tsx', 'src/app/explorer/[citySlug]/page.tsx', 'src/app/explorer/[citySlug]/[placeSlug]/page.tsx']) {
  test(`${route} is a server entry, not an after-load fetch`, () => {
    const source = fs.readFileSync(path.join(__dirname, '..', route), 'utf8');
    assert.doesNotMatch(source, /^["']use client["']/);
    assert.match(source, /HydrationBoundary/);
  });
}
