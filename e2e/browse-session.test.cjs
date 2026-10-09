const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./offline-loader.cjs');
const { fixture, renderRoute, category, places, city } = require('./seo-body-fixtures.cjs');

const plain = value => JSON.parse(JSON.stringify(value));

function browserFixture(address = '/en/explorer/cairo/?area=Downtown&page=2') {
  const attributes = new Map([['data-header', 'hidden']]);
  const lengths = new Map([['--site-header-height', '73px']]);
  const root = { style: { scrollBehavior: 'smooth', setProperty: (key, value) => lengths.set(key, value), getPropertyValue: key => lengths.get(key) ?? '' }, setAttribute: (key, value) => attributes.set(key, value), getAttribute: key => attributes.get(key), removeAttribute: key => attributes.delete(key) };
  const sticky = { setAttribute(key, value) { this[key] = value; }, getAttribute(key) { return this[key]; }, 'data-stuck': 'true' };
  const listeners = new Map();
  const clicks = new Map();
  const storage = new Map();
  const scrolls = [];
  const frames = [];
  const browser = {
    location: new URL(address, 'https://example.test'), scrollY: 950,
    document: { documentElement: root, querySelector: () => sticky, addEventListener: (name, callback) => clicks.set(name, callback), removeEventListener: name => clicks.delete(name) },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    history: { state: { __NA: true, tree: ['route'] }, scrollRestoration: 'auto', pushState(data, unused, target) { this.state = data; browser.location = new URL(target, browser.location); }, replaceState(data, unused, target) { this.state = data; browser.location = new URL(target, browser.location); } },
    performance: { getEntriesByType: () => [{ type: 'navigate' }] },
    getComputedStyle: () => root.style,
    scrollTo: value => { scrolls.push({ ...value, header: root.getAttribute('data-header'), stuck: sticky.getAttribute('data-stuck'), transitionOff: root.getAttribute('data-browse-restoring') }); browser.scrollY = value.top; },
    addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name),
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
  };
  const { QueryClient } = require('@tanstack/react-query');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const dependencies = { window: browser, react: { useLayoutEffect: callback => callback() } };
  const tools = load('src/lib/use-browse-session.ts', dependencies);
  return { browser, client, tools, attributes, sticky, listeners, clicks, storage, scrolls, frames };
}

test('browser integration preserves Next history state, cached pages and pre-paint scroll only on Back', async () => {
  const context = browserFixture();
  const { browser, client, tools, scrolls, listeners, clicks, storage, frames } = context;
  const first = `${browser.location.pathname}${browser.location.search}`;
  tools.prepareBrowseQueries(client);
  client.setQueryData(['places', 'list', { skip: 0 }], { items: ['first page'] });
  client.setQueryData(['places', 'list', { skip: 24 }], { items: ['second page'] });
  client.setQueryData(['saved-places'], { secret: 'private query' });
  const cleanup = tools.installBrowseSession(client);
  const firstState = browser.history.state;
  assert.equal(firstState.__NA, true);
  assert.deepEqual(firstState.tree, ['route']);
  assert.equal(browser.history.scrollRestoration, 'manual');
  const place = '/en/explorer/cairo/place/';
  clicks.get('click')({ target: { closest: () => ({ href: 'https://example.test' + place }) }, button: 0 });
  browser.scrollY = 100;
  browser.history.pushState({ __NA: true, tree: ['place'] }, '', place);
  let backwards = 0;
  tools.backToBrowse({ back: () => backwards++, push: () => assert.fail('owned previous entry should go back') }, '/en/explorer/cairo/');
  assert.equal(backwards, 1);
  browser.location = new URL(first, browser.location);
  browser.history.state = firstState;
  listeners.get('popstate')({ state: firstState });
  browser.history.replaceState(firstState, '', first);
  tools.useBrowseRestore('/en/explorer/cairo/', browser.location.searchParams.toString());
  assert.deepEqual(scrolls, [{ top: 950, behavior: 'instant', header: 'hidden', stuck: 'true', transitionOff: 'true' }]);
  assert.equal(client.getQueryData(['places', 'list', { skip: 24 }]).items[0], 'second page');
  let requests = 0;
  await client.fetchQuery({ queryKey: ['places', 'list', { skip: 24 }], queryFn: () => { requests++; return {}; }, staleTime: Infinity });
  assert.equal(requests, 0);
  assert.equal(client.getQueryCache().find({ queryKey: ['places', 'list', { skip: 24 }] }).gcTime, Infinity);
  const serialized = [...storage.values()][0];
  assert.doesNotMatch(serialized, /private query|saved-places/);
  assert.match(serialized, /second page/);
  const snapshots = JSON.parse(serialized).navigation.snapshots;
  assert.ok(snapshots.find(snapshot => snapshot.address === first).queryKeys.some(key => key[0] === 'places' && key[2]?.skip === 24));
  const resumed = browserFixture(first);
  resumed.storage.set('khargny:browse-session:v1', serialized);
  resumed.browser.history.state = firstState;
  resumed.browser.performance.getEntriesByType = () => [{ type: 'back_forward' }];
  resumed.tools.prepareBrowseQueries(resumed.client);
  assert.deepEqual(plain(resumed.client.getQueryData(['places', 'list', { skip: 24 }])), { items: ['second page'] });
  resumed.tools.useBrowseRestore('/en/explorer/cairo/', resumed.browser.location.searchParams.toString());
  assert.equal(resumed.scrolls[0].top, 950);
  resumed.client.clear();
  tools.useBrowseRestore('/en/explorer/cairo/', browser.location.searchParams.toString());
  assert.equal(scrolls.length, 1);
  while (frames.length) frames.shift()();
  assert.equal(context.attributes.has('data-browse-restoring'), false);
  browser.history.pushState({ __NA: true }, '', first);
  tools.useBrowseRestore('/en/explorer/cairo/', browser.location.searchParams.toString());
  assert.equal(scrolls.length, 1);
  cleanup();
  assert.equal(browser.history.scrollRestoration, 'auto');
  client.clear();
});

test('mounted address hook initializes all choices and preserves rapid edits despite stale router echoes', async () => {
  const React = require('react');
  const { mount } = require('./render-harness.cjs');
  let current;
  let snapshot;
  let browser;
  const listeners = new Set();
  const replacements = [];
  const harness = await mount(window => {
    browser = window;
    snapshot = window.location.search;
    const dependencies = { window, 'next/navigation': {
      useSearchParams: () => new URLSearchParams(React.useSyncExternalStore(callback => { listeners.add(callback); return () => listeners.delete(callback); }, () => snapshot)),
      useRouter: () => ({ replace(address, options) { assert.equal(options.scroll, false); assert.equal(new URL(address, window.location).href, window.location.href, 'the return address must commit before asynchronous router work'); replacements.push(address); }, push: () => assert.fail('filter changes must replace, not push') }),
    } };
    const { useBrowseAddress } = load('src/lib/use-browse-address.ts', dependencies);
    const Page = () => { current = useBrowseAddress(); return React.createElement('output', null, JSON.stringify(current.state)); };
    return React.createElement(React.Fragment, null, React.createElement(Page));
  }, '/ar/explorer/aswan/?region=Island&category=food&amenities=wifi&price=2&featured=1&q=%D9%82%D9%87%D9%88%D8%A9&page=2&campaign=summer#results');
  try {
    assert.equal(current.state.page, 2);
    assert.equal(current.state.q, '\u0642\u0647\u0648\u0629');
    assert.equal(current.isDebouncing, false);
    await React.act(async () => { current.setArea('Downtown'); current.setCategory('cafe'); current.setFilters(previous => ({ ...previous, tagIds: ['quiet'] })); });
    const written = new URL(replacements.at(-1), browser.location);
    assert.equal(written.searchParams.get('area'), 'Downtown');
    assert.equal(written.searchParams.has('region'), false);
    assert.equal(written.searchParams.get('category'), 'cafe');
    assert.equal(written.searchParams.get('tags'), 'quiet');
    assert.equal(written.searchParams.has('page'), false);
    assert.equal(written.searchParams.get('campaign'), 'summer');
    assert.equal(written.hash, '#results');
    await React.act(async () => { snapshot = new URL(replacements[0], browser.location).search; for (const listener of listeners) listener(); });
    assert.equal(current.state.category, 'cafe');
    assert.deepEqual(plain(current.state.filters.tagIds), ['quiet']);
    await React.act(async () => { current.setFilters({ featured: false, priceRange: [], amenityIds: [], tagIds: [] }); });
    assert.deepEqual(plain(current.state.filters), {}, 'empty and false values must share the server query-key shape');
    assert.equal(browser.location.searchParams.has('featured'), false);
    await React.act(async () => { current.clearFilters(); });
    assert.equal(current.state.area, 'Downtown');
    assert.equal(current.state.category, null);
    assert.deepEqual(plain(current.state.filters), {});
    browser.location = new URL('/ar/explorer/aswan/?area=Island&q=nile&page=3', browser.location);
    await harness.event('popstate');
    assert.equal(current.state.area, 'Island');
    assert.equal(current.state.q, 'nile');
    assert.equal(current.state.page, 3);
    assert.equal(current.isDebouncing, false);
  } finally { await harness.close(); }
});

for (const locale of ['ar', 'en']) test(`${locale} search and local filters are hydrated together without a first-response browse flash`, async () => {
  const query = locale === 'ar' ? '\u0642\u0647\u0648\u0629' : 'coffee';
  const search = '?area=Island&category=food&amenities=wifi&price=2&featured=1&q=' + encodeURIComponent(query);
  const context = fixture({ locale, route: '/explorer/aswan/', search });
  const original = context.dependencies.fetch;
  const chosen = { ...places[3], featured: true, amenities: [{ id: 'wifi' }] };
  let searchReads = 0;
  context.dependencies.fetch = async (address, options) => {
    const url = new URL(address);
    if (url.pathname !== '/v1/search/places') {
      assert.notEqual(url.pathname, '/v1/places', 'a filtered search must not fetch the default browse list');
      return original(address, options);
    }
    searchReads++;
    assert.equal(url.searchParams.get('q'), query);
    assert.equal(url.searchParams.get('categoryIds'), 'food');
    assert.equal(options.headers['Accept-Language'], locale);
    return { ok: true, status: 200, json: async () => ({ success: true, data: { items: [chosen], total: 1 } }) };
  };
  const markup = await renderRoute(context, 'src/app/explorer/[citySlug]/page.tsx');
  assert.match(markup, new RegExp('value="' + query + '"'));
  assert.match(markup, new RegExp(chosen.slug));
  assert.doesNotMatch(markup, new RegExp(`href="[^"]*${places[0].slug}/`));
  assert.doesNotMatch(markup, /aria-busy="true"/);
  assert.equal(searchReads, 1);
});

test('a directly opened place falls back to its city instead of leaving the site', () => {
  const { tools, client, storage } = browserFixture('/ar/explorer/cairo/place/');
  storage.set('khargny:browse-session:v1', JSON.stringify({ navigation: { index: 2, entries: [[0, '/ar/'], [1, '/ar/explorer/cairo/'], [2, '/ar/explorer/cairo/place/']], snapshots: [] } }));
  const pushes = [];
  tools.backToBrowse({ back: () => assert.fail('no owned previous entry'), push: address => pushes.push(address) }, '/ar/explorer/cairo/');
  assert.deepEqual(pushes, ['/ar/explorer/cairo/']);
  client.clear();
});

test('home rails suppress only the Back-mount refresh and keep their existing rotation clock', () => {
  const context = browserFixture('/en/');
  const hooks = load('src/lib/api/hooks/use-home-ads.ts', { window: context.browser, '@tanstack/react-query': { useQuery: options => options } });
  const rail = hooks.useFeaturedPlaces();
  assert.equal(rail.gcTime, Infinity);
  assert.equal(rail.refetchOnMount(), true);
  context.attributes.set('data-browse-back', 'true');
  assert.equal(rail.refetchOnMount(), false);
  context.attributes.delete('data-browse-back');
  assert.equal(rail.refetchOnMount(), true);
  assert.equal(rail.refetchInterval({ state: { data: null } }), 600000);
  context.client.clear();
});

test('browse addresses round-trip every filter, Arabic, page, unknown parameters and hash', () => {
  const { readBrowseAddress, writeBrowseAddress } = load('src/lib/browse-address.ts');
  const address = '/ar/explorer/cairo/?area=Garden+City&category=cafe&amenities=wifi,parking&price=1,3&featured=1&tags=quiet&q=%D9%82%D9%87%D9%88%D8%A9&page=3&campaign=summer#results';
  const state = readBrowseAddress(new URL(address, 'https://example.test').search);
  assert.deepEqual(plain(state), { area: 'Garden City', category: 'cafe', filters: { priceRange: ['1','3'], featured: true, amenityIds: ['wifi','parking'], tagIds: ['quiet'] }, q: '\u0642\u0647\u0648\u0629', page: 3 });
  const restored = new URL(writeBrowseAddress(address, state), 'https://example.test');
  assert.deepEqual(plain(readBrowseAddress(restored.search)), plain(state));
  assert.equal(restored.searchParams.get('campaign'), 'summer');
  assert.equal(restored.hash, '#results');
  const cleared = new URL(writeBrowseAddress(address, { ...state, area: null, category: null, filters: {}, q: '', page: 1 }), 'https://example.test');
  assert.equal(cleared.search, '?campaign=summer');
});

test('legacy region links, invalid values and empty filters normalize safely', () => {
  const { readBrowseAddress, writeBrowseAddress, hasBrowseFilters } = load('src/lib/browse-address.ts');
  const state = readBrowseAddress('?region=Downtown&price=0,1,6,2,1&amenities=wifi,,wifi&featured=false&page=nope');
  assert.deepEqual(plain(state), { area: 'Downtown', category: null, filters: { priceRange: ['1','2'], amenityIds: ['wifi'] }, q: '', page: 1 });
  assert.equal(writeBrowseAddress('/en/explorer/cairo/?region=Downtown', state).includes('region='), false);
  assert.equal(hasBrowseFilters('?page=2&campaign=x'), false);
  assert.equal(hasBrowseFilters('?area=Downtown'), true);
  assert.equal(hasBrowseFilters('?q=x'), true);
});

test('only a backward owned history traversal consumes a full-address scroll snapshot', () => {
  const { createBrowseSession } = load('src/lib/browse-session.ts');
  const session = createBrowseSession();
  const first = '/en/explorer/cairo/?area=Downtown&page=2';
  session.visit(first);
  session.save({ address: first, top: 950, header: 'hidden', stuck: true });
  session.push('/en/explorer/cairo/place/');
  assert.equal(session.hasPrevious(), true);
  assert.equal(session.restore(first), undefined);
  session.traverse(0, first);
  assert.deepEqual(plain(session.restore(first)), { address: first, top: 950, header: 'hidden', stuck: true });
  assert.equal(session.restore(first), undefined);
  session.push('/en/explorer/cairo/place/');
  session.traverse(0, first);
  assert.equal(session.restore('/en/explorer/cairo/?area=Downtown'), undefined);
  session.push(first);
  assert.equal(session.restore(first), undefined);
  session.traverse(1, '/en/explorer/cairo/place/');
  assert.equal(session.restore('/en/explorer/cairo/place/'), undefined);
  const direct = createBrowseSession();
  direct.visit('/en/explorer/cairo/place/');
  assert.equal(direct.hasPrevious(), false);
  const forward = createBrowseSession();
  forward.visit(first);
  forward.push('/en/explorer/cairo/place/');
  forward.save({ address: '/en/explorer/cairo/place/', top: 44, header: 'shown', stuck: false });
  forward.traverse(0, first);
  forward.traverse(1, '/en/explorer/cairo/place/');
  assert.equal(forward.restore('/en/explorer/cairo/place/'), undefined);
});

for (const locale of ['ar', 'en']) test(`filtered ${locale} address renders its controls and matching results in the first server response`, async () => {
  const search = `?area=Downtown&category=${category.id}&amenities=wifi&price=2&featured=1&campaign=summer`;
  const context = fixture({ locale, route: '/explorer/aswan', search });
  const original = context.dependencies.fetch;
  context.dependencies.fetch = async (address, options) => {
    const url = new URL(address);
    if (url.pathname !== '/v1/places') return original(address, options);
    context.calls.push({ address, options });
    assert.equal(url.searchParams.get('region'), 'Downtown');
    assert.equal(url.searchParams.get('categoryId'), category.id);
    assert.equal(url.searchParams.get('amenityIds'), 'wifi');
    assert.equal(url.searchParams.get('priceRange'), '2');
    assert.equal(url.searchParams.get('featured'), 'true');
    return { ok: true, status: 200, json: async () => ({ success: true, data: { items: [places[3]], total: 1 } }) };
  };
  context.dependencies['@/lib/api/hooks/use-taxonomy'] = { useAmenities: () => ({ data: [{ id: 'wifi', name: 'WiFi', nameEn: 'WiFi' }] }) };
  context.dependencies['@/lib/api/hooks/use-cities'] = { useCities: () => ({ data: [{ ...city, areaKeys: ['Downtown'] }] }) };
  const cityRead = context.dependencies.fetch;
  context.dependencies.fetch = async (address, options) => new URL(address).pathname === '/v1/cities/aswan'
    ? { ok: true, status: 200, json: async () => ({ success: true, data: { ...city, areaKeys: ['Downtown'] } }) }
    : cityRead(address, options);
  const markup = await renderRoute(context, 'src/app/explorer/[citySlug]/page.tsx');
  assert.match(markup, /data-area="chosen"/);
  assert.match(markup, new RegExp(locale === 'ar' ? '\u0648\u0633\u0637 \u0627\u0644\u0628\u0644\u062f' : 'Downtown'));
  assert.match(markup, /WiFi/);
  assert.match(markup, new RegExp(places[3].slug));
  assert.doesNotMatch(markup, new RegExp(`href="[^"]*${places[0].slug}/`));
  assert.equal(context.calls.filter(call => new URL(call.address).pathname === '/v1/places').length, 1);
});
