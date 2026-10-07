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
  const module = load('src/app/explorer/[citySlug]/[placeSlug]/layout.tsx', {
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
  return { ...module, decisions };
}

const args = { params: Promise.resolve({ citySlug: 'aswan', placeSlug: 'old' }), children: 'existing page' };

function cityLayout({ status = 200, failure = false, route = '/explorer/aswan', count = 0 } = {}) {
  return load('src/app/explorer/[citySlug]/layout.tsx', {
    fetch: async (url) => {
      if (failure) throw new Error('Offline simulated outage');
      if (url.includes('/places?')) return { ok: true, json: async () => ({ data: { meta: { total: count } } }) };
      return { ok: status === 200, status, json: async () => ({ data: { slug: 'aswan', name: 'Aswan', nameEn: 'Aswan' } }) };
    },
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
    'next/headers': { headers: async () => new Headers({ 'x-khargny-locale': 'en', 'x-khargny-path': route }), cookies: async () => ({ get: () => undefined }) },
    '@/lib/config': { API_BASE_URL: 'https://api.invalid', SITE_URL: 'https://web.invalid' },
  });
}

test('city metadata and server layout signal 404 only for an unknown city; empty city and API outage stay renderable', async () => {
  const missing = cityLayout({ status: 404, route: '/explorer/no-such-city-zz/' });
  const cityArgs = { params: Promise.resolve({ citySlug: 'no-such-city-zz' }), children: 'city page' };
  await assert.rejects(missing.default(cityArgs), /NOT_FOUND/);
  await assert.rejects(missing.generateMetadata(cityArgs), /NOT_FOUND/);
  for (const options of [{ count: 0 }, { status: 500 }, { failure: true }]) {
    const available = cityLayout(options);
    const currentArgs = { params: Promise.resolve({ citySlug: 'aswan' }), children: 'city page' };
    assert.match(require('react-dom/server').renderToStaticMarkup(await available.default(currentArgs)), /city page/);
    assert.ok(await available.generateMetadata(currentArgs));
  }
  const child = cityLayout({ status: 404, route: '/explorer/no-such-city-zz/old/' });
  assert.match(require('react-dom/server').renderToStaticMarkup(await child.default(cityArgs)), /city page/);
  assert.ok(await child.generateMetadata(cityArgs));
});

test('server layout invokes permanentRedirect with current slug/city, locale and original query', async () => {
  const module = layout({ slug: 'new', redirectedFrom: 'old', cityId: 'city-cairo', name: 'Venue' }, { locale: 'ar' });
  await assert.rejects(module.default(args), /REDIRECT/);
  assert.deepEqual(module.decisions, ['/ar/explorer/cairo/new/?q=roof&tag=a&tag=b']);
});

test('metadata blocks redirects before streaming; payload builds canonical, alternates and OG', async () => {
  const stale = layout({ slug: 'new', cityId: 'city-cairo', name: 'Venue' });
  await assert.rejects(stale.generateMetadata(args), /REDIRECT/);
  const current = layout({ slug: 'new', cityId: 'city-cairo', name: 'Venue' });
  const metadata = await current.generateMetadata({ params: Promise.resolve({ citySlug: 'cairo', placeSlug: 'new' }) });
  assert.equal(metadata.alternates.canonical, 'https://web.invalid/en/explorer/cairo/new/');
  assert.equal(metadata.alternates.languages['ar-EG'], 'https://web.invalid/ar/explorer/cairo/new/');
  assert.equal(metadata.alternates.languages.en, metadata.alternates.canonical);
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
  const config = fs.readFileSync(path.join(__dirname, '../next.config.ts'), 'utf8');
  assert.match(config, /htmlLimitedBots:\s*\/\.\*\//);
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

test('unknown slug signals framework 404; API failure keeps children/noindex, never redirects', async () => {
  const missing = layout(null, { status: 404 });
  await assert.rejects(missing.default(args), /NOT_FOUND/);
  await assert.rejects(missing.generateMetadata(args), /NOT_FOUND/);
  for (const options of [{ status: 503 }, { failure: true }]) {
    const failed = layout(null, options);
    const rendered = await failed.default(args);
    assert.equal(rendered.props.children, 'existing page');
    const metadata = await failed.generateMetadata(args);
    assert.equal(metadata.robots.index, false);
    assert.equal(failed.decisions.length, 0);
  }
});

test('client fallback replaces address without history push; menu uses payload slug, similar uses ID', () => {
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
  const Page = load('src/app/explorer/[citySlug]/[placeSlug]/page.tsx', {
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
    '@/lib/api/hooks/use-saved-places': { useSaveToggle: () => ({ saved: false, toggle: empty }) },
    '@/lib/analytics/track': { trackPlaceAction: empty, trackPlaceView: empty },
    '@/lib/icon-catalog': { icon: empty },
    '@/components/ds/SiteHeader': { SiteHeader: empty },
    '@/components/explorer/MediaShowcase': { MediaShowcase: empty },
    '@/components/explorer/HoursTable': { HoursTable: empty },
    '@/components/explorer/SimilarPlaces': { SimilarPlaces: empty },
    '@/components/explorer/PlaceMenuSection': { PlaceMenuSection: ({ slug }) => { menuSlugs.push(slug); return null; } },
    '@/components/explorer/LoadingSkeleton': { LoadingSkeleton: empty },
    '@/components/explorer/ErrorState': { ErrorState: empty },
    '@/components/explorer/NotFoundState': { NotFoundState: empty },
  }).default;
  require('react-dom/server').renderToStaticMarkup(React.createElement(Page));
  for (const effect of effects) effect();
  assert.equal(replacements[0].target, '/en/explorer/cairo/new/?q=roof#menu');
  assert.equal(replacements[0].options.scroll, false);
  assert.deepEqual(menuSlugs, ['new']);
  assert.deepEqual(similarIds, ['venue-id']);
  effects.length = 0;
  require('react-dom/server').renderToStaticMarkup(React.createElement(Page));
  for (const effect of effects) effect();
  assert.deepEqual(requestedSlugs, ['old', 'new']);
  assert.deepEqual(menuSlugs, ['new', 'new']);
  assert.equal(replacements.length, 1);
});
