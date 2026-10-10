const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function loadModule(relativePath, dependencies = {}, sourceOverride) {
  const filename = path.join(__dirname, '..', relativePath);
  const output = ts.transpileModule(sourceOverride ?? fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exported = {};
  vm.runInNewContext(output, {
    exports: exported,
    URL,
    process: { env: { NODE_ENV: 'test', CI: '1' } },
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      if (name === 'lucide-react') return Object.fromEntries(['Tag', 'Receipt', 'Utensils', 'BadgeCheck', 'Footprints', 'ImageOff', 'Heart', 'Navigation', 'Eye', 'Star', 'ArrowLeft', 'Share', 'Phone', 'Globe', 'MapPin', 'Bookmark']
        .map((iconName) => [iconName, (props) => React.createElement('svg', { ...props, className: iconName === 'ImageOff' ? 'image-off' : iconName })]));
      if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => String(key) }) };
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.join(__dirname, '../src', name.slice(2)) : path.resolve(path.dirname(filename), name);
        const resolved = ['.ts', '.tsx'].map((extension) => `${base}${extension}`).find((candidate) => fs.existsSync(candidate));
        if (!resolved) throw new Error(`Missing local dependency: ${name}`);
        return loadModule(path.relative(path.join(__dirname, '..'), resolved), dependencies);
      }
      return require(name);
    },
  }, { filename });
  return exported;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function fixture() {
  return {
    placeId: 'place-id', slug: 'test-place', currency: 'EGP', updatedAt: '2026-10-06T19:00:00.000Z',
    sections: [
      { id: null, nameAr: null, nameEn: null, items: [
        { id: 'first', nameAr: 'وجبة', nameEn: null, price: '100.00', available: true, image: null },
      ] },
      { id: 'drinks', nameAr: 'مشروبات', nameEn: 'Drinks', items: [
        { id: 'coffee', nameAr: 'قهوة', nameEn: 'Coffee', price: '45.50', available: false,
          image: { url: 'https://img.5argny.com/coffee.webp', thumb: 'https://img.5argny.com/thumb.webp', small: 'https://img.5argny.com/small.webp', medium: 'https://img.5argny.com/medium.webp' } },
      ] },
    ],
  };
}

function translations(locale) {
  const dictionaries = loadModule('src/i18n/dictionaries.ts');
  return { useI18n: () => ({ locale, t: (key, vars = {}) => Object.entries(vars).reduce((text, [name, value]) => text.replaceAll('{' + name + '}', String(value)), key.split('.').reduce((value, part) => value?.[part], dictionaries.dictionaries[locale]) ?? key) }) };
}

function frameworkLink({ children, prefetch, ...props }) {
  return React.createElement('a', { ...props, 'data-next-link': 'true', 'data-prefetch': String(prefetch) }, children);
}

function cardModule(locale, linkComponent = frameworkLink) {
  const provider = translations(locale);
  return loadModule('src/components/ds/PlaceCard.tsx', {
    '@/i18n/LocaleProvider': provider,
    'next/link': { default: linkComponent },
    './IconButton': { IconButton: ({ ariaLabel, onClick, icon, selected }) => React.createElement('button', { 'aria-label': ariaLabel, 'aria-pressed': selected, onClick }, icon) },
    './PlaceBadges': loadModule('src/components/ds/PlaceBadges.tsx', { '@/i18n/LocaleProvider': provider }),
    '@/lib/api/hooks/use-saved-places': { useSaveToggle: () => ({ saved: false, toggle: () => {} }) },
  }).PlaceCard;
}

function badgeModule(locale) {
  return loadModule('src/components/ds/PlaceBadges.tsx', { '@/i18n/LocaleProvider': translations(locale) });
}

function planCardModule(locale) {
  const empty = () => null;
  const source = fs.readFileSync(path.join(__dirname, '../src/app/plan/page.tsx'), 'utf8');
  return loadModule('src/app/plan/page.tsx', {
    '@/i18n/LocaleProvider': translations(locale),
    '@/components/ds/PlaceBadges': badgeModule(locale),
    'next/link': { default: empty },
    'next/navigation': { useRouter: empty },
    '@/lib/api/hooks/use-saved-places': { useSavedPlaces: empty, useUnsavePlace: empty },
    '@/components/ds/usePhotoLike': { usePhotoLike: () => ({ click: () => false }) },
    '@/components/ds/PlaceActions': { PlaceActions: props => React.createElement('button', { 'aria-label': 'Save', 'data-save-place-id': props.placeId }, React.createElement('svg', { className: 'Bookmark' })) },
    '@/lib/api/hooks/use-cities': { useCities: empty },
    '@/components/explorer/LoadingSkeleton': { LoadingSkeleton: empty },
    '@/components/explorer/ErrorState': { ErrorState: empty },
    '@/components/ds/SiteHeader': { SiteHeader: empty },
  }, `${source}\nexport { PlanItemCard };`).PlanItemCard;
}

function placePage(locale, flags) {
  const empty = () => null;
  const place = { id: 'place-id', slug: 'test-place', name: 'مكان', nameEn: 'Test place', cityId: 'city-id',
    rating: 0, priceRange: 2, phone: '123', website: 'https://example.invalid', ...flags };
  const Page = loadModule('src/app/explorer/[citySlug]/[placeSlug]/PlaceClient.tsx', {
    '@/i18n/LocaleProvider': translations(locale),
    'next/navigation': { useParams: () => ({ citySlug: 'test-city', placeSlug: place.slug }), useRouter: () => ({ back: empty }) },
    '@/components/ds/SiteHeader': { SiteHeader: empty },
    '@/components/ds/PlaceBadges': badgeModule(locale),
    '@/components/explorer/MediaShowcase': { MediaShowcase: empty, usePlaceGallery: () => ({ warm: empty, open: empty, error: false }) },
    '@/components/explorer/HoursTable': { HoursTable: empty },
    '@/components/explorer/SimilarPlaces': { SimilarPlaces: () => React.createElement('section', { 'data-similar': true }) },
    '@/components/explorer/PlaceMenuSection': { PlaceMenuSection: empty },
    '@/components/explorer/LoadingSkeleton': { LoadingSkeleton: empty },
    '@/components/explorer/ErrorState': { ErrorState: empty },
    '@/components/explorer/NotFoundState': { NotFoundState: empty },
    '@/lib/api/hooks/use-places': { usePlace: () => ({ data: place }), useSimilarPlaces: () => ({ data: [place] }) },
    '@/lib/api/hooks/use-cities': { useCities: () => ({ data: [{ id: 'city-id', slug: 'test-city' }] }) },
    '@/lib/api/hooks/use-categories': { useCategories: () => ({ data: [] }) },
    '@/lib/api/hooks/use-saved-places': { useSaveToggle: () => ({ saved: false, toggle: empty }) },
    '@/lib/region-location': { regionLocation: () => '', cardArea: () => '' },
    '@/lib/icon-catalog': { icon: empty },
    '@/lib/config': { getApiBaseUrl: () => 'https://api.example.invalid' },
    '@/lib/analytics/track': { trackPlaceAction: empty, trackPlaceView: empty },
  }).default;
  return () => React.createElement(Page, { related: React.createElement('section', { 'data-similar': true }) });
}

function assertStatuses(markup, expected, locale, rows = false) {
  const names = locale === 'en' ? ['Services listed', 'Price match', 'Visited by 5argny'] : ['الخدمات معروضة', 'مطابقة الأسعار', 'زرناه'];
  const negatives = locale === 'en' ? ['No services listed yet', 'Prices not checked yet', 'Not visited yet'] : ['مفيش خدمات معروضة لسه', 'الأسعار لسه متراجعتش', 'لسه مزرناهوش'];
  const chips = [...markup.matchAll(/<span\b[^>]*data-place-status="([^"]+)"[^>]*>/g)];
  assert.equal(chips.length, 3);
  const ids = ['hasMenu', 'priceVerified', 'visitedByUs'];
  const order = rows ? [...ids.filter((id, index) => expected[index]), ...ids.filter((id, index) => !expected[index])] : ids;
  assert.deepEqual(chips.map((chip) => chip[1]), order);
  chips.forEach((chip) => {
    const index = ids.indexOf(chip[1]);
    const state = expected[index] ? 'available' : 'not-yet';
    const name = expected[index] ? names[index] : negatives[index];
    assert.ok(chip[0].includes(`data-state="${state}"`));
    assert.ok(chip[0].includes(`aria-label="${name}"`));
    assert.ok(chip[0].includes(`title="${name}"`));
    assert.ok(chip[0].includes('role="img"'));
  });
}

test('rendered cards retain legacy text and put the name before three passive statuses', () => {
  for (const locale of ['en', 'ar']) {
    const PlaceCard = cardModule(locale);
    const props = { title: 'Test place', area: 'Test area', priceRange: 4 };
    const legacy = renderToStaticMarkup(React.createElement(PlaceCard, props));
    assert.ok(!legacy.includes('<button'));
    assertStatuses(legacy, [false, false, false], locale);
    assert.ok(legacy.includes('Test area'));
    const modern = renderToStaticMarkup(React.createElement(PlaceCard, { ...props, hasMenu: true, priceVerified: true, visitedByUs: true }));
    const menuLabel = locale === 'en' ? 'Services listed' : 'الخدمات معروضة';
    assert.ok(modern.indexOf('title="Test place"') < modern.indexOf(menuLabel));
    assert.ok(fs.readFileSync('src/components/ds/PostCard.module.css', 'utf8').includes('flex-wrap: wrap'));
  }
});

for (const [label, flags, expected] of [
  ['all off', { hasMenu: false, priceVerified: false, visitedByUs: false }, [false, false, false]],
  ['all on', { hasMenu: true, priceVerified: true, visitedByUs: true }, [true, true, true]],
  ['mixed', { hasMenu: true, priceVerified: false, visitedByUs: true }, [true, false, true]],
  ['missing fields', {}, [false, false, false]],
]) {
  test(`${label}: cards keep icon order; phone and desktop use the same held-first badge list`, () => {
    for (const locale of ['ar', 'en']) {
      const card = renderToStaticMarkup(React.createElement(cardModule(locale), { title: 'Test place', area: '', ...flags }));
      assertStatuses(card, expected, locale);
      const plan = renderToStaticMarkup(React.createElement(planCardModule(locale), { saved: { place: { name: 'مكان', nameEn: 'Test place', rating: 0, ...flags } }, onOpen: () => {}, onRemove: () => {}, removing: false }));
      assertStatuses(plan, expected, locale);
      const page = renderToStaticMarkup(React.createElement(placePage(locale, flags)));
      const lists = [...page.matchAll(/<section\b[^>]*data-place-statuses="true"[^>]*>[\s\S]*?<\/section>/g)].map(match => match[0]);
      assert.equal(lists.length, 2);
      const rows = lists.find(markup => !markup.includes('mobileStatuses'));
      for (const list of lists) {
        assertStatuses(list, expected, locale, true);
        assert.equal((list.match(/<li>/g) ?? []).length, 3);
        assert.equal((list.match(/href="#place-badge-legend"/g) ?? []).length, 3);
        assert.ok(list.includes('class="statusList"'));
      }
      assert.ok(rows.includes(locale === 'en' ? 'Place badges' : 'شارات المكان'));
      assert.ok(!rows.includes(locale === 'en' ? '>Available<' : '>متاح<'));
      assert.ok(!rows.includes(locale === 'en' ? '>Not yet<' : '>ليس بعد<'));
      const identity = page.match(/<header>[\s\S]*?<\/header>/)?.[0];
      assert.ok(identity);
      assertStatuses(identity, expected, locale, true);
      assert.ok(identity.includes('mobileStatuses'));
      assert.ok(page.indexOf('https://example.invalid') < page.indexOf(rows));
    }
  });
}

test('price bands exactly match the contract in both languages, with Arabic as default', () => {
  const { priceBandLabel, PRICE_LEVELS } = loadModule('src/lib/price-bands.ts');
  const english = ['1 – 100 EGP', '100 – 500 EGP', '500 – 1,000 EGP', '1,000 – 5,000+ EGP'];
  const arabic = ['١ – ١٠٠ جنيه', '١٠٠ – ٥٠٠ جنيه', '٥٠٠ – ١٬٠٠٠ جنيه', '١٬٠٠٠ – ٥٬٠٠٠+ جنيه'];
  for (const level of PRICE_LEVELS) {
    assert.equal(priceBandLabel(level, 'en'), english[level - 1]);
    assert.equal(priceBandLabel(level, 'ar'), arabic[level - 1]);
    assert.equal(priceBandLabel(level), arabic[level - 1]);
  }
  for (const invalid of [null, undefined, 0, -1, 5, 2.5, NaN, Infinity, '2']) assert.equal(priceBandLabel(invalid), null);
});

test('badge list rows have 44px targets, wrapping names, logical spacing and a shared explanation destination', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/components/ds/PlaceBadges.module.css'), 'utf8');
  assert.match(css, /\.statusRow\s*\{[^}]*min-block-size: 44px;/);
  assert.match(css, /\.statusRow > span\s*\{[^}]*min-inline-size: 0;[^}]*overflow-wrap: anywhere;/);
  assert.match(css, /\.statusLink:focus-visible/);
  for (const locale of ['en', 'ar']) {
    const { PlaceBadgeLegend } = badgeModule(locale);
    assert.match(renderToStaticMarkup(React.createElement(PlaceBadgeLegend)), /id="place-badge-legend"/);
  }
});

test('menu prices preserve real decimals without floating-point arithmetic', () => {
  const { formatMenuPrice } = loadModule('src/lib/price-bands.ts');
  for (const [amount, english, arabic] of [
    ['45.00', '45 EGP', '٤٥ جنيه'], ['45.50', '45.5 EGP', '٤٥٫٥ جنيه'],
    ['0.05', '0.05 EGP', '٠٫٠٥ جنيه'], ['0.00', '0 EGP', '٠ جنيه'],
    ['100000.99', '100000.99 EGP', '١٠٠٠٠٠٫٩٩ جنيه'],
    ['9007199254740993.99', '9007199254740993.99 EGP', '٩٠٠٧١٩٩٢٥٤٧٤٠٩٩٣٫٩٩ جنيه'],
  ]) {
    assert.equal(formatMenuPrice(amount, 'en'), english);
    assert.equal(formatMenuPrice(amount, 'ar'), arabic);
  }
});

test('the money precision assertion kills an in-memory parseFloat formatter mutation', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/price-bands.ts'), 'utf8');
  const amountLine = source.split(/\r?\n/).find((line) => line.includes('const amount = price.replace'));
  assert.ok(amountLine);
  const mutant = loadModule('src/lib/price-bands.ts', {}, source.replace(amountLine, '  const amount = String(parseFloat(price));'));
  for (const [locale, expected] of [['en', '9007199254740993.99 EGP'], ['ar', '٩٠٠٧١٩٩٢٥٤٧٤٠٩٩٣٫٩٩ جنيه']]) {
    assert.throws(() => assert.equal(mutant.formatMenuPrice('9007199254740993.99', locale), expected), { name: 'AssertionError' });
  }
});

test('place flags default to false without mutation, accepting only actual boolean true', () => {
  const { normalizePlaceFlags } = loadModule('src/lib/api/normalize-place.ts');
  const legacy = { id: 'legacy', priceRange: 2, name: 'Place' };
  const result = normalizePlaceFlags(legacy);
  assert.deepEqual(plain(result), { ...legacy, hasMenu: false, priceVerified: false, visitedByUs: false });
  assert.equal(legacy.hasMenu, undefined);
  const malformed = normalizePlaceFlags({ hasMenu: 'true', priceVerified: 1, visitedByUs: null });
  assert.deepEqual(plain(malformed), { hasMenu: false, priceVerified: false, visitedByUs: false });
  const modern = { hasMenu: true, priceVerified: true, visitedByUs: true };
  assert.deepEqual(plain(normalizePlaceFlags(modern)), modern);
});

test('menu normalization preserves money, availability, images and unsectioned-first order', () => {
  const { normalizeMenu } = loadModule('src/lib/api/normalize-menu.ts');
  const raw = fixture();
  raw.sections.reverse();
  raw.sections[0].nameEn = '  Drinks  ';
  raw.sections[0].items[0].nameEn = '  ';
  const menu = normalizeMenu(raw);
  assert.equal(menu.sections[0].id, null);
  assert.equal(menu.sections[0].nameAr, null);
  assert.equal(menu.sections[1].nameEn, 'Drinks');
  assert.equal(menu.sections[1].items[0].nameEn, null);
  assert.equal(menu.sections[1].items[0].price, '45.50');
  assert.equal(menu.sections[1].items[0].available, false);
  assert.equal(menu.sections[1].items[0].image.small, 'https://img.5argny.com/small.webp');
  assert.equal(raw.sections[0].items[0].nameEn, '  ');
});

test('malformed or error menus disappear; missing or wholly unsafe images become neutral placeholders', () => {
  const { normalizeMenu } = loadModule('src/lib/api/normalize-menu.ts');
  for (const invalid of [null, {}, [], { success: false, error: { code: 'MENU_NOT_FOUND' } }, { ...fixture(), currency: 'USD' }, { ...fixture(), sections: null }]) {
    assert.equal(normalizeMenu(invalid), null);
  }
  for (const invalidPrice of ['NaN', '-1.00', '45', '1.234', 45]) {
    const raw = fixture();
    raw.sections[0].items[0].price = invalidPrice;
    assert.equal(normalizeMenu(raw), null);
  }
  const raw = fixture();
  for (const size of ['url', 'thumb', 'small', 'medium']) raw.sections[1].items[0].image[size] = 'javascript:alert(1)';
  assert.equal(normalizeMenu(raw).sections[1].items[0].image, null);
  delete raw.sections[1].items[0].image;
  assert.equal(normalizeMenu(raw).sections[1].items[0].image, null);
});

test('Next image configuration and the menu policy share all explicitly configured hosts', () => {
  const hosts = loadModule('src/lib/image-hosts.ts');
  const config = loadModule('next.config.ts', {
    '@sentry/nextjs': { withSentryConfig: (value) => value },
    './src/lib/image-hosts': hosts,
  }).default;
  assert.deepEqual(plain(hosts.IMAGE_HOSTS), ['storage.5argny.com', 'img.5argny.com', 'img.heroui.chat', 'maps.googleapis.com']);
  const configured = config.images.remotePatterns;
  assert.deepEqual(plain(configured.filter((pattern) => !pattern.hostname.startsWith('**.')).map((pattern) => pattern.hostname)), plain(hosts.IMAGE_HOSTS));
  assert.deepEqual(plain(configured.filter((pattern) => pattern.hostname.startsWith('**.')).map((pattern) => pattern.hostname)), plain(hosts.LEGACY_IMAGE_HOST_PATTERNS));
  assert.ok(configured.every((pattern) => pattern.protocol === 'https'));
});

test('every image size accepts each exact allowed HTTPS host and canonical default-port URLs', () => {
  const { normalizeMenu } = loadModule('src/lib/api/normalize-menu.ts');
  const { IMAGE_HOSTS } = loadModule('src/lib/image-hosts.ts');
  for (const host of IMAGE_HOSTS) {
    const raw = fixture();
    const sizes = ['url', 'thumb', 'small', 'medium'];
    raw.sections[1].items[0].image = Object.fromEntries(sizes.map((size) => [size, `https://${host}/${size}.webp`]));
    const normalized = normalizeMenu(raw).sections[1].items[0].image;
    for (const size of sizes) assert.equal(normalized[size], `https://${host}/${size}.webp`);
  }
  const raw = fixture();
  raw.sections[1].items[0].image.small = 'https://IMG.5ARGNY.COM:443/small.webp';
  assert.equal(normalizeMenu(raw).sections[1].items[0].image.small, 'https://img.5argny.com/small.webp');
});

test('untrusted image URLs are rejected independently for every size, with no host prefix matching', () => {
  const { normalizeMenu } = loadModule('src/lib/api/normalize-menu.ts');
  const sizes = ['url', 'thumb', 'small', 'medium'];
  const rejected = [
    'https://attacker.invalid/tracker.webp',
    'https://img.5argny.com@attacker.invalid/tracker.webp',
    'http://img.5argny.com/image.webp',
    'https://127.0.0.1/image.webp',
    'http://127.0.0.1/image.webp',
    'https://[::1]/image.webp',
    'https://localhost/image.webp',
    'https://img.5argny.com:8443/image.webp',
    'https://user@img.5argny.com/image.webp',
    'https://:password@img.5argny.com/image.webp',
    'https://user:password@img.5argny.com/image.webp',
    'https://img.5argny.com.attacker.invalid/image.webp',
    'https://sub.img.5argny.com/image.webp',
    'https://lh3.googleusercontent.com/image.webp',
    'ftp://img.5argny.com/image.webp',
    '//img.5argny.com/image.webp',
    'not a URL',
  ];
  for (const url of rejected) {
    for (const size of sizes) {
      const raw = fixture();
      const image = raw.sections[1].items[0].image;
      image[size] = url;
      const normalized = normalizeMenu(raw).sections[1].items[0].image;
      assert.equal(normalized[size], null, `${size}: ${url}`);
      for (const other of sizes.filter((candidate) => candidate !== size)) assert.equal(normalized[other], image[other]);
    }
    const raw = fixture();
    raw.sections[1].items[0].image = Object.fromEntries(sizes.map((size) => [size, url]));
    assert.equal(normalizeMenu(raw).sections[1].items[0].image, null, url);
  }
});

test('menu images use a surviving trusted size or the neutral placeholder when none survives', () => {
  const { normalizeMenu } = loadModule('src/lib/api/normalize-menu.ts');
  for (const locale of ['ar', 'en']) {
    for (const surviving of ['small', 'thumb', 'medium', 'url', null]) {
      const raw = fixture();
      raw.sections[1].items[0].image = Object.fromEntries(['url', 'thumb', 'small', 'medium'].map((size) => [size, 'https://attacker.invalid/tracker.webp']));
      if (surviving) raw.sections[1].items[0].image[surviving] = `https://storage.5argny.com/${surviving}.webp`;
      const menu = normalizeMenu(raw);
      const { PlaceMenuSection } = loadModule('src/components/explorer/PlaceMenuSection.tsx', {
        '@/i18n/LocaleProvider': translations(locale),
        '@tanstack/react-query': { useQuery: () => ({ data: menu, isError: false }) },
        '@/lib/api/client': { apiRequest: () => { throw new Error('Rendering must not fetch'); } },
      });
      const markup = renderToStaticMarkup(React.createElement(PlaceMenuSection, { slug: menu.slug, hasMenu: true }));
      assert.ok(!markup.includes('attacker.invalid'));
      if (surviving) assert.ok(markup.includes(`src="https://storage.5argny.com/${surviving}.webp"`));
      else {
        assert.ok(!markup.includes('<img'));
        assert.ok(markup.includes('image-off'));
      }
    }
  }
});

test('all places-list envelopes and detail/similar/home/plan queries normalize legacy flags', async () => {
  let query;
  let response;
  const deps = {
    '@tanstack/react-query': { useQuery: (options) => { query = options; return {}; } },
    '@/lib/api/client': { apiRequest: async () => response },
  };
  const places = loadModule('src/lib/api/hooks/use-places.ts', deps);
  const legacy = { id: 'legacy', name: 'Place' };
  for (const raw of [[legacy], { items: [legacy], skip: 10, limit: 20, total: 80 }, { data: [legacy], meta: { skip: 10, limit: 20, total: 80 } }]) {
    const result = places.normalizePlaceList(raw);
    assert.equal(result.items[0].hasMenu, false);
    assert.equal(result.items[0].priceVerified, false);
    assert.equal(result.items[0].visitedByUs, false);
    if (!Array.isArray(raw)) assert.equal(result.total, 80);
  }
  response = legacy;
  places.usePlace('legacy');
  assert.equal((await query.queryFn()).hasMenu, false);
  response = [legacy];
  places.useSimilarPlaces('legacy');
  assert.equal((await query.queryFn())[0].visitedByUs, false);
  response = [{ id: 'rail', places: [legacy] }];
  loadModule('src/lib/api/hooks/use-home.ts', deps).useHomeSections();
  assert.equal((await query.queryFn())[0].places[0].priceVerified, false);
  response = [{ id: 'save', place: legacy }];
  deps['@/lib/saves'] = { saveStore: { read: async () => response } };
  loadModule('src/lib/api/hooks/use-saved-places.ts', deps).useSavedPlaces();
  assert.equal((await query.queryFn())[0].place.hasMenu, false);
});

test('one status source preserves icon order, localized explanations and strict boolean availability', () => {
  for (const locale of ['ar', 'en']) {
    const { PlaceBadges, getPlaceStatuses } = badgeModule(locale);
    const statuses = getPlaceStatuses({ hasMenu: 'true', priceVerified: 1, visitedByUs: null }, translations(locale).useI18n().t);
    assert.deepEqual(plain(statuses.map(({ id, available }) => ({ id, available }))), [
      { id: 'hasMenu', available: false }, { id: 'priceVerified', available: false }, { id: 'visitedByUs', available: false },
    ]);
    assert.ok(statuses.every(({ name, explanation }) => typeof name === 'string' && typeof explanation === 'string'));
    const markup = renderToStaticMarkup(React.createElement(PlaceBadges, { hasMenu: true, priceRange: 4, priceVerified: true, visitedByUs: true }));
    assertStatuses(markup, [true, true, true], locale);
    assert.equal((markup.match(/<svg /g) ?? []).length, 2);
    assert.ok(markup.indexOf('Tag') < markup.indexOf('BadgeCheck'));
    assert.ok(markup.indexOf('BadgeCheck') < markup.indexOf('<img'));
    assert.ok(!markup.includes('<button'));
    const price = renderToStaticMarkup(React.createElement(PlaceBadges, { variant: 'price', priceRange: 4, priceClassName: 'pd-pill pd-pill-price', hasMenu: true }));
    assert.ok(price.includes(locale === 'ar' ? '١٬٠٠٠ – ٥٬٠٠٠+ جنيه' : '1,000 – 5,000+ EGP'));
    assert.ok(price.includes('class="pd-pill pd-pill-price"'));
    assert.ok(!price.includes('data-place-status'));
    assert.equal(renderToStaticMarkup(React.createElement(PlaceBadges, { variant: 'price' })), '');
  }
});

test('each actual place page ends with a neutral badge guide and readable explanations in both languages', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/components/ds/PlaceBadges.module.css'), 'utf8');
  const guide = css.match(/\.guide\s*\{([^}]+)\}/)?.[1];
  assert.ok(guide.includes('border-radius: var(--radius-xl)'));
  assert.ok(guide.includes('padding-inline: clamp(20px, 4vw, 32px)'));
  assert.ok(guide.includes('background: var(--surface-sunken)'));
  assert.ok(!guide.includes('box-shadow'));
  for (const locale of ['ar', 'en']) {
    const provider = translations(locale);
    const markup = renderToStaticMarkup(React.createElement(placePage(locale, {})));
    const legend = markup.match(/<section\b[^>]*data-place-badge-legend="true"[^>]*>[\s\S]*?<\/section>/)?.[0];
    assert.ok(legend);
    assert.ok(!/class="[^"]*\bavailable\b/.test(legend));
    assert.ok(!legend.includes('data-place-status='));
    assert.equal((legend.match(/<li>/g) ?? []).length, 3);
    assert.ok(legend.includes(locale === 'en' ? 'About the badges' : 'عن الشارات'));
    const headingId = legend.match(/aria-labelledby="([^"]+)"/)?.[1];
    assert.ok(headingId && legend.includes(`<h2 id="${headingId}"`));
    for (const key of ['place.menuHint', 'place.priceVerifiedHint', 'place.visitedByUsHint']) assert.ok(legend.includes(provider.useI18n().t(key).replace(/'/g, '&#x27;')));
    assert.ok(markup.indexOf('data-similar') < markup.indexOf('data-place-badge-legend'));
    assert.ok(markup.indexOf('<aside') < markup.indexOf('data-place-badge-legend'));
  }
});

test('both card components keep passive chips inside keyboard-native links and save controls outside', () => {
  for (const locale of ['ar', 'en']) {
    const flags = { hasMenu: true, priceVerified: false, visitedByUs: true };
    const ExplorerCard = loadModule('src/components/explorer/PlaceCard.tsx', {
      '@/components/ds/PlaceCard': { PlaceCard: cardModule(locale) },
      '@/components/ds/PlaceBadges': badgeModule(locale),
      'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
      'next/image': { default: () => null },
      '@/components/ui/card': { Card: ({ children, className }) => React.createElement('div', { className }, children) },
      '@/components/ui/badge': { Badge: ({ children }) => React.createElement('span', null, children) },
      '@/components/ui/button': { Button: ({ children, onClick }) => React.createElement('button', { onClick }, children) },
    }).PlaceCard;
    for (const Card of [cardModule(locale), ExplorerCard]) {
      const markup = renderToStaticMarkup(React.createElement(Card, { title: 'Test place', area: '', href: '/explorer/test-city/test-place',
        citySlug: 'test-city', placeSlug: 'test-place', onToggleFavorite: () => {}, ...flags }));
      const href = `/${locale}/explorer/test-city/test-place/`;
      const anchor = [...markup.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].find((match) => match[0].includes('khg-place-card-link') && match[0].includes(`href="${href}"`))?.[0];
      assert.ok(anchor);
      assertStatuses(anchor, [true, false, true], locale);
      assert.equal((markup.match(/<button\b/g) ?? []).length, 1);
      assert.ok(!/<(?:button|input|select|textarea)\b|tabindex=|role="(?:button|link)"/i.test(anchor));
      assert.equal((anchor.match(/<a\b/g) ?? []).length, 1);
      assert.ok(!anchor.includes('<button'));
    }
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/components/ds/PlaceBadges.tsx'), 'utf8');
  assert.ok(!/onClick|onPointer|stopPropagation|Popover|tabIndex/.test(source));
  for (const file of ['src/app/_home/Home.tsx', 'src/app/explorer/[citySlug]/CityClient.tsx', 'src/components/explorer/SimilarPlaces.tsx']) {
    const cardSite = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(/<PlaceCard[\s\S]*?href=/.test(cardSite));
  }
});

test('shared card invokes the framework Link with prefetch disabled, and renders no link without a URL', () => {
  for (const locale of ['ar', 'en']) {
    const calls = [];
    const Card = cardModule(locale, (props) => {
      calls.push(props);
      return frameworkLink(props);
    });
    const props = { title: 'Test place', area: '', onToggleFavorite: () => {} };
    const markup = renderToStaticMarkup(React.createElement(Card, { ...props, href: '/explorer/aswan/test-place' }));
    assert.equal(calls.length, 2, 'Photo and name are separate native framework links');
    assert.equal(calls[0].href, `/${locale}/explorer/aswan/test-place/`);
    assert.equal(calls[0].prefetch, false);
    const anchor = markup.match(/<a\b[^>]*>[\s\S]*?<\/a>/)?.[0];
    assert.ok(anchor && anchor.includes('data-next-link="true"'));
    assert.ok(!anchor.includes('<button'));
    assert.equal((markup.match(/<button\b/g) ?? []).length, 1);
    for (const href of [undefined, '']) {
      const noLink = renderToStaticMarkup(React.createElement(Card, { ...props, href }));
      assert.ok(!/<a\b|role="link"/.test(noLink));
      assert.equal(calls.length, 2);
      assertStatuses(noLink, [false, false, false], locale);
      assert.equal((noLink.match(/<button\b/g) ?? []).length, 1);
    }
  }
});

test('legend explains green and grey before the three badges, with full-stop price hints in both languages', () => {
  for (const locale of ['ar', 'en']) {
    const { PlaceBadgeLegend } = badgeModule(locale);
    const markup = renderToStaticMarkup(React.createElement(PlaceBadgeLegend));
    const key = markup.match(/<p\b[^>]*data-place-badge-colors="true"[^>]*>[\s\S]*?<\/p>/)?.[0];
    assert.ok(key);
    assert.equal((key.match(/data-badge-color=/g) ?? []).length, 2);
    assert.ok(!/class="[^"]*\b(?:badge|available|notYet)\b/.test(key));
    const labels = locale === 'en' ? ['Green: this place has it', 'Grey: not yet'] : ['الأخضر: المكان ده عنده الشارة', 'الرمادي: لسه'];
    for (const label of labels) assert.ok(key.includes(label));
    assert.ok(markup.indexOf('data-place-badge-colors') < markup.indexOf('<ul'));
    assert.ok(!markup.includes('data-place-status='));
    assert.equal((markup.match(/<li>/g) ?? []).length, 3);
    const hint = translations(locale).useI18n().t('place.priceVerifiedHint');
    assert.equal(hint, locale === 'en' ? 'Reviewed by the 5argny team: the prices of the services listed here match the place\'s real prices.' : 'راجعها فريق خرجني: أسعار الخدمات المعروضة هنا مطابقة لأسعار المكان الفعلية.');
    assert.ok(markup.includes(hint.replace(/'/g, '&#x27;')));
  }
});

test('renamed badges are distinct, neutral-priced and use the decorative real visited mark', () => {
  for (const locale of ['ar', 'en']) {
    const { PlaceBadges, getPlaceStatuses } = badgeModule(locale);
    const statuses = getPlaceStatuses({}, translations(locale).useI18n().t);
    assert.notEqual(statuses[0].name, statuses[1].name);
    assert.notEqual(statuses[0].explanation, statuses[1].explanation);
    const markup = renderToStaticMarkup(React.createElement(PlaceBadges, { visitedByUs: true }));
    assert.ok(!markup.includes('Utensils'));
    assert.ok(markup.includes('Tag'));
    assert.ok(!markup.includes('Receipt'));
    assert.match(markup, /<img[^>]*src="\/images\/5argny-mark-48.png"[^>]*alt=""/);
    assert.ok(markup.includes('/images/5argny-mark-96.png 2x'));
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/components/ds/PlaceBadges.tsx'), 'utf8');
  assert.ok(!source.includes('Utensils'));
  assert.ok(!source.includes('Receipt'));
});

test('a not-held text or icon chip never names the positive badge; the legend still does', () => {
  for (const locale of ['en', 'ar']) {
    const { PlaceBadges, PlaceStatuses, PlaceBadgeLegend } = badgeModule(locale);
    const dictionary = translations(locale).useI18n().t;
    for (const props of [{}, { hasMenu: false, priceVerified: false, visitedByUs: false }]) {
      for (const element of [React.createElement(PlaceBadges, props), React.createElement(PlaceBadges, { ...props, variant: 'compact' }), React.createElement(PlaceStatuses, props)]) {
        const markup = renderToStaticMarkup(element);
        for (const key of ['place.noMenu', 'place.priceNotChecked', 'place.notVisited']) assert.ok(markup.includes(dictionary(key)));
        for (const key of ['place.menu', 'place.priceVerified', 'place.visitedByUs']) {
          const name = dictionary(key);
          assert.ok(!markup.includes(`>${name}<`));
          assert.ok(!markup.includes(`aria-label="${name}"`));
          assert.ok(!markup.includes(`title="${name}"`));
        }
      }
    }
    const legend = renderToStaticMarkup(React.createElement(PlaceBadgeLegend));
    for (const key of ['place.menu', 'place.priceVerified', 'place.visitedByUs']) assert.ok(legend.includes(dictionary(key)));
  }
});

test('Save remains an outline or brand-filled bookmark, distinct from Love, retaining labels and sibling links', () => {
  const PlaceCard = cardModule('en');
  for (const saved of [false, true]) {
    const markup = renderToStaticMarkup(React.createElement(PlaceCard, { title: 'Test place', favorite: saved, href: '/test', onToggleFavorite: () => {} }));
    const button = markup.match(/<button\b[\s\S]*?<\/button>/)?.[0];
    assert.ok(button.includes('class="Bookmark"'));
    assert.ok(button.includes(`fill="${saved ? 'currentColor' : 'none'}"`));
    assert.ok(button.includes(`aria-label="${saved ? 'Remove Test place from your plan' : 'Add Test place to your plan'}: ${saved ? 1 : 0} saves"`));
    assert.ok(!button.includes('class="Heart"'));
    assert.ok(markup.indexOf('</a>') < markup.indexOf('<button'));
  }
  const PlanItemCard = planCardModule('en');
  const plan = renderToStaticMarkup(React.createElement(PlanItemCard, { saved: { place: { name: 'Test place', slug: 'test', cityId: 'city' } }, onOpen: () => {}, onRemove: () => {} }));
  assert.ok(plan.includes('class="Bookmark"'));
  assert.ok(!plan.includes('class="Heart"'));
});

test('existing green and grey tokens meet text and icon contrast without opacity', () => {
  const tokens = fs.readFileSync(path.join(__dirname, '../src/app/globals.css'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../src/components/ds/PlaceBadges.module.css'), 'utf8');
  function tokenColor(name) {
    const value = tokens.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1];
    assert.ok(value);
    const alias = value.match(/^var\(--([^)]+)\)$/)?.[1];
    return alias ? tokenColor(alias) : value;
  }
  function luminance(hex) {
    const channels = hex.slice(1).match(/../g).map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  for (const [foreground, background] of [['success', 'success-bg'], ['text-secondary', 'surface-sunken']]) {
    const values = [luminance(tokenColor(foreground)), luminance(tokenColor(background))].sort((first, second) => second - first);
    const contrast = (values[0] + 0.05) / (values[1] + 0.05);
    assert.ok(contrast >= 4.5, `${foreground}/${background}: ${contrast}`);
    assert.ok(contrast >= 3);
    console.log(`Badge contrast ${foreground}/${background}: ${contrast.toFixed(2)}:1`);
    assert.ok(css.includes(`color: var(--${foreground})`));
    assert.ok(css.includes(`background: var(--${background})`));
  }
  // The owner asked for a not-held badge's icon to recede like the greyed 5argny mark. Only the
  // two decorative icon rules may use opacity; a label's text never does.
  assert.match(css, /\.notYet svg\s*\{\s*opacity: 0\.4;\s*\}/);
  const textStyles = css.replace(/\.notYet \.mark\s*\{[^}]*\}/, '').replace(/\.notYet svg\s*\{[^}]*\}/, '');
  assert.ok(!/opacity|#[\da-f]{3,8}\b|text-decoration:\s*line-through/i.test(textStyles));
});

test('plan status taps and keyboard navigation preserve opening while remove remains a sibling', () => {
  let opened = 0;
  const tree = planCardModule('en')({ saved: { placeId: 'plan-place', place: { name: 'Test place', rating: 0 } },
    onOpen: () => { opened += 1; } });
  const children = React.Children.toArray(tree.props.children);
  const link = children.find((child) => child.props.role === 'link');
  const button = children.find((child) => child.props.placeId === 'plan-place');
  assert.ok(link && button);
  assert.equal(link.props.tabIndex, 0);
  function assertPassive(node) {
    if (!React.isValidElement(node)) return;
    assert.notEqual(node.type, 'button');
    assert.notEqual(node.type, 'a');
    React.Children.forEach(node.props.children, assertPassive);
  }
  React.Children.forEach(link.props.children, assertPassive);
  link.props.onClick();
  for (const key of ['Enter', ' ']) link.props.onKeyDown({ key, preventDefault: () => {} });
  link.props.onKeyDown({ key: 'Tab', preventDefault: () => assert.fail('Tab must not be prevented') });
  assert.equal(opened, 3);
  assert.equal(button.props.saved, undefined);
  assert.equal(button.props.saveDisabled, undefined);
  assert.equal(opened, 3);
});

test('menu renders localized rows, no null-section heading, small lazy images, fixed sizes and unavailable labels', () => {
  for (const locale of ['en', 'ar']) {
    const { PlaceMenuSection } = loadModule('src/components/explorer/PlaceMenuSection.tsx', {
      '@/i18n/LocaleProvider': translations(locale),
      '@tanstack/react-query': { useQuery: () => ({ data: fixture(), isError: false }) },
      '@/lib/api/client': { apiRequest: () => { throw new Error('Rendering must not fetch'); } },
    });
    const markup = renderToStaticMarkup(React.createElement(PlaceMenuSection, { slug: 'test-place', hasMenu: true }));
    assert.equal((markup.match(/<h3/g) ?? []).length, 1);
    assert.ok(markup.includes('وجبة'));
    assert.ok(markup.includes(locale === 'en' ? 'Drinks' : 'مشروبات'));
    assert.ok(markup.includes(locale === 'en' ? 'Coffee' : 'قهوة'));
    assert.ok(markup.includes(locale === 'en' ? 'Unavailable' : 'غير متاح'));
    assert.ok(markup.includes(locale === 'en' ? '45.5 EGP' : '٤٥٫٥ جنيه'));
    assert.ok(markup.includes('src="https://img.5argny.com/small.webp"'));
    assert.ok(!markup.includes('src="https://img.5argny.com/medium.webp"'));
    assert.ok(markup.includes('loading="lazy"'));
    assert.ok(markup.includes('width="64" height="64"'));
    assert.ok(markup.includes('dir="' + (locale === 'ar' ? 'rtl' : 'ltr') + '"'));
    assert.ok(markup.includes('image-off'));
  }
});

test('menu query waits for client mount, requires hasMenu and hides failures even with cached data', async () => {
  let query;
  let requests = 0;
  const deps = {
    '@/i18n/LocaleProvider': translations('en'),
    '@tanstack/react-query': { useQuery: (options) => { query = options; return {}; } },
    '@/lib/api/client': { apiRequest: async (method, endpoint, options) => {
      requests += 1;
      assert.equal(method, 'GET');
      assert.equal(endpoint, '/v1/places/test-place/menu');
      assert.ok(options.signal);
      return fixture();
    } },
  };
  const component = loadModule('src/components/explorer/PlaceMenuSection.tsx', deps).PlaceMenuSection;
  renderToStaticMarkup(React.createElement(component, { slug: 'test-place', hasMenu: true }));
  assert.equal(query.enabled, false);
  assert.equal(query.retry, false);
  assert.equal(requests, 0);
  const mountedDeps = { ...deps, react: { ...React, useState: () => [true, () => {}] } };
  const mounted = loadModule('src/components/explorer/PlaceMenuSection.tsx', mountedDeps).PlaceMenuSection;
  renderToStaticMarkup(React.createElement(mounted, { slug: 'test-place', hasMenu: false }));
  assert.equal(query.enabled, false);
  renderToStaticMarkup(React.createElement(mounted, { slug: 'test-place', hasMenu: true }));
  assert.equal(query.enabled, true);
  const signal = new AbortController().signal;
  assert.equal((await query.queryFn({ signal })).sections.length, 2);
  assert.equal(requests, 1);
  for (const state of [{ isError: true, data: fixture() }, { isError: false, data: null }, { isError: false, data: { ...fixture(), sections: [] } }, { isError: false, data: { ...fixture(), slug: 'another-place' } }]) {
    const hidden = loadModule('src/components/explorer/PlaceMenuSection.tsx', { ...deps, '@tanstack/react-query': { useQuery: () => state } }).PlaceMenuSection;
    assert.equal(renderToStaticMarkup(React.createElement(hidden, { slug: 'test-place', hasMenu: true })), '');
  }
});

test('price filters show contract labels while sending only level numbers', () => {
  for (const locale of ['en', 'ar']) {
    let selected;
    const { PlaceFilters } = loadModule('src/components/explorer/PlaceFilters.tsx', {
      '@/i18n/LocaleProvider': translations(locale),
      '@/lib/api/hooks/use-taxonomy': { useAmenities: () => ({}), useTags: () => ({}) },
    });
    const element = PlaceFilters({ value: {}, onChange: (value) => { selected = value; } });
    const priceSection = React.Children.toArray(element.props.children)[0];
    const chips = priceSection.props.children.props.children;
    assert.equal(chips.length, 4);
    chips[3].props.onClick();
    assert.deepEqual(plain(selected), { priceRange: ['4'] });
    const markup = renderToStaticMarkup(element);
    assert.ok(markup.includes(locale === 'en' ? '1,000 – 5,000+ EGP' : '١٬٠٠٠ – ٥٬٠٠٠+ جنيه'));
    assert.ok(!markup.includes('$'));
  }
});

test('card name remains independent of wrapping metadata, and menus use mobile rows / wide grids', () => {
  const card = fs.readFileSync(path.join(__dirname, '../src/components/ds/PlaceCard.tsx'), 'utf8');
  const badges = fs.readFileSync(path.join(__dirname, '../src/components/ds/PlaceBadges.module.css'), 'utf8');
  const menu = fs.readFileSync(path.join(__dirname, '../src/components/explorer/PlaceMenuSection.module.css'), 'utf8');
  const postCss = fs.readFileSync('src/components/ds/PostCard.module.css', 'utf8');
  assert.ok(postCss.includes('flex-wrap: wrap'));
  assert.ok(postCss.includes('min-width: 0'));
  assert.ok(card.indexOf('{title}') < card.indexOf('<PlaceBadges'));
  assert.ok(badges.includes('max-inline-size: 100%'));
  assert.ok(badges.includes('flex-wrap: wrap'));
  assert.ok(/\.compact\s*\{\s*flex-wrap: nowrap;/.test(badges));
  assert.ok(/@media \(min-width: 1024px\)\s*\{[\s\S]*?\.mobileStatuses\s*\{\s*display: none;/.test(badges));
  assert.ok(!/(?:margin|padding|inset)-(?:left|right)|(?:^|\n)\s*(?:left|right):/.test(badges));
  assert.ok(menu.includes('grid-template-columns: minmax(0, 1fr)'));
  assert.ok(menu.includes('@media (min-width: 768px)'));
  assert.ok(menu.includes('repeat(2, minmax(0, 1fr))'));
});

if (process.argv.includes('--badges-preview')) {
  const root = path.join(__dirname, '..');
  const css = ['src/app/globals.css', 'src/components/ds/PlaceBadges.module.css']
    .map((filename) => fs.readFileSync(path.join(root, filename), 'utf8')).join('\n');
  const cases = [
    ['off', { hasMenu: false, priceVerified: false, visitedByUs: false }],
    ['on', { hasMenu: true, priceVerified: true, visitedByUs: true }],
    ['mixed', { hasMenu: true, priceVerified: false, visitedByUs: true }],
    ['legacy', {}],
  ];
  const markup = ['ar', 'en'].map((locale) => {
    const cards = cases.map(([name, flags]) => {
      const id = `place-${locale}-${name}`;
      const props = { title: locale === 'ar' ? 'مكان للزيارة' : 'A place to visit', area: locale === 'ar' ? 'الزمالك' : 'Zamalek', href: `#${id}`, priceRange: 2, ...flags };
      return `<div class="fixture-card" data-case="${name}"><h3>${name}</h3>${renderToStaticMarkup(React.createElement(cardModule(locale), props))}</div>`;
    }).join('');
    const pages = cases.map(([name, flags]) => `<div id="place-${locale}-${name}" data-locale="${locale}" data-case="${name}">${renderToStaticMarkup(React.createElement(placePage(locale, flags)))}</div>`).join('');
    const plan = renderToStaticMarkup(React.createElement(planCardModule(locale), { saved: { place: { name: 'مكان للزيارة', nameEn: 'A place to visit', rating: 0, ...cases[2][1] } }, onOpen: () => {}, onRemove: () => {}, removing: false }));
    return `<section class="fixture" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><h2>${locale}</h2><div class="fixture-cards">${cards}</div><div class="fixture-plan">${plan}</div>${pages}</section>`;
  }).join('');
  fs.writeFileSync(path.join(root, '.brief/badges-preview.html'), `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}\n:root{--font-body:Arial,sans-serif;--font-display:Arial,sans-serif}.fixture{padding:16px;max-inline-size:1200px;margin:auto}.fixture-cards{display:flex;flex-wrap:wrap;gap:16px;margin-block-end:24px}.fixture-card{inline-size:160px}.fixture-plan{margin-block-end:24px}.pd-bar{position:static!important}</style><body>${markup}</body></html>`);
  console.log('OFFLINE_BADGES_PREVIEW=.brief/badges-preview.html');
}

if (process.argv.includes('--preview')) {
  const root = path.join(__dirname, '..');
  const css = ['src/app/globals.css', 'src/components/ds/PlaceBadges.module.css', 'src/components/explorer/PlaceMenuSection.module.css']
    .map((filename) => fs.readFileSync(path.join(root, filename), 'utf8')).join('\n');
  const markup = ['ar', 'en'].map((locale) => {
    const menu = fixture();
    for (const section of menu.sections) for (const item of section.items) item.image = null;
    const PlaceMenuSection = loadModule('src/components/explorer/PlaceMenuSection.tsx', {
      '@/i18n/LocaleProvider': translations(locale),
      '@tanstack/react-query': { useQuery: () => ({ data: menu, isError: false }) },
      '@/lib/api/client': { apiRequest: () => { throw new Error('Offline fixture must not fetch'); } },
    }).PlaceMenuSection;
    const props = { title: locale === 'ar' ? 'مكان بمنيو وأسعار متحقق منها' : 'Place with menu and verified prices', area: locale === 'ar' ? 'الزمالك' : 'Zamalek', priceRange: 4, hasMenu: true, priceVerified: true, visitedByUs: true };
    return `<section class="fixture" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><h2>${locale}</h2><div class="fixture-card">${renderToStaticMarkup(React.createElement(cardModule(locale), props))}</div>${renderToStaticMarkup(React.createElement(PlaceMenuSection, { slug: menu.slug, hasMenu: true }))}</section>`;
  }).join('');
  fs.writeFileSync(path.join(root, '.brief/menu-preview.html'), `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}\n.fixture{padding:16px;max-width:760px;margin:auto}.fixture-card{width:180px;margin-block-end:24px}.pd-section-title{font-family:var(--font-display);font-size:var(--text-xl);font-weight:600}</style><body>${markup}</body></html>`);
  console.log('OFFLINE_PREVIEW=.brief/menu-preview.html');
}
