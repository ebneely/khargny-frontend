const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./offline-loader.cjs');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { mount } = require('./render-harness.cjs');
const { fixture, renderRoute } = require('./seo-body-fixtures.cjs');
const source = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('scroll thresholds, direction changes, jitters and locks', () => {
  const { scrollDirection, initialScrollDirection } = load('src/lib/scroll-direction.ts');
  let state = initialScrollDirection(96);
  for (const top of [97, 100, 104]) {
    state = scrollDirection(state, top);
    assert.equal(state.hidden, false);
  }
  state = scrollDirection(state, 105);
  assert.equal(state.hidden, true);
  state = scrollDirection(state, 180);
  state = scrollDirection(state, 172);
  assert.equal(state.hidden, true);
  assert.equal(scrollDirection(state, 171).hidden, false);
});

test('small jitters preserve accumulated travel', () => {
  const { scrollDirection, initialScrollDirection } = load('src/lib/scroll-direction.ts');
  let state = initialScrollDirection(120);
  for (const top of [122, 121, 125, 124, 128, 127]) {
    state = scrollDirection(state, top);
    assert.equal(state.hidden, false);
  }
  state = scrollDirection(state, 129);
  assert.equal(state.hidden, true);
  for (const top of [128, 130, 126, 127, 122]) {
    state = scrollDirection(state, top);
    assert.equal(state.hidden, true);
  }
  assert.equal(scrollDirection(state, 121).hidden, false);
});

test('top always shows; menu/sheet/focus locks and non-scrollable pages reset travel', () => {
  const { scrollDirection, initialScrollDirection } = load('src/lib/scroll-direction.ts');
  const hidden = scrollDirection(initialScrollDirection(120), 160);
  for (const top of [96, 8, 0, -30]) assert.equal(scrollDirection(hidden, top).hidden, false);
  assert.equal(initialScrollDirection(400).hidden, false);
  assert.equal(scrollDirection(initialScrollDirection(0), 97).hidden, true);
  let state = scrollDirection(hidden, 300, { locked: true });
  assert.equal(state.hidden, false);
  state = scrollDirection(state, 600, { locked: true });
  assert.equal(state.hidden, false);
  assert.equal(scrollDirection(state, 608).hidden, false);
  assert.equal(scrollDirection(state, 609).hidden, true);
  assert.equal(scrollDirection(hidden, 500, { scrollable: false }).hidden, false);
});

function browserFixture() {
  const writes = [];
  function node(height) {
    const attributes = new Map();
    const lengths = new Map();
    return {
      height, style: {
        getPropertyValue: name => lengths.get(name) || '',
        setProperty(name, value) { lengths.set(name, value); writes.push([name, value]); },
        removeProperty: name => lengths.delete(name),
      },
      getAttribute: name => attributes.get(name) ?? null,
      setAttribute(name, value) { attributes.set(name, value); writes.push([name, value]); },
      removeAttribute: name => attributes.delete(name),
      getBoundingClientRect() { return { height: this.height }; },
      closest() { return null; }, getClientRects() { return [this]; },
      contains(target) { return target === this; },
    };
  }
  const root = node(700);
  root.clientHeight = 700;
  root.scrollHeight = 2200;
  const body = node(2200);
  body.scrollHeight = 2200;
  const listeners = new Map();
  const frames = new Map();
  const mutations = [];
  const sizes = [];
  const intersections = [];
  let nextFrame = 0;
  const add = (target, event, callback, options) => {
    listeners.set(target + ':' + event, { callback, options });
  };
  const remove = (target, event) => listeners.delete(target + ':' + event);
  const document = {
    documentElement: root, body, activeElement: body, dialogs: [],
    querySelectorAll() { return this.dialogs; },
    addEventListener: (event, callback) => add('document', event, callback),
    removeEventListener: event => remove('document', event),
  };
  const window = {
    document, scrollY: 0, innerHeight: 700,
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    addEventListener: (event, callback, options) => add('window', event, callback, options),
    removeEventListener: event => remove('window', event),
    getComputedStyle: target => ({ display: 'block', visibility: 'visible', getPropertyValue: target.style.getPropertyValue }),
    MutationObserver: class {
      constructor(callback) { this.callback = callback; mutations.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; this.targets = []; sizes.push(this); }
      observe(target) { this.targets.push(target); }
      disconnect() { this.disconnected = true; }
    },
    IntersectionObserver: class {
      constructor(callback, options) { this.callback = callback; this.options = options; intersections.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    },
  };
  return {
    window, document, root, body, node, writes, frames, mutations, sizes, intersections, listeners,
    event(name, target = 'window') { listeners.get(target + ':' + name)?.callback(); },
    flush() { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(); },
  };
}

function headerController(browser, menuOpen = false) {
  let cleanup;
  const header = browser.node(69);
  const { useScrollDirection } = load('src/lib/use-scroll-direction.ts', {
    window: browser.window,
    react: { useEffect: effect => { cleanup = effect(); } },
  });
  useScrollDirection({ current: header }, menuOpen);
  browser.flush();
  return { header, close: () => cleanup() };
}

test('header hook coalesces passive scrolling into one frame and writes only on visibility change', () => {
  const browser = browserFixture();
  const controller = headerController(browser);
  assert.equal(browser.listeners.get('window:scroll').options.passive, true);
  browser.window.scrollY = 120;
  for (let count = 0; count < 10; count++) browser.event('scroll');
  assert.equal(browser.frames.size, 1);
  assert.equal(browser.root.getAttribute('data-header'), 'shown');
  browser.flush();
  assert.equal(browser.root.getAttribute('data-header'), 'hidden');
  assert.equal(browser.root.style.getPropertyValue('--header-offset'), '0px');
  const writes = browser.writes.length;
  browser.window.scrollY = 160;
  browser.event('scroll'); browser.flush();
  assert.equal(browser.writes.length, writes);
  browser.window.scrollY = 151;
  browser.event('scroll'); browser.flush();
  assert.equal(browser.root.getAttribute('data-header'), 'shown');
  assert.equal(browser.root.style.getPropertyValue('--header-offset'), '69px');
  controller.close();
  assert.equal(browser.listeners.size, 0);
  assert.ok(browser.mutations.every(observer => observer.disconnected));
  assert.ok(browser.sizes.every(observer => observer.disconnected));
  assert.equal(browser.root.getAttribute('data-header'), null);
});

test('header reveals on dialog insertion and focus, locks a phone menu, and handles resized short pages', () => {
  const browser = browserFixture();
  const controller = headerController(browser);
  browser.window.scrollY = 200;
  browser.event('scroll'); browser.flush();
  assert.equal(browser.root.getAttribute('data-header'), 'hidden');
  browser.document.dialogs = [browser.node(200)];
  browser.mutations[0].callback(); browser.flush();
  assert.equal(browser.root.getAttribute('data-header'), 'shown');
  browser.window.scrollY = 500;
  browser.event('scroll'); browser.flush();
  assert.equal(browser.root.getAttribute('data-header'), 'shown');
  browser.document.dialogs = [];
  browser.mutations[0].callback(); browser.flush();
  browser.window.scrollY = 510;
  browser.event('scroll'); browser.flush();
  assert.equal(browser.root.getAttribute('data-header'), 'hidden');
  browser.document.activeElement = controller.header;
  browser.event('focusin', 'document');
  assert.equal(browser.root.getAttribute('data-header'), 'shown');
  browser.window.scrollY = 800;
  browser.event('scroll'); browser.flush();
  assert.equal(browser.root.getAttribute('data-header'), 'shown');
  browser.document.activeElement = browser.body;
  browser.event('focusout', 'document'); browser.flush();
  browser.window.scrollY = 810;
  browser.event('scroll'); browser.flush();
  assert.equal(browser.root.getAttribute('data-header'), 'hidden');
  browser.root.scrollHeight = browser.body.scrollHeight = 600;
  browser.sizes[0].callback(); browser.flush();
  assert.equal(browser.root.getAttribute('data-header'), 'shown');
  controller.close();
  const menu = browserFixture();
  const locked = headerController(menu, true);
  menu.window.scrollY = 500;
  menu.event('scroll'); menu.flush();
  assert.equal(menu.root.getAttribute('data-header'), 'shown');
  locked.close();
});

test('bottom overscroll is clamped, so rubber-banding cannot spuriously reveal the header', () => {
  const browser = browserFixture();
  const controller = headerController(browser);
  browser.window.scrollY = 1700;
  browser.event('scroll'); browser.flush();
  browser.window.scrollY = 1600;
  browser.event('scroll'); browser.flush();
  assert.equal(browser.root.getAttribute('data-header'), 'hidden');
  controller.close();
});

test('sticky observer tracks header offset, reserves expanded height and ignores compact shrink', () => {
  const browser = browserFixture();
  browser.root.style.setProperty('--header-offset', '69px');
  const sentinel = browser.node(1);
  const block = browser.node(148);
  const content = browser.node(148);
  content.getBoundingClientRect = () => ({ height: block.getAttribute('data-stuck') === 'true' ? 44 : content.height });
  const refs = [sentinel, block, content];
  let cleanup;
  const { useStickyBrowse } = load('src/lib/use-sticky-browse.ts', {
    window: browser.window,
    react: { useRef: () => ({ current: refs.shift() }), useLayoutEffect: effect => { cleanup = effect(); } },
  });
  useStickyBrowse();
  let observer = browser.intersections.at(-1);
  assert.equal(observer.options.rootMargin, '-69px 0px 0px 0px');
  assert.equal(block.style.getPropertyValue('--browse-reserved-height'), '148px');
  const intersection = (isIntersecting, bottom, top = 69) => observer.callback([{ isIntersecting, boundingClientRect: { bottom }, rootBounds: { top } }]);
  intersection(false, 1000);
  assert.notEqual(block.getAttribute('data-stuck'), 'true');
  block.setAttribute('data-stuck', 'true');
  intersection(false, 68);
  assert.equal(block.getAttribute('data-stuck'), 'true');
  assert.equal(block.style.getPropertyValue('--browse-reserved-height'), '148px');
  browser.sizes[0].callback();
  assert.equal(block.style.getPropertyValue('--browse-reserved-height'), '148px');
  content.height = 200;
  browser.mutations.find(observer => observer.target === content)?.callback();
  assert.equal(block.style.getPropertyValue('--browse-reserved-height'), '200px');
  assert.equal(block.getAttribute('data-stuck'), 'true');
  browser.root.style.setProperty('--header-offset', '0px');
  browser.mutations[0].callback(); browser.flush();
  assert.equal(observer.disconnected, true);
  observer = browser.intersections.at(-1);
  assert.equal(observer.options.rootMargin, '-0px 0px 0px 0px');
  intersection(false, -100, 0);
  assert.equal(block.getAttribute('data-stuck'), 'true');
  intersection(true, 150, 0);
  assert.equal(block.getAttribute('data-stuck'), 'false');
  assert.equal(block.style.getPropertyValue('--browse-reserved-height'), '200px');
  cleanup();
  assert.equal(browser.listeners.size, 0);
  assert.ok(browser.intersections.every(observer => observer.disconnected));
});

test('SSR header and city browse expose hooks without changing navigation or document layout boundaries', async () => {
  for (const locale of ['en', 'ar']) {
    const dictionary = load('src/i18n/dictionaries.ts').dictionaries[locale];
    const { SiteHeader } = load('src/components/ds/SiteHeader.tsx', {
      'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
      '@/i18n/LocaleProvider': { useI18n: () => ({ dict: dictionary, toggleLocale() {}, t: key => key.split('.').reduce((value, part) => value[part], dictionary) }) },
      animejs: { animate() {}, stagger() {} },
    });
    const markup = renderToStaticMarkup(React.createElement(SiteHeader, { active: 'explore' }));
    assert.match(markup, /<header class="khg-siteheader"/);
    assert.match(markup, /aria-current="page"/);
    assert.match(markup, /aria-label="Open menu"/);
    assert.doesNotMatch(markup, /data-header=/);
    const context = fixture({ locale, route: '/explorer/aswan/' });
    const html = await renderRoute(context, 'src/app/explorer/[citySlug]/page.tsx');
    assert.match(html, /class="khg-browse-sentinel" aria-hidden="true"/);
    assert.match(html, /class="khg-browse-sticky" data-stuck="false"/);
    assert.match(html, /class="khg-browse-surface"/);
    assert.match(html, /class="khg-browse-city"/);
    assert.match(html, /class="khg-browse-area"/);
    assert.match(html, /class="khg-place-grid"/);
    assert.match(html, /role="status" aria-live="polite"/);
  }
  assert.match(source('src/components/ds/SiteHeader.tsx'), /useScrollDirection\(headerRef, open\)/);
  const city = source('src/app/explorer/[citySlug]/CityClient.tsx');
  assert.match(city, /useStickyBrowse\(\)/);
  assert.match(city, /ref=\{sentinelRef\}[^>]*className="khg-browse-sentinel"/);
  assert.match(city, /ref=\{blockRef\}[^>]*className="khg-browse-sticky"/);
  assert.match(city, /ref=\{contentRef\}[^>]*className="khg-browse-surface"/);
  assert.ok(city.indexOf('</header>') < city.indexOf('ref={sentinelRef}'));
  for (const layout of ['src/app/explorer/[citySlug]/layout.tsx', 'src/app/explorer/[citySlug]/[placeSlug]/layout.tsx']) {
    assert.doesNotMatch(source(layout), /Suspense/);
    assert.equal(fs.existsSync(path.join(__dirname, '..', path.dirname(layout), 'loading.tsx')), false);
  }
});

test('CSS synchronizes the header, compact phone row and reduced motion without hiding names/count', () => {
  const css = source('src/app/globals.css');
  assert.match(css, /top:\s*var\(--header-offset\)/);
  assert.match(css, /min-height:\s*var\(--browse-reserved-height/);
  assert.match(css, /transition: transform 200ms ease-out/);
  assert.match(css, /transition: top 200ms ease-out/);
  assert.match(css, /@media \(max-width: 639px\)/);
  assert.match(css, /\[data-stuck="true"\] .khg-browse-active\s*\{\s*display: none/);
  assert.match(css, /\.khg-siteheader, .khg-browse-sticky \{ transition: none/);
  assert.match(css, /\.khg-browse-what input \{ min-width: 0/);
  assert.match(css, /\.khg-browse-area .khg-pill::before \{ content: "\\00b7"/);
  assert.doesNotMatch(source('src/lib/use-sticky-browse.ts'), /scrollY|scrollTo|addEventListener\("scroll"/);
  assert.match(source('src/components/NavProgress.tsx'), /position: fixed;[^\n]*z-index: 70/);
  assert.match(source('src/app/layout.tsx'), /<NavProgress/);
  assert.match(source('src/components/explorer/FilterPanel.tsx'), /aria-label=\{activeCount > 0/);
  assert.match(source('src/components/explorer/SelectPill.tsx'), /aria-label=\{`\$\{label\}/);
});

test('mounting a restored second page never scrolls; deliberate next-page click still scrolls once', async () => {
  const scrolls = [];
  const pushes = [];
  const dictionary = load('src/i18n/dictionaries.ts').dictionaries.en;
  const empty = () => null;
  const harness = await mount(window => {
    window.scrollY = 950;
    window.scrollTo = value => scrolls.push(value);
    const dependencies = {
      window,
      'next/navigation': { useParams: () => ({ citySlug: 'cairo' }), useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: (...args) => pushes.push(args) }) },
      'next/link': { default: ({ children, prefetch, ...props }) => React.createElement('a', props, children) },
      '@/i18n/LocaleProvider': { useI18n: () => ({ locale: 'en', t: (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll('{' + name + '}', value), key.split('.').reduce((value, part) => value[part], dictionary)) }) },
      '@/lib/use-search-term': { useSearchTerm: () => ({ search: '', debouncedSearch: '', isDebouncing: false, setSearch() {} }) },
      '@/lib/api/hooks/use-cities': { useCities: () => ({ data: [{ id: 'cairo', slug: 'cairo', nameEn: 'Cairo' }] }) },
      '@/lib/api/hooks/use-categories': { useCategories: () => ({ data: [] }) },
      '@/lib/api/hooks/use-taxonomy': { useAmenities: () => ({ data: [] }) },
      '@/lib/api/hooks/use-places': { usePlaces: () => ({ data: { items: [{ id: 'one', slug: 'one', nameEn: 'One' }], total: 90 } }) },
      '@/lib/api/hooks/use-search': { useSearchPlaces: () => ({}) },
      '@/lib/icon-catalog': { icon: empty },
      '@/components/ds/PlaceCard': { PlaceCard: () => React.createElement('article') },
    };
    for (const [file, name] of [['ds/SiteHeader', 'SiteHeader'], ['explorer/CitySelector', 'CitySelector'], ['explorer/RegionSelector', 'RegionSelector'], ['explorer/FilterPanel', 'FilterPanel'], ['explorer/PlaceFilters', 'PlaceFilters']]) dependencies['@/components/' + file] = { [name]: empty };
    const Page = load('src/app/explorer/[citySlug]/CityClient.tsx', dependencies).default;
    return React.createElement(React.Fragment, null, React.createElement(Page, { citySlug: 'cairo', initialPage: 2 }));
  }, '/en/explorer/cairo/?page=2');
  try {
    assert.deepEqual(scrolls, []);
    assert.equal(harness.browser.scrollY, 950);
    await harness.rerender();
    assert.deepEqual(scrolls, []);
    const next = harness.nodes(node => node.tagName === 'A' && node.attributes.rel === 'next')[0];
    assert.ok(next);
    await React.act(async () => harness.props(next).onClick({ button: 0, preventDefault() {} }));
    assert.equal(scrolls.length, 1);
    assert.equal(scrolls[0].top, 0);
    assert.equal(pushes.length, 1);
    assert.equal(pushes[0][1].scroll, false);
  } finally { await harness.close(); }
});
