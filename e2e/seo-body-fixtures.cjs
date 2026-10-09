const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load } = require('./offline-loader.cjs');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

const city = { id: 'aswan', slug: 'aswan', name: 'أسوان', nameEn: 'Aswan', region: 'Aswan', status: 'active', areaKeys: ['Island'], descriptionAr: 'اكتشف أسوان على النيل.', descriptionEn: 'Discover Aswan on the Nile.', imageUrl: 'https://storage.5argny.com/city.webp' };
const category = { id: 'food', slug: 'dining', nameAr: 'مطاعم', nameEn: 'Restaurants', icon: 'utensils' };
const places = Array.from({ length: 147 }, (_, index) => ({
  id: `place-${index + 1}`, slug: `place-${index + 1}`, cityId: city.id, categoryId: category.id,
  name: `مكان ${index + 1}`, nameEn: `Place ${index + 1}`, description: 'وصف المكان على النيل.', descriptionEn: 'A place overlooking the Nile.',
  address: '12 Nile Road', region: 'Island', phone: '+201234567890', rating: 0, priceRange: 2, hasMenu: true, priceVerified: true, visitedByUs: true,
  coverImage: 'https://storage.5argny.com/cover_small.webp', coverImageDimensions: { width: 1200, height: 900 },
  images: [1, 2, 3].map((position) => ({ urls: { small: `https://storage.5argny.com/${position}_small.webp`, medium: `https://storage.5argny.com/${position}_medium.webp`, original: `https://storage.5argny.com/${position}.jpg` }, width: 1200, height: 900 })),
  videos: [], amenities: [], placeHours: [{ dayOfWeek: 0, openTime: '09:00', closeTime: '22:00', isClosed: false }],
}));
const menu = { placeId: places[0].id, slug: places[0].slug, currency: 'EGP', updatedAt: '2026-10-08T00:00:00Z', sections: [{ id: 'drinks', nameAr: 'مشروبات', nameEn: 'Drinks', items: [{ id: 'tea', nameAr: 'شاي', nameEn: 'Tea', price: '25.00', available: true, image: null }] }] };

function fixture({ locale = 'en', route = '/', search = '', sources, failure, secondaryFailure = false } = {}) {
  const calls = [];
  const clients = [];
  const navigation = {
    useRouter: () => ({ push() {}, replace() {}, back() {} }),
    usePathname: () => route,
    useParams: () => ({ citySlug: city.slug, placeSlug: places[0].slug }),
    useSearchParams: () => new URLSearchParams(search),
    notFound() { throw Object.assign(new Error('notFound'), { status: 404 }); },
    permanentRedirect(target) { throw Object.assign(new Error('redirect'), { status: 308, target }); },
  };
  const dependencies = {
    process: { env: { NODE_ENV: 'production', CI: '1' } },
    sources,
    react: { ...React, cache(callback) { const cache = new Map(); return (...args) => { const key = JSON.stringify(args); if (!cache.has(key)) cache.set(key, callback(...args)); return cache.get(key); }; } },
    '@/lib/config': { getApiBaseUrl: () => 'https://api.invalid', SITE_URL: 'https://web.invalid' },
    'next/navigation': navigation,
    'next/headers': { headers: async () => new Headers({ 'x-khargny-locale': locale, 'x-khargny-path': route, 'x-khargny-search': search }), cookies: async () => ({ get: () => undefined }) },
    'next/link': { __esModule: true, default: ({ children, prefetch: ignored, ...props }) => React.createElement('a', props, children) },
    '@/components/ds/SiteHeader': { SiteHeader: () => null },
    '@/components/QueryProvider': { QueryProvider: ({ children }) => {
      const [client] = React.useState(() => { const created = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } }); clients.push(created); return created; });
      return React.createElement(QueryClientProvider, { client }, children);
    } },
    '@/components/ds/SiteFooter': { SiteFooter: () => null },
    '@/components/analytics/PageViewTracker': { PageViewTracker: () => null },
    '@/components/ui/toaster': { Toaster: () => null },
    '@/lib/api/site-settings': { getSiteSettings: async () => null },
    '@/lib/api/hooks/use-site-settings': { SiteSettingsProvider: ({ children }) => children, useSiteSettings: () => null },
    fetch: async (address, options = {}) => {
      calls.push({ address, options });
      const url = new URL(address);
      const pathname = url.pathname;
      if (failure || (secondaryFailure && /\/home|\/menu|\/similar/.test(pathname))) return { ok: false, status: failure ?? 503 };
      let data;
      if (pathname === '/v1/cities') data = [city];
      else if (pathname === '/v1/categories') data = [category];
      else if (pathname === '/v1/cities/aswan') data = city;
      else if (pathname === '/v1/cities/aswan/places') data = { data: [places[0]], meta: { total: places.length, limit: 1, skip: 0 } };
      else if (pathname === '/v1/places') { const skip = Number(url.searchParams.get('skip')); const limit = Number(url.searchParams.get('limit')); data = { data: places.slice(skip, skip + limit), meta: { total: places.length, skip, limit } }; }
      else if (pathname === '/v1/search/places') {
        const matching = places.filter(place => [place.name, place.nameEn].some(name => name.toLowerCase().includes((url.searchParams.get('q') ?? '').toLowerCase())));
        const skip = Number(url.searchParams.get('skip'));
        const limit = Number(url.searchParams.get('limit'));
        data = { items: matching.slice(skip, skip + limit), total: matching.length };
      }
      else if (pathname === '/v1/places/place-1') data = places[0];
      else if (pathname === '/v1/places/place-1/menu') data = menu;
      else if (pathname === '/v1/places/place-1/similar') data = places.slice(1, 5);
      else if (pathname === '/v1/home') data = [{ id: 'rail', key: 'rail', titleAr: 'مختارات', titleEn: 'Selected places', kind: 'custom', places: places.slice(0, 3) }];
      else if (pathname === '/v1/home/featured') data = { section: { titleAr: 'مميز', titleEn: 'Featured' }, rotation: { bucket: 100, nextAt: '2099-01-01T00:00:00Z' }, items: [{ sponsored: true, campaignId: '00000000-0000-4000-8000-000000000001', place: places[5] }] };
      else if (pathname === '/v1/home/top-places') data = { rotation: { bucket: 100, nextAt: '2099-01-01T00:00:00Z' }, items: [{ sponsored: false, campaignId: null, position: 1, place: places[6] }] };
      else return { ok: false, status: 404 };
      return { ok: true, status: 200, json: async () => ({ success: true, data }) };
    },
  };
  return { dependencies, calls, clients, locale, route, search };
}

async function serverTree(value) {
  if (Array.isArray(value)) return Promise.all(value.map(async (child, index) => { const expanded = await serverTree(child); return React.isValidElement(expanded) ? React.cloneElement(expanded, { key: child?.key ?? `offline-${index}` }) : expanded; }));
  if (!React.isValidElement(value)) {
    if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, child]) => [key, await serverTree(child)])));
    return value;
  }
  if (typeof value.type === 'function' && value.type.constructor.name === 'AsyncFunction') return serverTree(await value.type(value.props));
  const props = { ...value.props };
  for (const key of ['children', 'secondary', 'menu', 'related', 'cityCounts', 'countSlots']) if (key in props) props[key] = await serverTree(props[key]);
  return React.cloneElement(value, props);
}

async function renderRoute(context, file) {
  const props = { params: Promise.resolve({ citySlug: city.slug, placeSlug: places[0].slug }), searchParams: Promise.resolve(Object.fromEntries(new URLSearchParams(context.search))) };
  const Page = load(file, context.dependencies).default;
  const page = Page.constructor.name === 'AsyncFunction' ? await Page(props) : React.createElement(Page, props);
  const Root = load('src/app/layout.tsx', context.dependencies).default;
  try { return renderToStaticMarkup(await serverTree(await Root({ children: await serverTree(page) }))); }
  finally { for (const client of context.clients) client.clear(); }
}

module.exports = { fixture, renderRoute, serverTree, city, places, category };
