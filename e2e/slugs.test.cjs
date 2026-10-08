const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { load } = require('./offline-loader.cjs');

test('redirect decisions: same, slug, city, both, locale, repeated query, slash and loop protection', () => {
  const { placeRedirect } = load('src/lib/place-address.ts');
  const request = { citySlug: 'aswan', placeSlug: 'old', locale: 'en', search: '?q=roof&tag=a&tag=b' };
  assert.equal(placeRedirect(request, { slug: 'old', citySlug: 'aswan' }), null);
  assert.equal(placeRedirect(request, { slug: 'new', citySlug: 'aswan' }), '/en/explorer/aswan/new/?q=roof&tag=a&tag=b');
  assert.equal(placeRedirect(request, { slug: 'old', citySlug: 'cairo' }), '/en/explorer/cairo/old/?q=roof&tag=a&tag=b');
  assert.equal(placeRedirect({ ...request, locale: 'ar' }, { slug: 'new', citySlug: 'cairo', redirectedFrom: 'old' }), '/ar/explorer/cairo/new/?q=roof&tag=a&tag=b');
  assert.equal(placeRedirect(request, { slug: 'old', citySlug: 'aswan', redirectedFrom: 'earlier' }), null);
  assert.equal(placeRedirect(request, {}), null);
});

function layout(place, { status = 200, locale = 'en', failure = false, redirectThrows = true } = {}) {
  const decisions = [];
  const headers = new Headers({ 'x-khargny-locale': locale, 'x-khargny-path': '/explorer/aswan/old', 'x-khargny-search': '?q=roof&tag=a&tag=b' });
  const layoutModule = load('src/app/explorer/[citySlug]/[placeSlug]/layout.tsx', {
    fetch: async (url) => {
      if (failure) throw new Error('Offline simulated outage');
      if (url.endsWith('/v1/cities')) return { ok: true, json: async () => ({ data: [{ id: 'city-aswan', slug: 'aswan', name: 'Aswan' }, { id: 'city-cairo', slug: 'cairo', name: 'Cairo' }] }) };
      if (url.includes('/v1/cities/')) return { ok: true, json: async () => ({ data: { name: 'Aswan', nameEn: 'Aswan' } }) };
      if (url.endsWith('/v1/categories')) return { ok: true, json: async () => ({ data: [] }) };
      return { ok: status === 200, status, json: async () => ({ data: place }) };
    },
    'next/headers': { headers: async () => headers, cookies: async () => ({ get: () => undefined }) },
    'next/navigation': { permanentRedirect: (target) => { decisions.push(target); if (redirectThrows) throw new Error('REDIRECT:' + target); }, notFound: () => { throw new Error('NOT_FOUND'); } },
    '@/lib/config': { API_BASE_URL: 'https://api.invalid', SITE_URL: 'https://web.invalid' },
  });
  return { ...layoutModule, decisions };
}

const args = { params: Promise.resolve({ citySlug: 'aswan', placeSlug: 'old' }), children: 'existing page' };

function cityLayout({ status = 200, failure = false, route = '/explorer/aswan', count = 0 } = {}) {
  return load('src/app/explorer/[citySlug]/layout.tsx', {
    fetch: async (url) => {
      if (failure) throw new Error('Offline simulated outage');
      if (url.includes('/places?')) return { ok: true, json: async () => ({ data: { data: [], meta: { total: count } } }) };
      const city = { id: 'aswan', slug: 'aswan', name: 'Aswan', nameEn: 'Aswan' };
      const data = url.endsWith('/v1/cities') ? [city] : url.endsWith('/v1/categories') ? [] : city;
      return { ok: status === 200, status, json: async () => ({ data }) };
    },
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
    'next/headers': { headers: async () => new Headers({ 'x-khargny-locale': 'en', 'x-khargny-path': route }), cookies: async () => ({ get: () => undefined }) },
    '@/lib/config': { API_BASE_URL: 'https://api.invalid', SITE_URL: 'https://web.invalid' },
  });
}

test('city metadata and layout keep unknown 404 and empty cities, but reject outages before rendering', async () => {
  const missing = cityLayout({ status: 404, route: '/explorer/no-such-city-zz/' });
  const cityArgs = { params: Promise.resolve({ citySlug: 'no-such-city-zz' }), children: 'city page' };
  await assert.rejects(missing.default(cityArgs), /NOT_FOUND/);
  await assert.rejects(missing.generateMetadata(cityArgs), /NOT_FOUND/);
  for (const options of [{ count: 0 }]) {
    const available = cityLayout(options);
    const currentArgs = { params: Promise.resolve({ citySlug: 'aswan' }), children: 'city page' };
    assert.match(require('react-dom/server').renderToStaticMarkup(await available.default(currentArgs)), /city page/);
    assert.ok(await available.generateMetadata(currentArgs));
  }
  for (const options of [{ status: 500 }, { failure: true }]) {
    const failed = cityLayout(options);
    const currentArgs = { params: Promise.resolve({ citySlug: 'aswan' }), children: 'city page' };
    await assert.rejects(failed.default(currentArgs), /status 500|Offline/);
    await assert.rejects(failed.generateMetadata(currentArgs), /status 500|Offline/);
  }
  const child = cityLayout({ status: 404, route: '/explorer/no-such-city-zz/old/' });
  assert.match(require('react-dom/server').renderToStaticMarkup(await child.default(cityArgs)), /city page/);
  assert.ok(await child.generateMetadata(cityArgs));
});

test('server layout invokes permanentRedirect with current slug/city, locale and original query', async () => {
  const layoutModule = layout({ slug: 'new', redirectedFrom: 'old', cityId: 'city-cairo', name: 'Venue' }, { locale: 'ar' });
  await assert.rejects(layoutModule.default(args), /REDIRECT/);
  assert.deepEqual(layoutModule.decisions, ['/ar/explorer/cairo/new/?q=roof&tag=a&tag=b']);
});

test('metadata blocks redirects before streaming; payload builds canonical, alternates and OG', async () => {
  const stale = layout({ slug: 'new', cityId: 'city-cairo', name: 'Venue' });
  await assert.rejects(stale.generateMetadata(args), /REDIRECT/);
  const current = layout({ slug: 'new', cityId: 'city-cairo', name: 'Venue' });
  const metadata = await current.generateMetadata({ params: Promise.resolve({ citySlug: 'cairo', placeSlug: 'new' }) });
  assert.equal(metadata.alternates.canonical, 'https://web.invalid/en/explorer/cairo/new/');
  assert.equal(metadata.alternates.languages.ar, 'https://web.invalid/ar/explorer/cairo/new/');
  assert.equal(metadata.alternates.languages.en, metadata.alternates.canonical);
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
  const config = fs.readFileSync(path.join(__dirname, '../next.config.ts'), 'utf8');
  // Crawlers get blocking metadata; people's browsers must not (it made every tap wait for the server).
  assert.match(config, /htmlLimitedBots:\s*CRAWLERS/);
  const crawlers = new RegExp(config.match(/const CRAWLERS =\s*\/(.+)\/i;/)[1], 'i');
  for (const bot of ['Googlebot/2.1', 'facebookexternalhit/1.1', 'WhatsApp/2.23', 'TelegramBot', 'Twitterbot/1.0', 'bingbot/2.0', 'curl/8.5.0']) assert.ok(crawlers.test(bot), bot);
  for (const person of [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 Instagram 390.0.0.28.85',
  ]) assert.ok(!crawlers.test(person), person);
  const observable = layout({ slug: 'new', cityId: 'city-cairo', name: 'Venue' }, { redirectThrows: false });
  const aliasMetadata = await observable.generateMetadata(args);
  assert.equal(aliasMetadata.alternates.canonical, metadata.alternates.canonical);
  assert.equal(aliasMetadata.openGraph.url, metadata.openGraph.url);
  const rendered = await observable.default(args);
  const markup = require('react-dom/server').renderToStaticMarkup(rendered);
  assert.ok(markup.includes('https://web.invalid/en/explorer/cairo/new/'));
  assert.ok(markup.includes('https://web.invalid/en/explorer/cairo/'));
  assert.ok(!markup.includes('/aswan/old'));
});

test('unknown slug signals framework 404; API failure rejects before body or metadata and never redirects', async () => {
  const missing = layout(null, { status: 404 });
  await assert.rejects(missing.default(args), /NOT_FOUND/);
  await assert.rejects(missing.generateMetadata(args), /NOT_FOUND/);
  for (const options of [{ status: 503 }, { failure: true }]) {
    const failed = layout(null, options);
    await assert.rejects(failed.default(args), /status 503|offline/i);
    await assert.rejects(failed.generateMetadata(args), /status 503|offline/i);
    assert.equal(failed.decisions.length, 0);
  }
});

test('old city redirects in both languages with the whole query and trailing slash', async () => {
  const { dependencies, city } = require('./seo-fixtures.cjs');
  const { getRedirectStatusCodeFromError, getURLFromRedirectError } = require('next/dist/client/components/redirect');
  for (const locale of ['ar', 'en']) {
    const deps = dependencies({ locale, route: '/explorer/alqahrh/', search: '?q=roof&tag=a&tag=b&area=a%2Fb' });
    deps['next/navigation'] = require('next/navigation');
    const layoutModule = load('src/app/explorer/[citySlug]/layout.tsx', deps);
    const cityArgs = { params: Promise.resolve({ citySlug: 'alqahrh' }), children: 'city page' };
    const target = `/${locale}/explorer/${city.slug}/?q=roof&tag=a&tag=b&area=a%2Fb`;
    const redirect = (error) => getRedirectStatusCodeFromError(error) === 308 && getURLFromRedirectError(error) === target;
    await assert.rejects(layoutModule.default(cityArgs), redirect);
    await assert.rejects(layoutModule.generateMetadata(cityArgs), redirect);
  }
});

test('an API failure envelope cannot redirect an old city or signal a missing city', async () => {
  const { dependencies, city } = require('./seo-fixtures.cjs');
  const deps = dependencies({ route: '/explorer/alqahrh/', fetch: async () => ({
    ok: true, json: async () => ({ success: false, data: city }),
  }) });
  const layoutModule = load('src/app/explorer/[citySlug]/layout.tsx', deps);
  const cityArgs = { params: Promise.resolve({ citySlug: 'alqahrh' }), children: 'city page' };
  await assert.rejects(layoutModule.default(cityArgs), (error) => error.status === 502);
  await assert.rejects(layoutModule.generateMetadata(cityArgs), (error) => error.status === 502);
});

test('old city plus old place redirects once, directly to both current slugs', async () => {
  const { dependencies } = require('./seo-fixtures.cjs');
  const redirects = [];
  const deps = dependencies({ locale: 'ar', route: '/explorer/alqahrh/old-place/', search: '?q=tea&tag=a&tag=b' });
  deps['next/navigation'].permanentRedirect = (target) => { redirects.push(target); throw new Error('REDIRECT:' + target); };
  const cityArgs = { params: Promise.resolve({ citySlug: 'alqahrh', placeSlug: 'old-place' }), children: 'place page' };
  const parent = load('src/app/explorer/[citySlug]/layout.tsx', deps);
  await parent.default(cityArgs);
  await parent.generateMetadata(cityArgs);
  assert.equal(redirects.length, 0);
  const detail = load('src/app/explorer/[citySlug]/[placeSlug]/layout.tsx', deps);
  await assert.rejects(detail.default(cityArgs), /REDIRECT/);
  assert.deepEqual(redirects, ['/ar/explorer/cairo/new-place/?q=tea&tag=a&tag=b']);
});

test('legacy region resolver uses the fetched city slug after a rename, never a literal slug', () => {
  const { getRegionToCitySlug } = load('src/lib/regions.ts');
  assert.equal(getRegionToCitySlug('Cairo & Giza', [{ name: 'القاهرة', nameEn: 'Cairo', slug: 'renamed-cairo' }]), 'renamed-cairo');
  assert.equal(getRegionToCitySlug('Cairo & Giza', []), null);
});

test('client fallback replaces address without history push; menu uses payload slug; no similar request', () => {
  const React = require('react');
  const empty = () => null;
  const effects = [];
  const replacements = [];
  const menuSlugs = [];
  const similarIds = [];
  const requestedSlugs = [];
  let address = { citySlug: 'aswan', placeSlug: 'old' };
  const place = { id: 'venue-id', cityId: 'city-cairo', slug: 'new', name: 'Venue', hasMenu: true, images: [], rating: 0 };
  const dictionary = load('src/i18n/dictionaries.ts').dictionaries.en;
  const pageDependencies = {
    react: { ...React, useEffect: (effect) => { effects.push(effect); } },
    window: { location: { search: '?q=roof', hash: '#menu' } },
    'next/navigation': { useParams: () => address, useRouter: () => ({ replace: (target, options) => {
      replacements.push({ target, options });
      const parts = new URL(target, 'https://web.invalid').pathname.split('/').filter(Boolean);
      address = { citySlug: parts[2], placeSlug: parts[3] };
    }, push: () => { throw new Error('Must not push'); }, back: empty }) },
    '@/i18n/LocaleProvider': { useI18n: () => ({ locale: 'en', t: (key) => key.split('.').reduce((value, part) => value?.[part], dictionary) ?? key }) },
    '@/lib/api/hooks/use-places': { usePlace: (slug) => { requestedSlugs.push(slug); return { data: place }; }, useSimilarPlaces: (id) => { similarIds.push(id); return { data: [] }; } },
    '@/lib/api/hooks/use-cities': { useCities: () => ({ data: [{ id: 'city-cairo', slug: 'cairo', name: 'Cairo' }] }) },
    '@/lib/api/hooks/use-categories': { useCategories: () => ({ data: [] }) },
    '@/lib/api/hooks/use-saved-places': { useSaveToggle: () => ({ saved: false, toggle: empty }) },
    '@/lib/analytics/track': { trackPlaceAction: empty, trackPlaceView: empty },
    '@/lib/icon-catalog': { icon: empty },
    '@/components/ds/SiteHeader': { SiteHeader: empty },
    '@/components/explorer/MediaShowcase': { MediaShowcase: empty, usePlaceGallery: () => ({ warm: empty, open: empty, error: false }) },
    '@/components/explorer/HoursTable': { HoursTable: empty },
    '@/components/explorer/SimilarPlaces': { SimilarPlaces: empty },
    '@/components/explorer/PlaceMenuSection': { PlaceMenuSection: ({ slug }) => { menuSlugs.push(slug); return null; } },
    '@/components/explorer/LoadingSkeleton': { LoadingSkeleton: empty },
    '@/components/explorer/ErrorState': { ErrorState: empty },
    '@/components/explorer/NotFoundState': { NotFoundState: empty },
  };
  const Page = load('src/app/explorer/[citySlug]/[placeSlug]/PlaceClient.tsx', pageDependencies).default;
  // The related rail is rendered on the server from the city's list (cards with photos); the
  // client no longer asks the similar-places endpoint, which carries no photo.
  const Related = () => null;
  const Menu = pageDependencies['@/components/explorer/PlaceMenuSection'].PlaceMenuSection;
  const element = () => React.createElement(Page, { menu: React.createElement(Menu, { slug: place.slug }), related: React.createElement(Related, { id: place.id, citySlug: 'cairo' }) });
  require('react-dom/server').renderToStaticMarkup(element());
  for (const effect of effects) effect();
  assert.equal(replacements[0].target, '/en/explorer/cairo/new/?q=roof#menu');
  assert.equal(replacements[0].options.scroll, false);
  assert.deepEqual(menuSlugs, ['new']);
  assert.deepEqual(similarIds, []);
  effects.length = 0;
  require('react-dom/server').renderToStaticMarkup(element());
  for (const effect of effects) effect();
  assert.deepEqual(requestedSlugs, ['old', 'new']);
  assert.deepEqual(menuSlugs, ['new', 'new']);
  assert.equal(replacements.length, 1);
});
