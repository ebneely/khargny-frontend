import '@5argny/core/web.css';
import type { Viewport } from 'next';
import { Cairo, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { HydrationBoundary } from '@tanstack/react-query';
import { QueryProvider } from '@/components/QueryProvider';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { graph, jsonLdScript, organizationSchema, webSiteSchema } from '@/lib/seo';
import { getSiteSettings } from '@/lib/api/site-settings';
import { getCatalog, markPublicError, optional, primePublicRoute, publicHydration } from '@/lib/server/public-data';
import { KChrome } from '@/components/k/KChrome';
import type { Tab } from '@/components/k/KProvider';

// The 5argny redesign's root layout (spec 002): the prototype stylesheet from @5argny/core is the only global CSS here.
// The pages not rebuilt yet keep the (site) root layout with the old stylesheet; moving between the two is a full load.
export { generateMetadata } from '@/lib/root-metadata';

const cairo = Cairo({ weight: ['600', '700', '800', '900'], subsets: ['arabic', 'latin'], display: 'swap' });
const plex = IBM_Plex_Sans_Arabic({ weight: ['400', '600', '700'], subsets: ['arabic', 'latin'], display: 'swap' });

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#FBF6EE' };

// Light, Dark or Auto from kh.theme, set before the first paint so there is no flash.
const THEME = `(function(){try{var t=localStorage.getItem('kh.theme')||'auto';var d=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#14100D':'#FBF6EE')}catch(e){}})()`;

const tabOf = (path: string): Tab => {
  const first = path.split('/').filter(Boolean)[0] ?? '';
  return first === 'explorer' ? 'explore' : first === 'marketplace' || first === 'trips' ? 'market' : first === 'plan' || first === 'saved' ? 'saved' : first === 'settings' ? 'profile' : 'home';
};

export default async function KLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const h = await headers();
  const chosen = h.get('x-khargny-locale') ?? (await cookies()).get('khargny.locale')?.value;
  const locale = chosen === 'en' ? 'en' : 'ar';
  const path = h.get('x-khargny-path') ?? '/';
  const time = new URLSearchParams(h.get('x-khargny-search') ?? '').get('time');
  const [settings, catalog] = await Promise.all([
    getSiteSettings(),
    optional(getCatalog(), { cities: [], categories: [] }),
    primePublicRoute(path, h.get('x-khargny-search') ?? '').catch((error: unknown) => { throw markPublicError(error, locale); }),
  ]);
  const fonts = { '--display': `${cairo.style.fontFamily},${plex.style.fontFamily},system-ui,sans-serif`, '--text': `system-ui,-apple-system,'SF Pro Text','Segoe UI',${plex.style.fontFamily},sans-serif` } as React.CSSProperties;
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} style={fonts} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME }} /></head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph(organizationSchema(locale, settings), webSiteSchema(locale))) }} />
        <LocaleProvider initialLocale={locale}>
          <QueryProvider>
            <HydrationBoundary state={publicHydration([[['cities'], catalog.cities], [['categories'], catalog.categories]])}>
              <KChrome lang={locale} time={time} tab={tabOf(path)}>{children}</KChrome>
            </HydrationBoundary>
            <PageViewTracker />
          </QueryProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
