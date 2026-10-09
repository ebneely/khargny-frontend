const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./offline-loader.cjs');
const { dependencies, headFor, origin, place, city: cityRecord } = require('./seo-fixtures.cjs');

test('alternates are ar/en/x-default with absolute slashed URLs and Arabic default', () => {
  const { alternatesFor } = load('src/lib/seo.ts', dependencies());
  const actual = alternatesFor('/explorer/cairo/', 'en');
  assert.deepEqual(Object.keys(actual.languages).sort(), ['ar', 'en', 'x-default']);
  assert.equal(actual.languages.ar, origin + '/ar/explorer/cairo/');
  assert.equal(actual.languages.en, origin + '/en/explorer/cairo/');
  assert.equal(actual.languages['x-default'], actual.languages.ar);
});

test('canonical removes search and fragments without changing the language', () => {
  const { urlFor } = load('src/lib/seo.ts', dependencies());
  assert.equal(urlFor('/explorer/cairo/?q=food&area=x#top', 'en'), origin + '/en/explorer/cairo/');
  assert.equal(urlFor('/', 'ar'), origin + '/ar/');
});

test('text fitting respects whole words and entities', () => {
  const { fitText } = load('src/lib/seo.ts', dependencies());
  assert.equal(fitText('One two &amp; three four', 11), 'One two…');
  assert.equal(fitText('Supercalifragilistic', 10), '…');
  assert.equal(fitText('word &verylongentity; tail', 12), 'word…');
});

test('title fitting reserves the suffix inside 60 characters and applies it exactly once', () => {
  const { fitTitle } = load('src/lib/seo.ts', dependencies());
  for (const locale of ['ar', 'en']) {
    const suffix = locale === 'ar' ? 'خرجني' : 'Khargny';
    const title = fitTitle(('A very long venue name '.repeat(10)) + ' · ' + suffix, locale);
    assert.ok(title.length <= 60);
    assert.equal(title.split(suffix).length, 2);
    assert.equal(fitTitle('Nice place · ' + suffix + ' · ' + suffix, locale), 'Nice place · ' + suffix);
  }
});

test('description fitting normalizes whitespace and stays inside 155 characters', () => {
  const { clampDescription } = load('src/lib/seo.ts', dependencies());
  assert.ok(clampDescription('Long description '.repeat(30)).length <= 155);
  assert.equal(clampDescription('   Nice   place  '), 'Nice place');
});

test('place titles drop complete area/category/location parts before shortening the name', () => {
  const { fitPlaceTitle, fitTitle } = load('src/lib/seo.ts', dependencies());
  const cases = [
    [{ name: 'Movenpick Resort Aswan', category: 'Hotels & Resorts', area: 'Elephantine Island', city: 'Aswan' }, 'en', 'Movenpick Resort Aswan — Hotels & Resorts —… · Khargny'],
    [{ name: 'منتجع موڤنبيك أسوان البرج', category: 'فنادق ومنتجعات', area: 'جزيرة إلفنتين', city: 'أسوان' }, 'ar', 'منتجع موڤنبيك أسوان البرج — فنادق ومنتجعات — جزيرة… · خرجني'],
  ];
  for (const [parts, locale, bad] of cases) {
    const actual = fitPlaceTitle(parts, locale);
    assert.notEqual(actual, bad);
    assert.ok(actual.length <= 60);
    assert.ok(actual.includes(parts.city));
    assert.ok(!actual.includes('…'));
    assert.ok(!/[—–,،-]\s*…?\s*·/.test(actual));
    assert.ok(!/[—–,،-]\s*…?\s*·/.test(fitTitle(bad, locale)));
  }
  assert.equal(fitPlaceTitle({ name: 'Cafe', category: 'A category that is deliberately much too long to keep', area: 'Island', city: 'Aswan' }, 'en'), 'Cafe — Aswan · Khargny');
  assert.equal(fitPlaceTitle({ name: 'A venue name that already fills almost the entire available title', city: 'Aswan' }, 'en'), fitTitle('A venue name that already fills almost the entire available title', 'en'));
  const longName = 'منتجع عربي رائع على ضفاف النيل في مدينة أسوان الجميلة '.repeat(4);
  const shortened = fitPlaceTitle({ name: longName, category: 'فنادق', city: 'أسوان' }, 'ar');
  assert.ok(shortened.length <= 60 && shortened.endsWith('… · خرجني'));
  assert.ok(!/[—–,،-]\s*…/.test(shortened));
});

test('static titles fit uncut and a city count is omitted when it would overflow', async () => {
  const { fitCityTitle, fitTitle } = load('src/lib/seo.ts', dependencies());
  assert.equal(fitCityTitle('Things to do in an unusually long named city', 999, 'en'), fitTitle('Things to do in an unusually long named city', 'en'));
  const { resolved } = await headFor([root, explorer], { route: '/explorer/' });
  assert.equal(resolved.title.absolute, 'Explore Egypt by city · Khargny');
  assert.notEqual(resolved.title.absolute, 'Explore Egypt by city — curated places in every… · Khargny');
  const arabic = await headFor([root, explorer], { route: '/explorer/', locale: 'ar' });
  assert.equal(arabic.resolved.title.absolute, 'استكشف مصر مدينة مدينة · خرجني');
  for (const locale of ['ar', 'en']) {
    const home = await headFor([root], { locale });
    assert.ok(!home.resolved.title.absolute.includes('…'));
    const deps = dependencies({ locale });
    deps['@/components/contact/ContactForm'] = {};
    deps['@/components/privacy/PrivacyPolicyContent'] = {};
    for (const filename of ['src/app/contact/page.tsx', 'src/app/privacy/page.tsx']) {
      const title = (await load(filename, deps).generateMetadata()).title;
      assert.ok(fitTitle(title, locale).length <= 60 && !fitTitle(title, locale).includes('…'));
    }
  }
});

test('descriptions prefer complete sentences or clauses and never leave a connector or dash', () => {
  const { clampDescription } = load('src/lib/seo.ts', dependencies());
  assert.equal(clampDescription('A complete sentence. ' + 'A long follow-up sentence '.repeat(10), 40), 'A complete sentence.');
  assert.equal(clampDescription('A complete clause — ' + 'another long clause '.repeat(10), 30), 'A complete clause…');
  for (const text of ['Beautiful places and ' + 'more destinations '.repeat(10), 'أماكن رائعة و ' + 'المزيد من الأماكن '.repeat(10)]) {
    const result = clampDescription(text, 23);
    assert.ok(result.length <= 23);
    assert.ok(!/(?:\band|\bor|\bbut|(?:^|\s)و|(?:^|\s)أو|[—–-])\s*…?$/.test(result));
  }
  assert.ok(!clampDescription('A place —').endsWith('—'));
  assert.ok(!clampDescription('word &amp; another long phrase '.repeat(10), 15).includes('&am…'));
  assert.equal(clampDescription('word &amp; another long phrase '.repeat(10), 15), 'word &amp;…');
  assert.equal(clampDescription('word &#123; another long phrase '.repeat(10), 15), 'word &#123;…');
});

test('cities and places without a cover explicitly name the generated default image', async () => {
  for (const files of [[root, explorer, city], [root, explorer, city, detail]]) {
    const { html } = await headFor(files, { route: files.includes(detail) ? '/explorer/cairo/new-place/' : '/explorer/cairo/', cityRecord: { ...cityRecord, imageUrl: null }, placeRecord: { ...place, images: [], coverImage: null } });
    assert.ok(html.includes(`property="og:image" content="${origin}/og/default.png"`));
    assert.ok(html.includes(`name="twitter:image" content="${origin}/og/default.png"`));
  }
});

test('preview switch uses VERCEL_ENV first then explicit environment then NODE_ENV', () => {
  const { isPreviewDeployment } = load('src/lib/seo.ts', dependencies());
  for (const [env, expected] of [
    [{ VERCEL_ENV: 'preview', NODE_ENV: 'production' }, true],
    [{ VERCEL_ENV: 'development' }, true],
    [{ VERCEL_ENV: 'production', NEXT_PUBLIC_ENV: 'preview' }, false],
    [{ NEXT_PUBLIC_ENV: 'pre', NODE_ENV: 'production' }, true],
    [{ NEXT_PUBLIC_ENV: 'production' }, false],
    [{ NODE_ENV: 'production' }, false],
    [{ NODE_ENV: 'development' }, true],
    [{ VERCEL_ENV: 'prodution', NODE_ENV: 'production' }, false],
    [{ NEXT_PUBLIC_ENV: 'prod', NODE_ENV: 'production' }, false],
    [{ NEXT_PUBLIC_ENV: 'staging', NODE_ENV: 'production' }, true],
  ]) assert.equal(isPreviewDeployment(env), expected);
});

const root = 'src/app/layout.tsx';
const explorer = 'src/app/explorer/layout.tsx';
const city = 'src/app/explorer/[citySlug]/layout.tsx';
const detail = 'src/app/explorer/[citySlug]/[placeSlug]/layout.tsx';
for (const [name, files, route, image] of [
  ['home', [root], '/', origin + '/og/default.png'],
  ['explorer', [root, explorer], '/explorer/', origin + '/og/default.png'],
  ['city', [root, explorer, city], '/explorer/cairo/', 'https://images.invalid/city.webp'],
  ['place', [root, explorer, city, detail], '/explorer/cairo/new-place/', 'https://images.invalid/large.webp'],
]) {
  test(`${name} renders one canonical, exactly three alternates and its own share image in both languages`, async () => {
    for (const locale of ['ar', 'en']) {
      const { html, resolved } = await headFor(files, { locale, route });
      const canonical = origin + '/' + locale + (route === '/' ? '/' : route);
      assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
      assert.ok(html.includes(`rel="canonical" href="${canonical}"`));
      assert.equal((html.match(/hrefLang=/g) || []).length, 3);
      for (const alternate of ['ar', 'en', 'x-default']) {
        const language = alternate === 'x-default' ? 'ar' : alternate;
        const target = origin + '/' + language + (route === '/' ? '/' : route);
        assert.ok(html.includes(`hrefLang="${alternate}" href="${target}"`));
      }
      assert.ok(html.includes(`property="og:image" content="${image}"`));
      assert.ok(html.includes(`name="twitter:image" content="${image}"`));
      assert.equal((html.match(/property="og:image" /g) || []).length, 1);
      assert.equal((html.match(/name="twitter:image" /g) || []).length, 1);
      assert.ok(html.includes(`property="og:url" content="${canonical}"`));
      assert.ok(html.includes(`property="og:locale" content="${locale === 'ar' ? 'ar_EG' : 'en_US'}"`));
      assert.ok(html.includes(`property="og:locale:alternate" content="${locale === 'ar' ? 'en_US' : 'ar_EG'}"`));
      assert.ok(html.includes('property="og:site_name"'));
      assert.ok(resolved.title.absolute.length <= 60);
      assert.ok(resolved.description.length <= 155);
      assert.equal(resolved.robots.basic, 'index, follow');
      const preview = await headFor(files, { locale, route, env: { VERCEL_ENV: 'preview' } });
      assert.match(preview.html, /name="robots" content="noindex, follow"/);
      assert.match(preview.html, /name="googlebot" content="noindex, follow/);
    }
  });
}

test('search city pages are noindex/follow and canonical to the plain city, filters never enter URLs', async () => {
  for (const search of ['?q=tea&area=x', '?q=', '?area=x&tag=a']) {
    const { html } = await headFor([root, explorer, city], { route: '/explorer/cairo/', search });
    assert.ok(html.includes(`rel="canonical" href="${origin}/en/explorer/cairo/"`));
    assert.ok(!html.includes('?area=') && !html.includes('?q='));
    assert.match(html, /name="robots" content="noindex, follow"/);
  }
});

test('verification tokens render standard Google and Bing tags only when configured', async () => {
  const enabled = await headFor([root], { env: { NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: 'google-test', NEXT_PUBLIC_BING_SITE_VERIFICATION: 'bing-test' } });
  assert.match(enabled.html, /name="google-site-verification" content="google-test"/);
  assert.match(enabled.html, /name="msvalidate.01" content="bing-test"/);
  const unset = await headFor([root]);
  assert.ok(!unset.html.includes('google-site-verification') && !unset.html.includes('msvalidate.01'));
});

test('share cover uses large rendition, preserves aspect ratio and reports no invented dimensions', () => {
  const { shareImageFor } = load('src/lib/seo.ts', dependencies());
  const cover = shareImageFor(place);
  assert.equal(cover.url, 'https://images.invalid/large.webp');
  assert.equal(cover.width, 1600);
  assert.equal(cover.height, 1200);
  const list = shareImageFor({ coverImage: place.coverImage, coverImageDimensions: { width: 800, height: 600 } });
  assert.equal(list.url, 'https://storage.5argny.com/cover_large.webp');
  assert.equal(list.width, 800);
  assert.equal(list.height, 600);
  const unknown = shareImageFor({ coverImage: 'https://images.invalid/plain.jpg' });
  assert.equal(unknown.width, undefined);
  assert.equal(unknown.height, undefined);
  assert.equal(shareImageFor({}).url, origin + '/og/default.png');
});

test('robots blocks previews completely while production retains its sitemap and plan rules', () => {
  const production = load('src/lib/robots.ts', dependencies()).default();
  assert.equal(production.sitemap, origin + '/sitemap.xml');
  assert.equal(production.rules.allow, '/');
  assert.ok(production.rules.disallow.includes('/ar/plan'));
  const preview = load('src/lib/robots.ts', dependencies({ env: { VERCEL_ENV: 'preview' } })).default();
  assert.equal(preview.rules.disallow, '/');
  assert.equal(preview.rules.allow, undefined);
  assert.equal(preview.sitemap, undefined);
});

test('the spelling people type, 5argny, is stated where a crawler reads names', () => {
  const { homeTitle, organizationSchema, webSiteSchema, brandAlternateNames } = load('src/lib/seo.ts', dependencies());
  for (const locale of ['ar', 'en']) {
    const title = homeTitle(locale);
    assert.match(title, /5argny/);
    assert.match(title, locale === 'ar' ? /خرجني/ : /Khargny/);
    assert.ok(title.length <= 60, `${locale} home title is ${title.length} characters`);
    assert.equal(brandAlternateNames(locale)[0], '5argny');
    assert.ok(webSiteSchema(locale).alternateName.includes('5argny'));
    assert.ok(organizationSchema(locale, {}).alternateName.includes('5argny'));
    // The primary name stays the language's own name.
    assert.equal(webSiteSchema(locale).name, locale === 'ar' ? 'خرجني' : 'Khargny');
  }
});
