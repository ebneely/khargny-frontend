const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { mount } = require('./render-harness.cjs');
const { load } = require('./offline-loader.cjs');
const id = '11111111-1111-4111-8111-111111111111';
const cityId = '22222222-2222-4222-8222-222222222222';

function translations(locale) {
  const dict = load('src/i18n/dictionaries.ts').dictionaries[locale];
  return { useI18n: () => ({ locale, t: (key, vars = {}) => Object.entries(vars).reduce((text, [name, value]) => text.replaceAll('{' + name + '}', String(value)), key.split('.').reduce((value, part) => value[part], dict)) }) };
}

test('like HTML is visitor-independent; hydrated buttons share state, count, translated labels and stop link propagation', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  for (const locale of ['ar', 'en']) {
    const writes = [];
    const { createLikeStore } = load('src/lib/likes.ts', { '@/lib/api/client': {} });
    const store = createLikeStore(async (method, path) => {
      if (path === '/v1/likes/state') return { [id]: { liked: false, likeCount: 0 } };
      if (path === '/v1/likes/mine') return { data: [], meta: { has_more: false, skip: 0, limit: 100 } };
      writes.push(method); return { liked: true, likeCount: 1200 };
    });
    const dependencies = { '@/lib/likes': { likeStore: store }, '@/i18n/LocaleProvider': translations(locale) };
    const { LikeButton } = load('src/components/ds/LikeButton.tsx', dependencies);
    const button = () => React.createElement(LikeButton, { placeId: id, name: 'Nile' });
    assert.equal(renderToStaticMarkup(button()), '');
    const harness = await mount(() => React.createElement('div', null, button(), button()));
    try {
      const buttons = harness.nodes(node => node.tagName === 'BUTTON');
      assert.equal(buttons.length, 2); assert.equal(buttons[0].attributes['aria-pressed'], 'false');
      assert.equal(buttons[0].textContent, '0');
      let prevented = 0; let stopped = 0;
      await React.act(async () => harness.props(buttons[0]).onClick({ preventDefault() { prevented++; }, stopPropagation() { stopped++; } }));
      assert.equal(prevented, 1); assert.equal(stopped, 1);
      assert.ok(buttons.every(node => node.attributes['aria-pressed'] === 'true'));
      await React.act(async () => context.mock.timers.tick(150));
      assert.deepEqual(writes, ['PUT']);
      assert.ok(buttons.every(node => node.textContent === '0'), 'The early server answer waits for button landing');
      await React.act(async () => context.mock.timers.tick(load('src/lib/motion.ts').MOTION.landingAt - 150));
      assert.ok(buttons.every(node => node.textContent === '1.2k'));
      assert.ok(buttons.every(node => node.attributes['aria-label'].includes('Nile') && node.attributes['aria-label'].includes('1200')));
      assert.equal(renderToStaticMarkup(button()), '');
    } finally { await harness.close(); }
  }
});

test('off mounts no button and only one session probe across repeated surfaces', async () => {
  let calls = 0;
  const store = load('src/lib/likes.ts', { '@/lib/api/client': {} }).createLikeStore(async () => { calls++; return {}; });
  const { LikeButton } = load('src/components/ds/LikeButton.tsx', { '@/lib/likes': { likeStore: store }, '@/i18n/LocaleProvider': translations('ar') });
  const harness = await mount(() => React.createElement('div', null, React.createElement(LikeButton, { placeId: id, name: 'Nile' }), React.createElement(LikeButton, { placeId: id, name: 'Nile' })));
  try { assert.equal(harness.nodes(node => node.tagName === 'BUTTON').length, 0); assert.equal(calls, 1); }
  finally { await harness.close(); }
});

test('hero result sends one settled request and one contract click, ordinary city links send no click', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const requests = []; const batches = [];
  let analytics;
  const harness = await mount(browser => {
    browser.document = global.document;
    const dependencies = {
      window: browser, navigator: {},
      '@/i18n/LocaleProvider': translations('en'),
      '@/components/explorer/SelectPill': { SelectPill: () => null },
      '@/components/ds/PlaceActions': { PlaceActions: () => null },
      '@/lib/use-search-term': { useDebouncedSearch: value => value.trim() },
      '@/lib/api/hooks/use-categories': { useCategories: () => ({ data: [] }) },
      '@/lib/api/hooks/use-search': { useSearchPlaces: query => ({ data: { items: query.q ? [{ id, cityId, slug: 'nile', name: 'Nile', likeCount: 1 }] : [] } }) },
      '@/lib/api/client': { apiRequest: async (method, path, options) => { requests.push({ method, path, options }); return {}; } },
      '@/lib/api/transport': { fetchApi: async (path, options) => { batches.push(JSON.parse(options.body)); return { ok: true }; } },
    };
    analytics = load('src/lib/analytics/track.ts', dependencies);
    dependencies['@/lib/analytics/track'] = analytics;
    const { HomeHero } = load('src/app/_home/HomeHero.tsx', dependencies);
    return React.createElement(HomeHero, { cities: [{ id: cityId, slug: 'aswan', name: 'Aswan' }] });
  });
  try {
    await React.act(async () => harness.props(harness.input()).onFocus());
    const ordinaryCity = harness.nodes(node => node.tagName === 'A' && node.attributes.role === 'option' && node.attributes.href === '/en/explorer/aswan/')[0];
    await React.act(async () => harness.props(ordinaryCity).onClick());
    assert.equal(requests.length, 0); assert.equal(batches.length, 0);
    await harness.change('sea view');
    await React.act(async () => context.mock.timers.tick(1500));
    assert.equal(requests.length, 1); assert.equal(requests[0].options.params.settled, 1);
    const result = harness.nodes(node => node.tagName === 'A' && node.attributes.href?.includes('/nile/'))[0];
    assert.ok(result);
    await React.act(async () => harness.props(result).onClick());
    const event = batches.flatMap(batch => batch.events).find(event => event.type === 'search_click');
    delete event.occurredAt;
    assert.deepEqual(event, { type: 'search_click', term: 'sea view', placeId: id, position: 1, locale: 'en' });
    assert.equal(requests.length, 1);
    assert.equal(batches.flatMap(batch => batch.events).filter(event => event.type === 'search_click').length, 1);
  } finally { analytics.flushAnalytics(); await harness.close(); }
});

test('explorer clicks carry searched city and paged positions; browse and placeholder cards emit nothing', async () => {
  for (const locale of ['ar', 'en']) {
    const batches = [];
    let searching = true;
    let placeholder = false;
    let total = 45;
    let settled = 0;
    const item = { id, cityId, slug: 'nile', name: 'Nile', likeCount: 7 };
    const harness = await mount(browser => {
      const empty = () => null;
      const dependencies = {
        window: browser, navigator: {},
        'next/navigation': { useParams: () => ({ citySlug: 'aswan' }), useRouter: () => ({}), useSearchParams: () => new URLSearchParams() },
        '@/i18n/LocaleProvider': translations(locale),
        '@/lib/api/hooks/use-cities': { useCities: () => ({ data: [{ id: cityId, slug: 'aswan', name: 'Aswan' }] }) },
        '@/lib/api/hooks/use-categories': { useCategories: () => ({ data: [] }) },
        '@/lib/api/hooks/use-taxonomy': { useAmenities: () => ({ data: [] }) },
        '@/lib/api/hooks/use-places': { usePlaces: () => ({ data: { items: [item], total: 1 } }) },
        '@/lib/api/hooks/use-search': { useSearchPlaces: () => ({ data: { items: [item], total, otherCities: [] }, isPlaceholderData: placeholder }) },
        '@/lib/use-search-signals': { useSearchSignals: () => ({ change() {}, settle() { settled++; } }) },
        '@/lib/use-browse-address': { useBrowseAddress: () => ({ state: { q: searching ? 'sea view' : '', category: null, area: null, page: 2, filters: {} }, debouncedSearch: searching ? 'sea view' : '', isDebouncing: false, setSearch() {}, setCategory() {}, setArea() {}, setPage() {}, setFilters() {}, clearFilters() {} }) },
        '@/lib/use-browse-session': { useBrowseRestore() {} },
        '@/lib/use-sticky-browse': { useStickyBrowse: () => ({ sentinelRef: null, blockRef: null, contentRef: null }) },
        '@/lib/icon-catalog': { icon: empty },
        '@/components/ds/PlaceCard': { PlaceCard: props => React.createElement('a', { 'data-result': true, href: props.href, onClick: props.onTitleClick }, props.title) },
        '@/lib/api/transport': { fetchApi: async (path, options) => { batches.push(JSON.parse(options.body)); return { ok: true }; } },
      };
      for (const [path, name] of [['ds/SiteHeader','SiteHeader'], ['ds/CategoryChip','CategoryChip'], ['explorer/CitySelector','CitySelector'], ['explorer/RegionSelector','RegionSelector'], ['explorer/FilterPanel','FilterPanel'], ['explorer/PlaceFilters','PlaceFilters'], ['explorer/LoadingSkeleton','LoadingSkeleton'], ['explorer/ErrorState','ErrorState']]) dependencies['@/components/' + path] = { [name]: empty };
      const Page = load('src/app/explorer/[citySlug]/CityClient.tsx', dependencies).default;
      return React.createElement('div', null, React.createElement(Page));
    });
    try {
      const result = () => harness.nodes(node => node.attributes['data-result'] === 'true')[0];
      await React.act(async () => harness.props(result()).onClick());
      const event = batches[0].events[0]; delete event.occurredAt;
      assert.deepEqual(event, { type: 'search_click', term: 'sea view', placeId: id, position: 21, cityId, locale });
      assert.equal(settled, 1);
      total = undefined; await harness.rerender();
      await React.act(async () => harness.props(result()).onClick());
      assert.equal(batches[1].events[0].position, 1);
      placeholder = true; await harness.rerender(); assert.equal(harness.props(result()).onClick, undefined);
      placeholder = false; searching = false; await harness.rerender(); assert.equal(harness.props(result()).onClick, undefined);
      assert.equal(batches.length, 2);
    } finally { await harness.close(); }
  }
});
