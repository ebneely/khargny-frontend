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
    const html = renderToStaticMarkup(React.createElement(HomeHero, { cities: [{ id: 'aswan', slug: 'aswan', name: 'Aswan', nameEn: 'Aswan' }] }));
    assert.ok(html.includes(`<a href="/${locale}/explorer/aswan/"`));
    assert.ok(html.includes('role="combobox"'));
    assert.ok(html.includes('aria-expanded="false"'));
    assert.ok(!html.includes('role="listbox"'));
    assert.ok(html.includes(dict.home.heroTitle));
    assert.ok(html.includes(dict.home.heroSubtitle));
  }
});

async function clientHero(context, geolocation, reduced = true) {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const requests = [];
  const navigations = [];
  const memory = new Map();
  const rotations = [];
  let cleared = 0;
  const cities = [{ id: 'a', slug: 'aswan', name: 'Aswan', nameEn: 'Aswan', lat: 24.09, lng: 32.9 }, { id: 'c', slug: 'cairo', name: 'Cairo', nameEn: 'Cairo', lat: 30.06, lng: 31.25 }];
  const data = { items: Array.from({ length: 8 }, (_, index) => ({ id: `place-${index}`, slug: `roof-${index}`, name: `Roof ${index}`, cityId: 'a', categoryId: 'cat', region: null, matchedOn: ['amenity:Rooftop Seating'] })) };
  const dictionary = load('src/i18n/dictionaries.ts').dictionaries.en;
  const harness = await mount(browser => {
    browser.document = global.document;
    browser.navigator = { geolocation };
    browser.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
    browser.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} });
    browser.setInterval = callback => { rotations.push(callback); return 1; };
    browser.clearInterval = () => { cleared += 1; };
    browser.location.assign = address => navigations.push(address);
    const prototype = Object.getPrototypeOf(browser.document.body);
    prototype.contains = function(node) { return this === node || this.childNodes.some(child => child.contains?.(node)); };
    prototype.querySelector = () => null;
    prototype.focus = function() { browser.document.activeElement = this; };
    const dependencies = { window: browser,
      '@/i18n/LocaleProvider': { useI18n: () => ({ locale: 'en', t: (key, vars = {}) => Object.entries(vars).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), key.split('.').reduce((value, part) => value[part], dictionary)) }) },
      '@/lib/api/hooks/use-search': { useSearchPlaces: (query, options) => { requests.push({ query, options }); return { data: query.q && options.enabled ? data : null }; } },
      '@/lib/api/hooks/use-categories': { useCategories: () => ({ data: [{ id: 'cat', nameEn: 'Cafe', nameAr: 'Cafe' }] }) },
    };
    const { HomeHero } = load('src/app/_home/HomeHero.tsx', dependencies);
    return React.createElement(HomeHero, { cities });
  });
  const options = () => harness.nodes(node => node.attributes.role === 'option');
  const key = async value => React.act(async () => harness.props(harness.input()).onKeyDown({ key: value, preventDefault() {} }));
  return { harness, requests, navigations, memory, options, key, rotations, get cleared() { return cleared; } };
}

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
