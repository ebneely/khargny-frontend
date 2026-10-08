const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load } = require('./offline-loader.cjs');

const origin = 'https://web.invalid';
const city = { id: 'city-cairo', slug: 'cairo', name: 'القاهرة', nameEn: 'Cairo', imageUrl: 'https://images.invalid/city.webp', updatedAt: '2026-09-01T10:00:00Z' };
const place = { id: 'venue', slug: 'new-place', cityId: city.id, name: 'مطعم جميل', nameEn: 'Nice restaurant', categoryId: 'food', region: 'Zamalek', coverImage: 'https://storage.5argny.com/cover_small.webp', images: [{ urls: { small: 'https://images.invalid/small.webp', large: 'https://images.invalid/large.webp', original: 'https://images.invalid/original.jpg' }, width: 2400, height: 1800 }], updatedAt: '2026-09-02T12:00:00Z' };

function dependencies({ locale = 'en', route = '/', search = '', env = {}, fetch, cityRecord = city, placeRecord = place } = {}) {
  const requestHeaders = new Headers({ 'x-khargny-locale': locale, 'x-khargny-path': route, 'x-khargny-search': search });
  const empty = () => null;
  return {
    process: { env: { NODE_ENV: 'production', SEO_BUILD_DATE: '2026-09-30T00:00:00Z', ...env }, cwd: () => path.join(__dirname, '..') },
    fetch: fetch ?? (async (url) => {
      if (url.endsWith('/v1/cities')) return { ok: true, json: async () => ({ data: [cityRecord] }) };
      if (url.includes('/places?')) return { ok: true, json: async () => ({ data: { data: [placeRecord], meta: { total: 1 } } }) };
      if (url.includes('/v1/cities/')) return { ok: true, json: async () => ({ data: cityRecord }) };
      if (url.endsWith('/v1/categories')) return { ok: true, json: async () => ({ data: [{ id: 'food', nameAr: 'مطعم', nameEn: 'Restaurant' }] }) };
      if (url.includes('/v1/places/')) return { ok: true, json: async () => ({ data: placeRecord }) };
      throw new Error('Unexpected offline URL: ' + url);
    }),
    'next/headers': { headers: async () => requestHeaders, cookies: async () => ({ get: () => undefined }) },
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); }, permanentRedirect: (target) => { throw new Error('REDIRECT:' + target); } },
    '@/lib/config': { getApiBaseUrl: () => 'https://api.invalid', SITE_URL: origin },
    './globals.css': {},
    '@/components/QueryProvider': { QueryProvider: empty },
    '@/components/ui/toaster': { Toaster: empty },
    '@/components/analytics/PageViewTracker': { PageViewTracker: empty },
    '@/i18n/LocaleProvider': { LocaleProvider: empty },
    '@/lib/api/site-settings': { getSiteSettings: async () => null },
    '@/lib/api/hooks/use-site-settings': { SiteSettingsProvider: empty },
  };
}

let accumulateMetadata;
let createMetadataElements;
const originalLoad = Module._load;
try {
  Module._load = function (name, ...args) {
    if (name === 'server-only') return {};
    return originalLoad.call(this, name, ...args);
  };
  ({ accumulateMetadata } = require('next/dist/lib/metadata/resolve-metadata'));
  const filename = require.resolve('next/dist/lib/metadata/metadata');
  const renderer = new Module(filename, module);
  renderer.filename = filename;
  renderer.paths = Module._nodeModulePaths(path.dirname(filename));
  renderer._compile(fs.readFileSync(filename, 'utf8') + '\nexports.testRenderMetadata = createMetadataElements;', filename);
  createMetadataElements = renderer.exports.testRenderMetadata;
} finally {
  Module._load = originalLoad;
}

async function headFor(modules, options = {}) {
  const deps = dependencies(options);
  const items = [];
  for (const filename of modules) {
    const metadata = await load(filename, deps).generateMetadata({ params: Promise.resolve({ citySlug: city.slug, placeSlug: place.slug }) });
    items.push([metadata, null]);
  }
  items.push([null, null]);
  const resolved = await accumulateMetadata(options.route ?? '/', items, Promise.resolve(options.route ?? '/'), { trailingSlash: true, isStaticMetadataRouteFile: false });
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, createMetadataElements(resolved)));
  return { html, resolved };
}

module.exports = { dependencies, headFor, city, place, origin };
