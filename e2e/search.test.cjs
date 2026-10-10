const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { QueryClient, QueryObserver } = require('@tanstack/react-query');
const { load } = require('./offline-loader.cjs');
const { mount } = require('./render-harness.cjs');

const plain = (value) => JSON.parse(JSON.stringify(value));
const place = (id, extra = {}) => ({ id, slug: id, cityId: 'aswan', name: id, region: 'Island', priceRange: 2, featured: true, ...extra });
const envelope = (items, total) => ({ data: items, meta: { skip: 0, limit: 20, ...(total === undefined ? {} : { total }) } });

function translations(locale) {
  const dictionary = load('src/i18n/dictionaries.ts').dictionaries[locale];
  return { useI18n: () => ({ locale, t: (key, vars = {}) => Object.entries(vars).reduce((text, [name, value]) => text.replaceAll('{' + name + '}', String(value)), key.split('.').reduce((value, part) => value[part], dictionary)) }) };
}

test('two non-space characters activate search; URL preserves params, locale, hash and Arabic q', () => {
  const helpers = load('src/lib/place-search.ts');
  for (const value of ['', ' ', ' r ', 'ر  ']) assert.equal(helpers.searchTerm(value), '');
  assert.equal(helpers.searchTerm(' ر و '), 'ر و');
  assert.equal(helpers.searchTerm(' roof '), 'roof');
  const url = helpers.searchAddress('/ar/explorer/aswan/?area=island&q=old#results', 'سطح roof');
  assert.equal(new URL(url, 'https://example.invalid').searchParams.get('q'), 'سطح roof');
  assert.equal(new URL(url, 'https://example.invalid').searchParams.get('area'), 'island');
  assert.ok(url.startsWith('/ar/explorer/aswan/?'));
  assert.ok(url.endsWith('#results'));
  assert.equal(helpers.searchAddress(url, ''), '/ar/explorer/aswan/?area=island#results');
});

test('250ms debounce replaces pending input; shortening below two characters clears immediately', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let value;
  let cleanup;
  const hooks = { useState: (initial) => [value ??= initial, (next) => { value = next; }], useEffect: (effect) => { cleanup?.(); cleanup = effect(); } };
  const { useDebouncedSearch } = load('src/lib/use-search-term.ts', { react: hooks, 'next/navigation': {} });
  useDebouncedSearch('ro');
  context.mock.timers.tick(200);
  assert.equal(value.settled, '');
  useDebouncedSearch('roof');
  context.mock.timers.tick(249);
  assert.equal(value.settled, '');
  context.mock.timers.tick(1);
  assert.equal(value.settled, 'roof');
  assert.equal(useDebouncedSearch(' r '), '');
  cleanup?.();
});

async function renderedCity(context, address = '/en/explorer/aswan/') {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const requests = [];
  const addressListeners = new Set();
  let snapshot;
  let browser;
  let client;
  let releaseReply;
  let holdReplies = false;
  const harness = await mount(window => {
    browser = window;
    snapshot = browser.location.search;
    const navigation = {
      useParams: () => ({ citySlug: 'aswan' }), useRouter: () => ({ push() {}, replace(href, options) { assert.equal(options.scroll, false); assert.equal(new URL(href, browser.location).href, browser.location.href); } }),
      useSearchParams: () => new URLSearchParams(React.useSyncExternalStore(listener => { addressListeners.add(listener); return () => addressListeners.delete(listener); }, () => snapshot)),
    };
    const empty = () => null;
    const cities = [{ id:'aswan',slug:'aswan',nameEn:'Aswan',name:'Aswan' }, { id:'cairo',slug:'cairo',nameEn:'Cairo',name:'Cairo' }];
    const browse = { items:Array.from({ length:15 }, (_, index) => place('browse' + index)), total:15 };
    const dependencies = {
      window: browser, 'next/navigation': navigation,
      'next/link': { default: ({ children, href }) => React.createElement('a', { href }, children) },
      '@/i18n/LocaleProvider': translations('en'),
      '@/lib/api/hooks/use-cities': { useCities: () => ({ data:cities }) },
      '@/lib/api/hooks/use-categories': { useCategories: () => ({ data:[] }) },
      '@/lib/api/hooks/use-places': { usePlaces: () => ({ data:browse, refetch() {} }) },
      '@/lib/api/client': { apiRequest: async (method, route, options) => {
        requests.push({ route, params:plain(options.params) });
        if (holdReplies) await new Promise(resolve => { releaseReply = resolve; });
        const query = options.params;
        const item = place(query.q, { cityId:query.q === 'kidzania' ? 'cairo' : 'aswan', matchedOn:query.q === 'rooftop' ? ['amenity:Rooftop Seating'] : ['name'] });
        return envelope(query.q === 'kidzania' && query.cityId ? [] : [item], query.q === 'kidzania' && query.cityId ? 0 : 1);
      } },
      '@/components/ds/PlaceCard': { PlaceCard: ({ title, area, searchReason }) => React.createElement('article', { 'data-card':true }, title, React.createElement('span', null, area), searchReason && React.createElement('small', { 'data-search-reason':true }, searchReason)) },
      '@/lib/icon-catalog': { icon:empty },
    };
    for (const [path, name] of [['ds/SiteHeader','SiteHeader'], ['ds/CategoryChip','CategoryChip'], ['explorer/CitySelector','CitySelector'], ['explorer/RegionSelector','RegionSelector'], ['explorer/FilterPanel','FilterPanel'], ['explorer/PlaceFilters','PlaceFilters'], ['explorer/LoadingSkeleton','LoadingSkeleton'], ['explorer/ErrorState','ErrorState']]) dependencies['@/components/' + path] = { [name]:empty };
    dependencies['@/lib/use-search-term'] = load('src/lib/use-search-term.ts', dependencies);
    dependencies['@/lib/api/hooks/use-search'] = load('src/lib/api/hooks/use-search.ts', dependencies);
    const Page = load('src/app/explorer/[citySlug]/CityClient.tsx', dependencies).default;
    client = new QueryClient({ defaultOptions:{ queries:{ retry:false, gcTime:0 } } });
    return React.createElement(require('@tanstack/react-query').QueryClientProvider, { client }, React.createElement(Page));
  }, address);
  return {
    ...harness, requests,
    cards: () => harness.nodes(node => node.attributes['data-card'] === 'true'),
    async advance(ms) { await React.act(async () => context.mock.timers.tick(ms)); await React.act(async () => context.mock.timers.tick(0)); },
    async flushAddress() { await React.act(async () => { snapshot = browser.location.search; for (const listener of addressListeners) listener(); }); },
    hold() { holdReplies = true; },
    async release() { holdReplies = false; await React.act(async () => releaseReply()); await this.advance(0); },
    async close() { await harness.close(); client.clear(); },
  };
}

test('rendered city input owns five rapid changes despite lagging URL; one settled full-term request and write', async context => {
  const harness = await renderedCity(context, '/en/explorer/aswan/?sort=name#results');
  try {
    for (const value of ['M', 'Mo', 'Mov', 'Move', 'Moven']) {
      await harness.change(value);
      await harness.rerender();
      assert.equal(harness.props(harness.input()).value, value);
      assert.equal(harness.input().value, value);
      assert.equal(harness.requests.length, 0);
      await harness.advance(60);
    }
    await harness.advance(189);
    assert.equal(harness.requests.length, 0);
    assert.equal(harness.browser.location.searchParams.has('q'), false);
    await harness.advance(11);
    assert.equal(harness.requests.length, 1);
    assert.equal(harness.requests[0].params.q, 'Moven');
    assert.equal(harness.requests[0].params.cityId, 'aswan');
    assert.equal(harness.browser.location.searchParams.get('q'), 'Moven');
    assert.equal(harness.browser.location.searchParams.get('sort'), 'name');
    assert.equal(harness.browser.location.hash, '#results');
    assert.equal(harness.writes.length, 1);
    assert.equal(harness.cards().length, 1);
    assert.match(harness.container.textContent, /1 places match.*Moven/);
    await harness.change('Movenp');
    await harness.flushAddress();
    assert.equal(harness.input().value, 'Movenp');
  } finally { await harness.close(); }
});

test('rendered shared nile search switches to browse below two characters and retains the exact address text', async context => {
  const harness = await renderedCity(context, '/en/explorer/aswan/?q=nile&sort=name#results');
  try {
    assert.equal(harness.input().value, 'nile');
    await harness.advance(250);
    assert.equal(harness.requests.length, 1);
    assert.equal(harness.cards().length, 1);
    await harness.change('a');
    assert.equal(harness.input().value, 'a');
    assert.equal(harness.cards().length, 15);
    assert.equal(harness.browser.location.searchParams.get('q'), 'a');
    assert.equal(harness.browser.location.searchParams.get('sort'), 'name');
    await harness.flushAddress();
    assert.equal(harness.input().value, 'a');
  } finally { await harness.close(); }
});

test('rendered hook distinguishes its own delayed echo from in-app navigation and back/forward popstate', async context => {
  const harness = await renderedCity(context, '/en/explorer/aswan/?q=nile&sort=name#results');
  try {
    await harness.advance(250);
    await harness.change('rooftop');
    await harness.advance(250);
    await harness.flushAddress();
    await harness.change('rooftopp');
    assert.equal(harness.input().value, 'rooftopp');
    harness.browser.location = new URL('/en/explorer/aswan/?q=kidzania&sort=name#results', harness.browser.location);
    await harness.flushAddress();
    assert.equal(harness.input().value, 'kidzania');
    await harness.advance(250);
    assert.match(harness.container.textContent, /In other cities/);
    assert.match(harness.container.textContent, /Cairo/);
    harness.browser.location = new URL('/en/explorer/aswan/?q=nile&sort=name#results', harness.browser.location);
    await harness.event('popstate');
    assert.equal(harness.input().value, 'nile');
    await harness.advance(250);
    assert.equal(harness.cards().length, 1);
    harness.browser.location = new URL('/en/explorer/aswan/?q=kidzania&sort=name#results', harness.browser.location);
    await harness.event('popstate');
    assert.equal(harness.input().value, 'kidzania');
    await harness.flushAddress();
    await harness.advance(250);
    assert.match(harness.container.textContent, /In other cities/);
  } finally { await harness.close(); }
});

test('rendered request flow keeps prior cards dimmed, shows rooftop reason and city fallback; clear resets and focuses', async context => {
  const harness = await renderedCity(context);
  try {
    await harness.change('Moven');
    await harness.advance(250);
    assert.match(harness.cards()[0].textContent, /^Moven/);
    harness.hold();
    await harness.change('rooftop');
    assert.match(harness.cards()[0].textContent, /^Moven/);
    assert.equal(Number(harness.nodes(node => node.attributes['aria-busy'] === 'true')[0].style.opacity), 0.5);
    await harness.advance(250);
    assert.match(harness.cards()[0].textContent, /^Moven/);
    await harness.release();
    assert.match(harness.container.textContent, /Rooftop Seating/);
    assert.match(harness.container.textContent, /1 places match.*rooftop/);
    await harness.change('kidzania');
    await harness.advance(250);
    assert.equal(harness.cards().length, 1);
    assert.match(harness.container.textContent, /In other cities/);
    assert.match(harness.container.textContent, /Cairo/);
    const fallback = harness.requests.filter(request => request.params.q === 'kidzania');
    assert.equal(fallback.length, 2);
    assert.equal(fallback[0].params.cityId, 'aswan');
    assert.equal(fallback[1].params.cityId, undefined);
    const clear = harness.nodes(node => node.attributes['aria-label'] === 'Clear search')[0];
    clear.focus();
    await React.act(async () => harness.props(clear).onClick());
    assert.equal(harness.input().value, '');
    assert.equal(harness.browser.location.searchParams.has('q'), false);
    assert.equal(harness.cards().length, 15);
    assert.equal(harness.document.activeElement, harness.input());
    assert.doesNotMatch(harness.container.textContent, /In other cities|places match/);
    await harness.advance(250);
    assert.equal(harness.requests.length, 4);
  } finally { await harness.close(); }
});

test('search hook sends city, category, rating and distance with q, locale and abort signal', async () => {
  let options;
  const requests = [];
  const { useSearchPlaces } = load('src/lib/api/hooks/use-search.ts', {
    '@tanstack/react-query': { useQuery: (value) => { options = value; return {}; } },
    '@/lib/api/client': { apiRequest: async (method, route, opts) => { requests.push({ method, route, ...opts }); return envelope([place('one')], 1); } },
  });
  const query = { q: 'roof', cityId: 'aswan', categoryIds: ['cafe'], ratingMin: 3, ratingMax: 5, lat: 24, lng: 32, radiusKm: 8, skip: 0, limit: 20 };
  useSearchPlaces(query, { locale: 'en', enabled: true });
  const signal = new AbortController().signal;
  await options.queryFn({ signal });
  assert.deepEqual(plain(requests[0].params), { ...query, platform: 'web', locale: 'en' });
  assert.equal(requests[0].headers['Accept-Language'], 'en');
  assert.equal(requests[0].signal, signal);
  useSearchPlaces({ q: 'r', cityId: 'aswan' }, { enabled: true, locale: 'en' });
  assert.equal(options.enabled, false);
  useSearchPlaces({ q: 'roof' }, { enabled: false, locale: 'en' });
  assert.equal(options.enabled, false);
});

test('older reply cannot replace newer query even if transport ignores cancellation', async () => {
  let options;
  const resolvers = {};
  const { useSearchPlaces } = load('src/lib/api/hooks/use-search.ts', {
    '@tanstack/react-query': { useQuery: (value) => { options = value; return {}; } },
    '@/lib/api/client': { apiRequest: (method, route, opts) => new Promise((resolve) => { resolvers[opts.params.q] = resolve; }) },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useSearchPlaces({ q: 'old', cityId: 'aswan', limit: 20 }, { locale: 'en' });
  const observer = new QueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  useSearchPlaces({ q: 'new', cityId: 'aswan', limit: 20 }, { locale: 'en' });
  observer.setOptions(options);
  resolvers.new(envelope([place('new')], 1));
  await new Promise(setImmediate);
  assert.equal(observer.getCurrentResult().data.items[0].id, 'new');
  resolvers.old(envelope([place('old')], 1));
  await new Promise(setImmediate);
  assert.equal(observer.getCurrentResult().data.items[0].id, 'new');
  unsubscribe();
  client.clear();
});

test('local filters cover area, price, featured, amenities and tags, enrichment and later pages', async () => {
  const { loadSearchPage } = load('src/lib/place-search.ts');
  const requests = [];
  const rows = Array.from({ length: 21 }, (_, index) => place('p' + index, { region: index === 20 ? 'Island' : 'Other' }));
  const request = async (route, params) => {
    requests.push({ route, params });
    if (route.startsWith('/v1/places/')) return { ...rows[20], amenities: [{ id: 'roof' }], tags: [{ id: 'family' }] };
    return envelope(rows.slice(params.skip, params.skip + params.limit), rows.length);
  };
  const data = await loadSearchPage({ q: 'roof', cityId: 'aswan', limit: 20, skip: 0 }, { region: 'Island', priceRange: ['2'], featured: true, amenityIds: ['roof'], tagIds: ['family'] }, request);
  assert.deepEqual(plain(data.items.map((item) => item.id)), ['p20']);
  assert.equal(data.total, 1);
  assert.ok(requests.some((item) => item.params?.skip === 20));
  assert.ok(requests.some((item) => item.route === '/v1/places/p20'));
});

test('fallback repeats supported query without cityId, excludes this city and limits to six', async () => {
  const { loadSearchPage } = load('src/lib/place-search.ts');
  const requests = [];
  const request = async (route, params) => {
    requests.push(params);
    return params.cityId ? envelope([], 0) : envelope([place('same'), ...Array.from({ length: 8 }, (_, index) => place('other' + index, { cityId: 'cairo' }))], 9);
  };
  const query = { q: 'roof', cityId: 'aswan', categoryIds: ['cafe'], ratingMin: 3, limit: 20, skip: 0 };
  const data = await loadSearchPage(query, {}, request);
  assert.equal(data.items.length, 0);
  assert.equal(data.otherCities.length, 6);
  assert.equal(data.otherCities.every((item) => item.cityId === 'cairo'), true);
  assert.equal(requests[1].cityId, undefined);
  assert.deepEqual(plain(requests[1].categoryIds), ['cafe']);
  assert.equal(requests[1].q, 'roof');
  assert.equal(requests[1].ratingMin, 3);
  const empty = await loadSearchPage(query, {}, async () => envelope([], 0));
  assert.equal(empty.otherCities.length, 0);
});

test('paging uses supplied total or accumulates twenty at a time without a total', async () => {
  const { loadSearchPage } = load('src/lib/place-search.ts');
  const rows = Array.from({ length: 45 }, (_, index) => place('p' + index));
  const request = async (route, params) => envelope(rows.slice(params.skip, params.skip + params.limit));
  const first = await loadSearchPage({ q: 'roof', cityId: 'aswan', skip: 0, limit: 20 }, {}, request);
  assert.equal(first.items.length, 20);
  assert.equal(first.total, undefined);
  assert.equal(first.hasMore, true);
  const more = await loadSearchPage({ q: 'roof', cityId: 'aswan', skip: 20, limit: 20 }, {}, request);
  assert.equal(more.items.length, 40);
  assert.equal(more.hasMore, true);
  const last = await loadSearchPage({ q: 'roof', cityId: 'aswan', skip: 40, limit: 20 }, {}, request);
  assert.equal(last.items.length, 45);
  assert.equal(last.hasMore, false);
  const paged = await loadSearchPage({ q: 'roof', cityId: 'aswan', skip: 20, limit: 20 }, {}, async (route, params) => envelope(rows.slice(params.skip, params.skip + params.limit), 45));
  assert.equal(paged.items.length, 20);
  assert.equal(paged.total, 45);
});

test('locally filtered pagination reuses one dataset key and selects pages without another scan', async () => {
  let options;
  const rows = Array.from({ length: 25 }, (_, index) => place('p' + index));
  const { useSearchPlaces } = load('src/lib/api/hooks/use-search.ts', {
    '@tanstack/react-query': { useQuery: (value) => { options = value; return {}; } },
    '@/lib/api/client': { apiRequest: async (method, route, opts) => envelope(rows.slice(opts.params.skip, opts.params.skip + opts.params.limit), 25) },
  });
  const query = { q: 'roof', cityId: 'aswan', limit: 20 };
  const local = { region: 'Island' };
  useSearchPlaces({ ...query, skip: 0 }, { locale: 'en', local });
  const firstKey = plain(options.queryKey);
  const dataset = await options.queryFn({ signal: new AbortController().signal });
  assert.equal(options.select(dataset).items.length, 20);
  useSearchPlaces({ ...query, skip: 20 }, { locale: 'en', local });
  assert.deepEqual(plain(options.queryKey), firstKey);
  assert.equal(options.select(dataset).items.length, 5);
  assert.equal(options.select(dataset).total, 25);
});

test('reason is one non-name/city label; empty reasons leave no reserved line', () => {
  const { matchReason } = load('src/lib/place-search.ts');
  assert.equal(matchReason(['name', 'amenity:Rooftop Seating']), '');
  assert.equal(matchReason(['city:Aswan']), '');
  assert.equal(matchReason(['city:Aswan', 'amenity:Rooftop Seating', 'tag:Family Friendly']), 'Rooftop Seating');
  assert.equal(matchReason(['tag:Family Friendly']), 'Family Friendly');
  const { PlaceCard } = load('src/components/ds/PlaceCard.tsx', {
    '@/i18n/LocaleProvider': translations('en'),
    'next/link': { default: ({ children, prefetch, ...props }) => React.createElement('a', props, children) },
    '@/lib/api/hooks/use-saved-places': { useSaveToggle: () => ({ saved: false, toggle: () => {} }) },
  });
  const props = { title: 'Venue', area: 'Aswan' };
  const markup = renderToStaticMarkup(React.createElement(PlaceCard, { ...props, searchReason: 'Rooftop Seating' }));
  assert.match(markup, /data-search-reason/);
  assert.match(markup, /Rooftop Seating/);
  assert.match(fs.readFileSync('src/components/ds/PostCard.module.css', 'utf8'), /line-height: 1.35/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(PlaceCard, props)), /data-search-reason/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(PlaceCard, { ...props, searchReason: '' })), /data-search-reason/);
});

function renderCity(locale, result, extra = {}) {
  const empty = () => null;
  let captured;
  const dependencies = {
    react: React,
    'next/navigation': { useParams: () => ({ citySlug: 'aswan' }), useRouter: () => ({ push: empty }), useSearchParams: () => new URLSearchParams('?q=roof') },
    'next/link': { default: ({ children, prefetch, ...props }) => React.createElement('a', props, children) },
    '@/i18n/LocaleProvider': translations(locale),
    '@/lib/use-browse-address': { useBrowseAddress: () => ({ state: { q: 'roof', category: extra.category ?? null, area: extra.region ?? null, filters: extra.filters ?? {}, page: 1 }, debouncedSearch: 'roof', isDebouncing: false, setSearch: empty, setCategory: empty, setArea: empty, setFilters: empty, clearFilters: empty, setPage: empty }) },
    '@/lib/api/hooks/use-cities': { useCities: () => ({ data: [{ id: 'aswan', slug: 'aswan', name: 'أسوان', nameEn: 'Aswan', areaKeys: ['Island'] }, { id: 'cairo', slug: 'cairo', name: 'القاهرة', nameEn: 'Cairo' }] }) },
    '@/lib/api/hooks/use-categories': { useCategories: () => ({ data: [] }) },
    '@/lib/api/hooks/use-places': { usePlaces: () => ({ data: { items: [place('browse')], total: 1 } }) },
    '@/lib/api/hooks/use-search': { useSearchPlaces: (query, options) => { captured = { query, options }; return { data: result, isFetching: extra.loading ?? false, isError: false }; } },
    '@/lib/api/hooks/use-saved-places': { useSaveToggle: () => ({ saved: false, toggle: empty }) },
    '@/lib/icon-catalog': { icon: empty },
    '@/lib/api/hooks/use-taxonomy': { useAmenities: () => ({ data: [{ id: 'roof', name: 'روف', nameEn: 'Rooftop Seating' }] }) },
    '@/lib/price-bands': { priceBandLabel: (level) => `band ${level}` },
    '@/components/ds/SiteHeader': { SiteHeader: empty },
    '@/components/explorer/CitySelector': { CitySelector: empty },
    '@/components/explorer/RegionSelector': { RegionSelector: empty },
    '@/components/explorer/FilterPanel': { FilterPanel: empty },
    '@/components/explorer/PlaceFilters': { PlaceFilters: empty },
    '@/components/explorer/LoadingSkeleton': { LoadingSkeleton: () => React.createElement('div', null, 'skeleton') },
    '@/components/explorer/ErrorState': { ErrorState: empty },
  };
  const Page = load('src/app/explorer/[citySlug]/CityClient.tsx', dependencies).default;
  const markup = renderToStaticMarkup(React.createElement(Page));
  return { markup, captured };
}

test('actual city page wires category/local filters, localized count and clear, and dims previous cards', () => {
  for (const locale of ['ar', 'en']) {
    const { markup, captured } = renderCity(locale, { items: [place('one', { matchedOn: ['amenity:Rooftop Seating'] })], total: 7, otherCities: [], hasMore: false }, { category: 'cafe', region: 'Island', filters: { amenityIds: ['roof'], tagIds: ['family'], featured: true }, loading: true });
    assert.equal(captured.query.cityId, 'aswan');
    assert.deepEqual(plain(captured.query.categoryIds), ['cafe']);
    assert.deepEqual(plain(captured.options.local), { region: 'Island', amenityIds: ['roof'], tagIds: ['family'], featured: true });
    assert.equal(captured.options.enabled, true);
    assert.match(markup, /opacity:0.5/);
    assert.match(markup, /aria-busy="true"/);
    assert.match(markup, /Rooftop Seating/);
    assert.ok(markup.includes(locale === 'ar' ? '7 مكان مطابق' : '7 places match'));
    assert.ok(markup.includes(locale === 'ar' ? 'امسح البحث' : 'Clear search'));
    assert.doesNotMatch(markup, /skeleton/);
  }
});

test('actual empty search renders other-city links/names or an honest global-empty clear action', () => {
  for (const locale of ['ar', 'en']) {
    const result = { items: [], total: 0, hasMore: false, otherCities: [place('cairo-place', { cityId: 'cairo' })] };
    const { markup } = renderCity(locale, result);
    assert.ok(markup.includes(locale === 'ar' ? 'في مدن تانية' : 'In other cities'));
    assert.ok(markup.includes(locale === 'ar' ? 'القاهرة' : 'Cairo'));
    assert.ok(markup.includes(`href="/${locale}/explorer/cairo/cairo-place/"`));
    assert.doesNotMatch(markup, /data-search-reason/);
    const waiting = renderCity(locale, result, { loading: true }).markup;
    assert.match(waiting, /cairo-place/);
    assert.match(waiting, /opacity:0.5/);
    const empty = renderCity(locale, { ...result, otherCities: [] }).markup;
    assert.ok(empty.includes(locale === 'ar' ? 'مفيش أماكن مطابقة في المدن التانية كمان.' : 'No matching places in other cities either.'));
  }
});
