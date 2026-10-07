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
      if (name === 'lucide-react') return Object.fromEntries(['Utensils', 'BadgeCheck', 'Footprints', 'ImageOff', 'Heart', 'Navigation', 'Eye', 'Star']
        .map((iconName) => [iconName, (props) => React.createElement('svg', { ...props, className: iconName === 'ImageOff' ? 'image-off' : iconName })]));
      if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => String(key) }) };
      if (name.startsWith('@/')) return loadModule(`src/${name.slice(2)}.ts`, dependencies);
      if (name.startsWith('.')) throw new Error(`Missing local dependency: ${name}`);
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
  return { useI18n: () => ({ locale, t: (key) => key.split('.').reduce((value, part) => value?.[part], dictionaries.dictionaries[locale]) }) };
}

function cardModule(locale) {
  const provider = translations(locale);
  return loadModule('src/components/ds/PlaceCard.tsx', {
    '@/i18n/LocaleProvider': provider,
    './IconButton': { IconButton: () => null },
    './PlaceBadges': loadModule('src/components/ds/PlaceBadges.tsx', { '@/i18n/LocaleProvider': provider }),
    '@/lib/api/hooks/use-saved-places': { useSaveToggle: () => ({ saved: false, toggle: () => {} }) },
  }).PlaceCard;
}

test('rendered cards keep badge-free legacy content and put the name before all new badges', () => {
  for (const locale of ['en', 'ar']) {
    const PlaceCard = cardModule(locale);
    const props = { title: 'Test place', area: 'Test area', priceRange: 4 };
    const legacy = renderToStaticMarkup(React.createElement(PlaceCard, props));
    assert.ok(!legacy.includes('<button'));
    assert.ok(!legacy.includes('<svg'));
    assert.ok(legacy.includes('Test area'));
    const modern = renderToStaticMarkup(React.createElement(PlaceCard, { ...props, hasMenu: true, priceVerified: true, visitedByUs: true }));
    const menuLabel = locale === 'en' ? 'Menu' : 'المنيو';
    assert.ok(modern.indexOf('title="Test place"') < modern.indexOf(menuLabel));
    assert.ok(modern.includes('flex-wrap:wrap'));
  }
});

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
  loadModule('src/lib/api/hooks/use-saved-places.ts', deps).useSavedPlaces();
  assert.equal((await query.queryFn())[0].place.hasMenu, false);
});

test('badge order, icons, accessible verification trigger and localized copy match the brief', () => {
  for (const locale of ['ar', 'en']) {
    const { PlaceBadges } = loadModule('src/components/ds/PlaceBadges.tsx', { '@/i18n/LocaleProvider': translations(locale) });
    const markup = renderToStaticMarkup(React.createElement(PlaceBadges, { hasMenu: true, priceRange: 4, priceVerified: true, visitedByUs: true }));
    const labels = locale === 'en' ? ['Menu', '1,000 – 5,000+ EGP', 'Price verified', 'Visited by 5argny'] : ['المنيو', '١٬٠٠٠ – ٥٬٠٠٠+ جنيه', 'السعر متحقق منه', 'زرناه'];
    const positions = labels.map((label) => markup.indexOf(label));
    assert.ok(positions.every((position) => position >= 0));
    assert.ok(positions.every((position, index) => index === 0 || position > positions[index - 1]));
    assert.equal((markup.match(/<svg /g) ?? []).length, 3);
    assert.ok(markup.includes('type="button"'));
    assert.ok(markup.includes('aria-label='));
    assert.ok(markup.includes(locale === 'en' ? '5argny checked this against the menu' : 'خرجني راجعت السعر على المنيو'));
    const legacy = renderToStaticMarkup(React.createElement(PlaceBadges, { priceRange: 1 }));
    assert.ok(!legacy.includes('<svg'));
    assert.ok(!legacy.includes('<button'));
    assert.equal(renderToStaticMarkup(React.createElement(PlaceBadges)), '');
  }
});

test('expanded verification popover resolves aria-controls and describes its inner text in both languages', () => {
  const Popover = require('@radix-ui/react-popover');
  for (const locale of ['ar', 'en']) {
    const provider = translations(locale);
    const { PlaceBadges } = loadModule('src/components/ds/PlaceBadges.tsx', {
      '@/i18n/LocaleProvider': provider,
      react: { ...React, useState: () => [true, () => {}] },
      '@radix-ui/react-popover': { ...Popover, Portal: ({ children }) => children },
    });
    const markup = renderToStaticMarkup(React.createElement(PlaceBadges, { priceRange: 2, priceVerified: true }));
    const button = markup.match(/<button\b[^>]*>/)?.[0];
    const dialog = markup.match(/<div\b[^>]*role="dialog"[^>]*>/)?.[0];
    assert.ok(button);
    assert.ok(dialog);
    assert.ok(button.includes('aria-expanded="true"'));
    const controls = button.match(/aria-controls="([^"]+)"/)?.[1];
    const description = button.match(/aria-describedby="([^"]+)"/)?.[1];
    assert.ok(controls);
    assert.ok(description);
    assert.equal(dialog.match(/\sid="([^"]+)"/)?.[1], controls);
    assert.notEqual(description, controls);
    const explanation = provider.useI18n().t('place.priceVerifiedHint');
    assert.ok(markup.includes(`<span id="${description}">${explanation}</span>`));
  }
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
  assert.ok(card.includes('flexWrap: "wrap"'));
  assert.ok(card.includes('minWidth: 0'));
  assert.ok(card.indexOf('{title}') < card.indexOf('<PlaceBadges'));
  assert.ok(badges.includes('max-inline-size: 100%'));
  assert.ok(badges.includes('flex-wrap: wrap'));
  assert.ok(badges.includes('min-block-size: 44px'));
  assert.ok(menu.includes('grid-template-columns: minmax(0, 1fr)'));
  assert.ok(menu.includes('@media (min-width: 768px)'));
  assert.ok(menu.includes('repeat(2, minmax(0, 1fr))'));
});

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
