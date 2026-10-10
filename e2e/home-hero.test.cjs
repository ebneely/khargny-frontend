const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load } = require('./offline-loader.cjs');
const { mount } = require('./render-harness.cjs');

test('nearest city uses API coordinates first, fallback centres second, and skips unknowns', () => {
  const { nearestCity } = load('src/lib/home-hero.ts');
  const cities = [{ id: 'a', slug: 'aswan' }, { id: 'b', slug: 'cairo' }];
  assert.equal(nearestCity(cities, 24.1, 32.9).id, 'a');
  assert.equal(nearestCity([{ id: 'api', slug: 'unknown', lat: 24.1, lng: 32.9 }, ...cities], 24.1, 32.9).id, 'api');
  assert.equal(nearestCity([{ slug: 'unknown' }], 0, 0), null);
  assert.equal(nearestCity(cities, NaN, 0), null);
  assert.equal(nearestCity(cities, 95, 0), null);
});

test('recent searches cap at three, de-duplicate, clear and survive unavailable storage', () => {
  const { recentSearches } = load('src/lib/home-hero.ts');
  let value = null;
  const store = recentSearches({ getItem: () => value, setItem: (key, next) => { value = next; }, removeItem: () => { value = null; } });
  for (const query of ['Cairo', 'Aswan', 'Nile', 'roof', ' CAIRO ']) store.add(query);
  assert.deepEqual(Array.from(store.read()), ['CAIRO', 'roof', 'Nile']);
  store.clear(); assert.deepEqual(Array.from(store.read()), []);
  value = '{broken'; assert.deepEqual(Array.from(store.read()), []);
  const broken = recentSearches({ getItem() { throw Error(); }, setItem() { throw Error(); }, removeItem() { throw Error(); } });
  broken.add('Aswan'); assert.deepEqual(Array.from(broken.read()), ['Aswan']);
  broken.clear(); assert.deepEqual(Array.from(broken.read()), []);
});

test('keyboard highlight moves, wraps, resets and handles empty options', () => {
  const { moveHighlight } = load('src/lib/home-hero.ts');
  assert.equal(moveHighlight(-1, 'ArrowDown', 4), 0);
  assert.equal(moveHighlight(-1, 'ArrowUp', 4), 3);
  assert.equal(moveHighlight(3, 'ArrowDown', 4), 0);
  assert.equal(moveHighlight(0, 'ArrowUp', 4), 3);
  assert.equal(moveHighlight(1, 'Escape', 4), -1);
  assert.equal(moveHighlight(0, 'ArrowDown', 0), -1);
});

test('best-city routing requires an exact city name or an unambiguous majority', () => {
  const { bestSearchCity } = load('src/lib/home-hero.ts');
  const cities = [{ id: 'a', slug: 'aswan', name: 'Aswan', nameEn: 'Aswan' }, { id: 'b', slug: 'cairo', name: 'Cairo' }];
  assert.equal(bestSearchCity(cities, [], 'Aswan').id, 'a');
  assert.equal(bestSearchCity(cities, [{ cityId: 'a' }, { cityId: 'b' }], 'roof'), undefined);
  assert.equal(bestSearchCity(cities, [{ cityId: 'a' }, { cityId: 'a' }, { cityId: 'b' }], 'roof').id, 'a');
});

test('server hero contains city links and its headline but no open listbox, in both languages', () => {
  for (const locale of ['ar', 'en']) {
    const dict = load('src/i18n/dictionaries.ts').dictionaries[locale];
    const { HomeHero } = load('src/app/_home/HomeHero.tsx', {
      '@/i18n/LocaleProvider': { useI18n: () => ({ locale, t: key => key.split('.').reduce((value, part) => value[part], dict) }) },
      '@/lib/api/hooks/use-search': { useSearchPlaces: () => ({ data: null }) },
      '@/lib/api/hooks/use-categories': { useCategories: () => ({ data: [] }) },
    });
    const cities = [{ id: 'aswan', slug: 'aswan', name: 'Aswan', nameEn: 'Aswan' }, ...maadiCities];
    const html = renderToStaticMarkup(React.createElement(HomeHero, { cities }));
    for (const city of cities) assert.ok(html.includes(`<a href="/${locale}/explorer/${city.slug}/"`));
    assert.ok(html.includes('role="combobox"'));
    assert.ok(html.includes('aria-expanded="false"'));
    assert.ok(!html.includes('role="listbox"'));
    assert.ok(html.includes(dict.home.heroTitle));
    assert.ok(html.includes(dict.home.heroSubtitle));
    assert.ok(html.includes('<form'));
    assert.ok(html.includes(`action="/${locale}/explorer/"`));
    assert.ok(html.includes('name="q"'));
    assert.ok(html.includes(`dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`));
    assert.ok(html.includes(dict.home.allEgypt));
    assert.ok(!html.includes('role="dialog"'));
    assert.ok(html.indexOf('aria-haspopup="dialog"') < html.indexOf('role="combobox"'));
  }
});

async function clientHero(context, geolocation, reduced = true, config = {}) {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const requests = [];
  const navigations = [];
  const memory = new Map(config.localStorage ?? []);
  const session = config.session ?? new Map();
  const geoRequests = [];
  const rotations = [];
  let cleared = 0;
  let cities = config.cities ?? [{ id: 'a', slug: 'aswan', name: 'Aswan', nameEn: 'Aswan', lat: 24.09, lng: 32.9 }, { id: 'c', slug: 'cairo', name: 'Cairo', nameEn: 'Cairo', lat: 30.06, lng: 31.25 }];
  const data = { items: Array.from({ length: 8 }, (_, index) => ({ id: `place-${index}`, slug: `roof-${index}`, name: `Roof ${index}`, cityId: 'a', categoryId: 'cat', region: null, matchedOn: ['amenity:Rooftop Seating'] })) };
  const locale = config.locale ?? 'en';
  const dictionary = load('src/i18n/dictionaries.ts').dictionaries[locale];
  const harness = await mount(browser => {
    browser.document = global.document;
    browser.navigator = { geolocation };
    browser.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
    browser.sessionStorage = { getItem: key => session.get(key) ?? null, setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key) };
    browser.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} });
    browser.setInterval = callback => { rotations.push(callback); return 1; };
    browser.clearInterval = () => { cleared += 1; };
    browser.location.assign = address => navigations.push(address);
    const prototype = Object.getPrototypeOf(browser.document.body);
    prototype.contains = function(node) { return this === node || this.childNodes.some(child => child.contains?.(node)); };
    prototype.querySelector = () => null;
    prototype.focus = function() { browser.document.activeElement = this; };
    config.setupBrowser?.(browser);
    const dependencies = { window: browser,
      '@/components/ds/PlaceActions': { PlaceActions: () => null },
      '@/i18n/LocaleProvider': { useI18n: () => ({ locale, t: (key, vars = {}) => Object.entries(vars).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), key.split('.').reduce((value, part) => value[part], dictionary)) }) },
      '@/components/ds/Sheet': { Sheet: ({ open, children, onClose }) => open ? React.createElement('div', { role: 'dialog' }, children, React.createElement('button', { onClick: onClose }, 'Close')) : null },
      '@/lib/api/client': { apiRequest: async (method, path, options) => { geoRequests.push({ method, path, options }); return config.nearby ? config.nearby(options.params) : { items: maadiPlaces }; } },
      '@/lib/api/hooks/use-search': { useSearchPlaces: (query, options) => { requests.push({ query, options }); return { data: query.q && options.enabled ? config.searchData ?? data : null }; } },
      '@/lib/api/hooks/use-categories': { useCategories: () => ({ data: [{ id: 'cat', nameEn: 'Cafe', nameAr: 'Cafe' }] }) },
    };
    const { HomeHero } = load('src/app/_home/HomeHero.tsx', dependencies);
    const HeroSurface = () => React.createElement(HomeHero, { cities });
    return React.createElement(React.Fragment, null, React.createElement(HeroSurface));
  });
  const options = () => harness.nodes(node => node.attributes.role === 'option');
  const key = async value => React.act(async () => harness.props(harness.input()).onKeyDown({ key: value, preventDefault() {} }));
  return { harness, requests, navigations, memory, session, geoRequests, options, key, rotations, async setCities(next) { cities = next; await harness.rerender(); }, get cleared() { return cleared; } };
}

const maadiCities = [
  { id: 'c', slug: 'cairo', name: 'القاهرة', nameEn: 'Cairo', areaKeys: ['Maadi'], status: 'active' },
  { id: 'g', slug: 'giza', name: 'الجيزة', nameEn: 'Giza', status: 'active' },
];
const maadiPlaces = [
  { id: 'nearest', cityId: 'c', lat: 29.9601, lng: 31.26, region: 'Maadi' },
  { id: 'second', cityId: 'c', lat: 29.963, lng: 31.26, region: 'New Maadi' },
  { id: 'third', cityId: 'c', lat: 29.964, lng: 31.26, region: 'Maadi' },
  { id: 'giza-place', cityId: 'g', lat: 29.97, lng: 31.24, region: 'Dokki' },
];
const buttonNamed = (harness, name) => harness.nodes(node => node.tagName === 'BUTTON' && node.textContent === name)[0];
const cityChip = (harness, slug) => harness.nodes(node => node.tagName === 'A' && node.attributes.href?.endsWith(`/explorer/${slug}/`))[0];
const clickNode = async (harness, node, extra = {}) => React.act(async () => harness.props(node).onClick({ preventDefault() {}, button: 0, ...extra }));

test('Near me confirms Maadi without navigation or stored coordinates; Show Cairo selects its curated area', async context => {
  let success;
  const client = await clientHero(context, { getCurrentPosition(callback) { success = callback; } }, true, { cities: maadiCities });
  try {
    await clickNode(client.harness, client.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('Near me'))[0]);
    await React.act(async () => success({ coords: { latitude: 29.96, longitude: 31.26 } }));
    assert.ok(client.harness.container.textContent.includes("Looks like you're in Maadi, Cairo."));
    assert.equal(client.navigations.length, 0);
    assert.equal(client.session.size, 0);
    assert.equal(client.geoRequests[0].method, 'GET');
    assert.equal(client.geoRequests[0].path, '/v1/search/places');
    assert.deepEqual(JSON.parse(JSON.stringify(client.geoRequests[0].options.params)), { lat: 29.96, lng: 31.26, radiusKm: 15, limit: 100 });
    await clickNode(client.harness, buttonNamed(client.harness, 'Show Cairo'));
    assert.deepEqual(client.navigations, ['/en/explorer/cairo/?region=Maadi']);
    assert.equal(client.session.get('khg-home-city'), 'c');
    assert.ok(!JSON.stringify([...client.memory, ...client.session]).includes('29.96'));
  } finally { await client.harness.close(); }
});

test('Near me stays single-flight throughout the nearby request and ignores a reply after unmount', async context => {
  let success;
  let reply;
  let calls = 0;
  const pending = new Promise(resolve => { reply = resolve; });
  const client = await clientHero(context, { getCurrentPosition(callback) { calls += 1; success = callback; } }, true, { cities: maadiCities, nearby: () => pending });
  const near = client.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('Near me'))[0];
  let closed = false;
  try {
    await clickNode(client.harness, near);
    await React.act(async () => { success({ coords: { latitude: 29.96, longitude: 31.26 } }); });
    await clickNode(client.harness, near);
    assert.equal(calls, 1);
    assert.equal(client.geoRequests.length, 1);
    assert.equal(client.navigations.length, 0);
    assert.equal(client.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('Finding your city')).length, 1);
    await client.harness.close();
    closed = true;
    await React.act(async () => reply({ items: maadiPlaces }));
    assert.equal(client.navigations.length, 0);
    assert.equal(client.session.size, 0);
  } finally { if (!closed) await client.harness.close(); }
});

test('empty nearby responses confirm centre fallback without an area or automatic navigation', async context => {
  let success;
  const client = await clientHero(context, { getCurrentPosition(callback) { success = callback; } }, true, { cities: maadiCities, nearby: () => ({ data: [], meta: { total: 0 } }) });
  try {
    await clickNode(client.harness, client.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('Near me'))[0]);
    await React.act(async () => success({ coords: { latitude: 28.5, longitude: 31.26 } }));
    assert.deepEqual(client.geoRequests.map(request => request.options.params.radiusKm), [15, 60]);
    assert.ok(client.harness.container.textContent.includes("Looks like you're in Giza."));
    assert.equal(client.navigations.length, 0);
    await clickNode(client.harness, buttonNamed(client.harness, 'Show Giza'));
    assert.deepEqual(client.navigations, ['/en/explorer/giza/']);
  } finally { await client.harness.close(); }
});

test('unknown locations and request failures show a visible city-sheet recovery, never a silent fallback', async context => {
  for (const failRequest of [false, true]) {
    context.mock.timers.reset();
    let success;
    const client = await clientHero(context, { getCurrentPosition(callback) { success = callback; } }, true, { cities: [{ id: 'unknown', slug: 'unknown', nameEn: 'Unknown' }], nearby: () => { if (failRequest) throw Error('offline'); return { items: [] }; } });
    try {
      await clickNode(client.harness, client.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('Near me'))[0]);
      await React.act(async () => success({ coords: { latitude: 0, longitude: 0 } }));
      assert.ok(client.harness.container.textContent.includes('We could not tell where you are'));
      assert.equal(client.navigations.length, 0);
      assert.equal(client.geoRequests.length, failRequest ? 1 : 2);
      await clickNode(client.harness, buttonNamed(client.harness, 'Choose another city'));
      assert.equal(client.harness.nodes(node => node.attributes.role === 'dialog').length, 1);
    } finally { await client.harness.close(); }
  }
});

test('remembered denial prevents geolocation on later mounts', async context => {
  let calls = 0;
  const client = await clientHero(context, { getCurrentPosition() { calls += 1; } }, true, { localStorage: [['khg-geolocation-denied', 'true']] });
  try {
    assert.equal(client.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('Near me')).length, 0);
    assert.equal(calls, 0);
    assert.equal(client.geoRequests.length, 0);
  } finally { await client.harness.close(); }
});

test('city chips with text scope search and See all; empty and modified clicks keep real links', async context => {
  const client = await clientHero(context);
  try {
    await client.harness.change('roof');
    await React.act(async () => context.mock.timers.tick(250));
    let prevented = false;
    await clickNode(client.harness, cityChip(client.harness, 'cairo'), { preventDefault() { prevented = true; } });
    assert.ok(prevented);
    assert.equal(client.navigations.length, 0);
    assert.ok(client.requests.some(request => request.options.enabled && request.query.cityId === 'c' && request.query.q === 'roof'));
    assert.ok(client.harness.container.textContent.includes('Search results in Cairo'));
    assert.equal(client.options().at(-1).attributes.href, '/en/explorer/cairo/?q=roof');
    assert.equal(client.harness.input().value, 'roof');
    prevented = false;
    await clickNode(client.harness, cityChip(client.harness, 'aswan'), { ctrlKey: true, preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
    await client.harness.change('');
    await clickNode(client.harness, cityChip(client.harness, 'aswan'), { preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
    assert.equal(cityChip(client.harness, 'aswan').attributes.href, '/en/explorer/aswan/');
  } finally { await client.harness.close(); }
});

test('Where uses the shared sheet, remembers only the session and can return to All Egypt', async context => {
  const session = new Map([['khg-home-city', 'c']]);
  const client = await clientHero(context, undefined, true, { session });
  try {
    const where = () => client.harness.nodes(node => node.tagName === 'BUTTON' && node.attributes['aria-haspopup'] === 'dialog')[0];
    assert.ok(where().textContent.includes('Cairo'));
    await clickNode(client.harness, where());
    assert.equal(client.harness.nodes(node => node.attributes.role === 'dialog').length, 1);
    await clickNode(client.harness, buttonNamed(client.harness, 'All Egypt'));
    assert.ok(where().textContent.includes('All Egypt'));
    assert.equal(session.size, 0);
    assert.equal(client.memory.get('khg-home-city'), undefined);
    await clickNode(client.harness, where());
    await clickNode(client.harness, buttonNamed(client.harness, 'Aswan'));
    assert.equal(session.get('khg-home-city'), 'a');
    assert.equal(client.navigations.length, 0);
  } finally { await client.harness.close(); }
});

test('Choose another city resets a previously filtered shared city sheet', async context => {
  let success;
  const cities = [...maadiCities, ...Array.from({ length: 7 }, (_, index) => ({ id: `extra-${index}`, slug: `extra-${index}`, nameEn: `Extra ${index}` }))];
  const client = await clientHero(context, { getCurrentPosition(callback) { success = callback; } }, true, { cities });
  try {
    await clickNode(client.harness, client.harness.nodes(node => node.tagName === 'BUTTON' && node.attributes['aria-haspopup'] === 'dialog')[0]);
    const search = client.harness.nodes(node => node.tagName === 'INPUT' && node.attributes.placeholder === 'Search cities')[0];
    await React.act(async () => client.harness.props(search).onChange({ target: { value: 'Giza' } }));
    assert.equal(buttonNamed(client.harness, 'Cairo'), undefined);
    await clickNode(client.harness, buttonNamed(client.harness, 'Close'));
    await clickNode(client.harness, client.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('Near me'))[0]);
    await React.act(async () => success({ coords: { latitude: 29.96, longitude: 31.26 } }));
    await clickNode(client.harness, buttonNamed(client.harness, 'Choose another city'));
    assert.ok(buttonNamed(client.harness, 'Cairo'));
  } finally { await client.harness.close(); }
});

test('confirmed city URL selects only a curated area in the actual city list and permits clearing it', async () => {
  for (const requested of ['Maadi', 'not-curated']) {
    const requests = [];
    const harness = await mount(browser => {
      const empty = () => null;
      const dictionary = load('src/i18n/dictionaries.ts').dictionaries.en;
      const dependencies = {
        window: browser,
        'next/navigation': { useParams: () => ({ citySlug: 'cairo' }), useRouter: () => ({ push() {} }), useSearchParams: () => new URLSearchParams({ region: requested }) },
        '@/i18n/LocaleProvider': { useI18n: () => ({ locale: 'en', t: key => key.split('.').reduce((value, part) => value[part], dictionary) }) },
        '@/lib/api/hooks/use-cities': { useCities: () => ({ data: maadiCities }) },
        '@/lib/api/hooks/use-categories': { useCategories: () => ({ data: [] }) },
        '@/lib/api/hooks/use-taxonomy': { useAmenities: () => ({ data: [] }) },
        '@/lib/api/hooks/use-search': { useSearchPlaces: () => ({ data: null }) },
        '@/lib/api/hooks/use-places': { usePlaces: params => { requests.push(params); return { data: { items: [], total: 0 } }; } },
        '@/lib/use-search-term': { useSearchTerm: () => ({ search: '', debouncedSearch: '', isDebouncing: false, setSearch() {} }) },
        '@/lib/icon-catalog': { icon: empty },
        '@/components/explorer/RegionSelector': { RegionSelector: ({ value, onChange }) => React.createElement('button', { onClick: () => onChange(null), 'data-region': value ?? '' }, 'Clear area') },
      };
      for (const [path, name] of [['ds/SiteHeader', 'SiteHeader'], ['explorer/CitySelector', 'CitySelector'], ['explorer/SearchBar', 'SearchBar'], ['explorer/LoadingSkeleton', 'LoadingSkeleton'], ['explorer/ErrorState', 'ErrorState'], ['ds/PlaceCard', 'PlaceCard'], ['explorer/FilterPanel', 'FilterPanel'], ['explorer/PlaceFilters', 'PlaceFilters']]) dependencies['@/components/' + path] = { [name]: empty };
      return React.createElement(load('src/app/explorer/[citySlug]/CityClient.tsx', dependencies).default, { citySlug: 'cairo' });
    });
    try {
      assert.equal(requests.at(-1).region, requested === 'Maadi' ? 'Maadi' : undefined);
      await clickNode(harness, buttonNamed(harness, 'Clear area'));
      assert.equal(requests.at(-1).region, undefined);
    } finally { await harness.close(); }
  }
});

test('Choose another city opens the shared sheet; Arabic confirmation omits an uncurated area filter', async context => {
  let success;
  const client = await clientHero(context, { getCurrentPosition(callback) { success = callback; } }, true, { cities: maadiCities.map(city => ({ ...city, areaKeys: [] })), locale: 'ar' });
  try {
    await clickNode(client.harness, client.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('قريب مني'))[0]);
    await React.act(async () => success({ coords: { latitude: 29.96, longitude: 31.26 } }));
    assert.ok(client.harness.container.textContent.includes('شكلك في المعادي، القاهرة.'));
    await clickNode(client.harness, buttonNamed(client.harness, 'اختار مدينة تانية'));
    assert.equal(client.harness.nodes(node => node.attributes.role === 'dialog').length, 1);
    assert.equal(client.navigations.length, 0);
    await clickNode(client.harness, buttonNamed(client.harness, 'Close'));
    await clickNode(client.harness, buttonNamed(client.harness, 'ورّيني القاهرة'));
    assert.deepEqual(client.navigations, ['/ar/explorer/cairo/']);
  } finally { await client.harness.close(); }
});

test('Maadi uses nearby catalogue places rather than the closer Giza centre', async () => {
  const { detectNearbyLocation, nearestCity } = load('src/lib/home-hero.ts');
  assert.equal(nearestCity(maadiCities, 29.96, 31.26).id, 'g');
  const requests = [];
  const detected = await detectNearbyLocation(maadiCities, 29.96, 31.26, async (path, params) => { requests.push({ path, params }); return { items: [...maadiPlaces].reverse() }; });
  assert.equal(detected.city.id, 'c');
  assert.equal(detected.region, 'Maadi');
  assert.deepEqual(JSON.parse(JSON.stringify(requests)), [{ path: '/v1/search/places', params: { lat: 29.96, lng: 31.26, radiusKm: 15, limit: 100 } }]);
});

test('nearby weighted ties are deterministic and a closer minority can outweigh distant places', async () => {
  const { detectNearbyLocation } = load('src/lib/home-hero.ts');
  const votingCities = maadiCities.map(city => ({ ...city, slug: `vote-${city.id}` }));
  const tied = [{ id: 'z', cityId: 'g', lat: 30, lng: 31, region: 'Dokki' }, { id: 'a', cityId: 'c', lat: 30, lng: 31, region: 'Maadi' }];
  for (const items of [tied, [...tied].reverse()]) {
    assert.equal((await detectNearbyLocation([...votingCities].reverse(), 30, 31, async () => ({ items }))).city.id, 'c');
  }
  const items = [tied[1], ...Array.from({ length: 5 }, (_, index) => ({ id: `far-${index}`, cityId: 'g', lat: 30.1, lng: 31, region: 'Dokki' }))];
  assert.equal((await detectNearbyLocation(votingCities, 30, 31, async () => ({ items }))).city.id, 'c');
});

test('nearby detection widens once, falls back only on empty results and surfaces request errors', async () => {
  const { detectNearbyLocation } = load('src/lib/home-hero.ts');
  const radii = [];
  const detected = await detectNearbyLocation(maadiCities, 28.5, 31.26, async (path, params) => { radii.push(params.radiusKm); return { items: [] }; });
  assert.deepEqual(radii, [15, 60]);
  assert.equal(detected.city.id, 'g');
  assert.equal(detected.region, null);
  assert.equal(await detectNearbyLocation([{ id: 'unknown', slug: 'unknown' }], 0, 0, async () => ({ items: [] })), null);
  assert.equal(await detectNearbyLocation(maadiCities, 0, 0, async () => ({ items: [{ cityId: 'unknown', lat: 0, lng: 0 }] })), null);
  await assert.rejects(() => detectNearbyLocation(maadiCities, 28.5, 31.26, async () => { throw Error('offline'); }), /offline/);
  const widened = await detectNearbyLocation(maadiCities, 29.96, 31.26, async (path, params) => params.radiusKm === 15 ? [] : { items: maadiPlaces });
  assert.equal(widened.city.id, 'c');
});

test('live hero debounces Egypt-wide results, limits to six and supports keyboard selection and Escape', async context => {
  const client = await clientHero(context);
  const { harness, requests, options, key, navigations } = client;
  try {
    assert.equal(options().length, 0);
    assert.ok(requests.every(request => !request.options.enabled));
    await React.act(async () => harness.props(harness.input()).onFocus());
    assert.equal(options().length, 2);
    await harness.change('roof');
    assert.ok(!requests.some(request => request.options.enabled));
    await React.act(async () => context.mock.timers.tick(250));
    assert.ok(requests.some(request => request.options.enabled && request.query.q === 'roof' && !request.query.cityId));
    assert.equal(options().length, 7);
    assert.ok(options().slice(0, 6).every(node => node.attributes.href.includes('/aswan/roof-')));
    assert.equal(options()[6].attributes.href, '/en/explorer/aswan/?q=roof');
    assert.ok(harness.container.textContent.includes('Matched: Rooftop Seating'));
    await key('ArrowDown');
    assert.equal(options()[0].attributes['aria-selected'], 'true');
    await key('Enter');
    assert.deepEqual(navigations, ['/en/explorer/aswan/roof-0/']);
    assert.ok(client.memory.get('khg-recent-searches').includes('roof'));
    await React.act(async () => harness.props(harness.input()).onFocus());
    await key('Escape');
    assert.equal(options().length, 0);
  } finally { await harness.close(); }
});

test('Near me calls geolocation once while pending; denial is remembered and removes its chip', async context => {
  let calls = 0;
  let decline;
  const client = await clientHero(context, { getCurrentPosition(success, failure) { calls += 1; decline = failure; } });
  try {
    const anchor = client.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('Near me'))[0];
    const click = client.harness.props(anchor).onClick;
    await React.act(async () => { click({ preventDefault() {} }); click({ preventDefault() {} }); });
    assert.equal(calls, 1);
    await React.act(async () => decline({ code: 1 }));
    assert.equal(client.memory.get('khg-geolocation-denied'), 'true');
    assert.ok(!client.harness.nodes(node => node.tagName === 'A').some(node => node.textContent.includes('Near me')));
    assert.equal(client.navigations.length, 0);
  } finally { await client.harness.close(); }
});

test('placeholder rotates only before typing, stays stopped after clearing, and is static with reduced motion', async context => {
  const client = await clientHero(context, undefined, false);
  try {
    assert.equal(client.rotations.length, 1);
    assert.equal(client.harness.input().attributes.placeholder, 'Try: rooftop in Aswan');
    await React.act(async () => client.rotations[0]());
    assert.equal(client.harness.input().attributes.placeholder, 'Try: café in Cairo');
    await client.harness.change('roof');
    assert.ok(client.cleared > 0);
    await client.harness.change('');
    await React.act(async () => client.rotations[0]());
    assert.equal(client.rotations.length, 1);
    assert.equal(client.harness.input().attributes.placeholder, 'Try: café in Cairo');
  } finally { await client.harness.close(); }
  context.mock.timers.reset();
  const reduced = await clientHero(context);
  try { assert.equal(reduced.rotations.length, 0); } finally { await reduced.harness.close(); }
});

const alexandriaCity = { id: 'alex', slug: 'alexandria', name: 'الإسكندرية', nameEn: 'Alexandria', status: 'active' };
const fixedPositions = [
  ['Maadi', 29.9602, 31.2569, 'c'],
  ['Mohandessin', 30.0561, 31.2010, 'g'],
  ['Zamalek', 30.0609, 31.2197, 'c'],
  ['Dokki', 30.0384, 31.2118, 'g'],
  ['Heliopolis', 30.0911, 31.3220, 'c'],
  ['New Cairo', 30.0300, 31.4700, 'c'],
  ['Haram', 29.9900, 31.1300, 'g'],
  ['6th of October', 29.9700, 30.9400, 'g'],
  ['Alexandria corniche', 31.2001, 29.9187, 'alex'],
];
const sparseMaadiRows = Array.from({ length: 41 }, (_, index) => ({
  id: `catalogue-${index}`, cityId: index < 23 ? 'g' : 'c',
  region: index < 23 ? 'Mohandessin' : 'Zamalek',
  lat: 30.05 + (index % 5) * 0.005, lng: 31.21,
}));
sparseMaadiRows[19] = { id: 'words-cafe', cityId: 'g', region: 'Mohandessin', lat: 30.025, lng: 31.25 };

test('fixed browser positions use Nile geography in Greater Cairo and distance voting in Alexandria', async () => {
  const { detectNearbyLocation } = load('src/lib/home-hero.ts');
  for (const [name, lat, lng, cityId] of fixedPositions) {
    const rows = name === 'Maadi' ? sparseMaadiRows : [
      ...Array.from({ length: 23 }, (_, index) => ({ id: `wrong-${index}`, cityId: cityId === 'g' ? 'c' : 'g', lat: lat + (cityId === 'alex' ? 0.1 : 0.005), lng, region: 'Wrong area' })),
      ...Array.from({ length: cityId === 'alex' ? 3 : 18 }, (_, index) => ({ id: `right-${index}`, cityId, lat: lat + (cityId === 'alex' ? 0.0001 : 0.1) + index * 0.0001, lng, region: name })),
    ];
    for (const items of [rows, [...rows].reverse()]) {
      const requests = [];
      const result = await detectNearbyLocation([...maadiCities, alexandriaCity], lat, lng, async (path, params) => {
        requests.push(params);
        return { data: items, meta: { total: items.length, skip: 0, limit: 100 } };
      });
      assert.equal(result.city.id, cityId, name);
      if (name === 'Maadi') assert.equal(result.region, null);
      assert.equal(requests[0].limit, 100);
    }
  }
});

test('Nile islands are Cairo, inactive cities disable geography, and sparse or failed lookups cannot flip a known river bank', async () => {
  const { detectNearbyLocation } = load('src/lib/home-hero.ts');
  const gizaRows = { data: [{ id: 'giza', cityId: 'g', lat: 30.06, lng: 31.20, region: 'Mohandessin' }], meta: { total: 1 } };
  for (const [lat, lng] of [[30.070, 31.217], [30.008, 31.222], [29.9602, 31.2569]]) {
    assert.equal((await detectNearbyLocation(maadiCities, lat, lng, async () => gizaRows)).city.id, 'c');
  }
  assert.equal((await detectNearbyLocation(maadiCities, 29.9602, 31.2569, async () => ({ data: [], meta: { total: 0 } }))).city.id, 'c');
  assert.equal((await detectNearbyLocation(maadiCities, 29.9602, 31.2569, async () => { throw Error('offline'); })).city.id, 'c');
  const inactive = maadiCities.map(city => ({ ...city, status: city.id === 'c' ? 'draft' : 'active' }));
  assert.equal((await detectNearbyLocation(inactive, 29.9602, 31.2569, async () => gizaRows)).city.id, 'g');
});

test('area requires a real nearest chosen-city place within 3km and invalid coordinates never vote', async () => {
  const { detectNearbyLocation } = load('src/lib/home-hero.ts');
  for (const [offset, expected] of [[0.026, 'Local area'], [0.028, null]]) {
    const result = await detectNearbyLocation([alexandriaCity, ...maadiCities], 31.2001, 29.9187, async () => ({ data: [
      ...Array.from({ length: 35 }, (_, index) => ({ id: `invalid-${index}`, cityId: 'g', lat: null, lng: null, region: 'Wrong area' })),
      { id: 'valid', cityId: 'alex', lat: 31.2001 + offset, lng: 29.9187, region: 'Local area' },
    ], meta: { total: 36 } }));
    assert.equal(result.city.id, 'alex');
    assert.equal(result.region, expected);
  }
});

test('Where keeps Alexandria routing through catalogue refresh despite Giza search results', async context => {
  const client = await clientHero(context, undefined, true, { cities: [...maadiCities, alexandriaCity], searchData: { items: [{ id: 'giza-result', cityId: 'g', slug: 'cafe', nameEn: 'Cafe' }] } });
  try {
    await client.harness.change('cafe');
    await React.act(async () => context.mock.timers.tick(250));
    await clickNode(client.harness, cityChip(client.harness, 'alexandria'));
    await client.setCities(maadiCities);
    assert.equal(client.requests.at(-1).query.cityId, 'alex');
    assert.equal(client.options().at(-1).attributes.href, '/en/explorer/alexandria/?q=cafe');
    assert.ok(client.harness.container.textContent.includes('Search results in Alexandria'));
    await client.key('Enter');
    assert.deepEqual(client.navigations, ['/en/explorer/alexandria/?q=cafe']);
  } finally { await client.harness.close(); }
});

test('confirmed Cairo restores on a new home mount even when the city catalogue arrives later', async context => {
  const session = new Map();
  let success;
  const first = await clientHero(context, { getCurrentPosition(callback) { success = callback; } }, true, { cities: maadiCities, session, nearby: () => ({ data: sparseMaadiRows, meta: { total: 41 } }) });
  try {
    await clickNode(first.harness, first.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('Near me'))[0]);
    await React.act(async () => success({ coords: { latitude: 29.9602, longitude: 31.2569 } }));
    assert.ok(first.harness.container.textContent.includes("Looks like you're in Cairo."));
    await clickNode(first.harness, buttonNamed(first.harness, 'Show Cairo'));
    assert.equal(session.get('khg-home-city'), 'c');
  } finally { await first.harness.close(); }
  context.mock.timers.reset();
  const returned = await clientHero(context, undefined, true, { cities: [], session });
  try {
    await returned.setCities(maadiCities);
    const where = returned.harness.nodes(node => node.tagName === 'BUTTON' && node.attributes['aria-haspopup'] === 'dialog')[0];
    assert.ok(where.textContent.includes('Cairo'));
    await returned.harness.change('cafe');
    await React.act(async () => context.mock.timers.tick(250));
    assert.equal(returned.requests.at(-1).query.cityId, 'c');
  } finally { await returned.harness.close(); }
});

test('mount effects tolerate missing or throwing browser features and do not position automatically when granted', async context => {
  const setups = [
    browser => { browser.navigator.permissions = { query: () => Promise.resolve({ state: 'granted' }) }; },
    browser => { browser.matchMedia = undefined; Object.defineProperty(browser.navigator, 'permissions', { get() { throw Error('unsupported permissions'); } }); },
    browser => { browser.matchMedia = () => { throw Error('unsupported media'); }; Object.defineProperty(browser.navigator, 'geolocation', { get() { throw Error('blocked geolocation'); } }); },
    browser => { browser.matchMedia = () => ({ matches: false }); Object.defineProperty(browser, 'sessionStorage', { get() { throw Error('blocked storage'); } }); },
  ];
  for (const setupBrowser of setups) {
    context.mock.timers.reset();
    let calls = 0;
    const client = await clientHero(context, { getCurrentPosition() { calls += 1; } }, false, { locale: 'ar', setupBrowser });
    try { assert.equal(calls, 0); assert.equal(client.geoRequests.length, 0); }
    finally { await client.harness.close(); }
  }
});

test('a synchronous positioning failure is recoverable and releases the single-flight lock', async context => {
  let calls = 0;
  const client = await clientHero(context, { getCurrentPosition() { calls += 1; throw Error('blocked positioning'); } });
  try {
    const nearMe = client.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('Near me'))[0];
    await clickNode(client.harness, nearMe);
    assert.ok(client.harness.container.textContent.includes('Could not find your nearest city. Pick a city instead.'));
    await clickNode(client.harness, buttonNamed(client.harness, 'Choose another city'));
    await clickNode(client.harness, buttonNamed(client.harness, 'Cairo'));
    await clickNode(client.harness, client.harness.nodes(node => node.tagName === 'A' && node.textContent.includes('Near me'))[0]);
    assert.equal(calls, 2);
    assert.equal(client.geoRequests.length, 0);
    assert.equal(client.navigations.length, 0);
    assert.equal(client.memory.get('khg-geolocation-denied'), undefined);
  } finally { await client.harness.close(); }
});
