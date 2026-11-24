import '@5argny/core/web.css';
import type { Viewport } from 'next';
import { Cairo, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { HydrationBoundary } from '@tanstack/react-query';
import { QueryProvider } from '@/components/QueryProvider';
import { NavProgress } from '@/components/NavProgress';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { graph, jsonLdScript, organizationSchema, webSiteSchema } from '@/lib/seo';
import { getSiteSettings } from '@/lib/api/site-settings';
import { getCatalog, getCategoryTotals, optional, publicHydration } from '@/lib/server/public-data';
import { catTotalsKey } from '@/components/k/data';
import { KChrome } from '@/components/k/KChrome';
import { localeOf } from '@/lib/seo';
import type { Lang } from '@/components/k/rules';

// The 5argny redesign's root layout (spec 002): the prototype stylesheet from @5argny/core is the only global CSS here.
// The pages not rebuilt yet keep the (site) root layout with the old stylesheet; moving between the two is a full load.
export { generateMetadata } from '@/lib/root-metadata';

const cairo = Cairo({ subsets: ['arabic', 'latin'], display: 'swap' }) // the variable font: one file per script, not one per weight;
const plex = IBM_Plex_Sans_Arabic({ weight: ['400', '600', '700'], subsets: ['arabic', 'latin'], display: 'swap' });

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover', themeColor: '#FBF6EE' };

/**
 * The redesign's addresses exist in two languages, and that is all this segment ever holds: `en` (the plain URL) and
 * `ar`. Declaring them is what lets Next render these routes once and keep them (ISR) instead of rendering them per
 * request: the segment is known, so nothing about it is dynamic. Routes with a deeper address (a place) declare their
 * own `generateStaticParams` and are rendered on first request, then cached (`revalidate` on the page).
 */
export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

// Light, Dark or Auto from kh.theme, set before the first paint so there is no flash. A phone landing on a sheet address
// hides the server-drawn page until the sheet comes up over Home (no desktop page flashing first).
// ?off=a,b (kept for the tab) switches suspects off to find what is slow on a device with no inspector (iPhone): blur, loops,
// cv, layer, fps (shows a frame counter). ?off= clears it.
const THEME = `(function(){try{var t=localStorage.getItem('kh.theme')||'auto';var d=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#14100D':'#FBF6EE');var p=location.pathname.split('/').filter(Boolean);if(p[0]==='ar')p.shift();if(innerWidth<1024&&((p[0]==='explorer'&&p.length===3)||(['c','marketplace','host'].indexOf(p[0])>=0&&p.length===2)))document.documentElement.classList.add('landing');var o=new URLSearchParams(location.search).get('off');if(o!==null)sessionStorage.setItem('kh.off',o);o=(sessionStorage.getItem('kh.off')||'').split(',');o.forEach(function(x){if(x)document.documentElement.classList.add('off-'+x)});if(o.indexOf('fps')>=0)addEventListener('DOMContentLoaded',function(){var d=document.createElement('div');d.style.cssText='position:fixed;z-index:999;top:4px;left:50%;transform:translateX(-50%);background:#000;color:#0f0;font:700 13px monospace;padding:2px 8px;border-radius:8px;pointer-events:none';document.body.appendChild(d);var n=0,t=performance.now(),w=0,l=t;(function f(x){n++;if(x-l>w)w=x-l;l=x;if(x-t>=1000){d.textContent=n+' fps, worst '+Math.round(w)+' ms ['+o.join(',')+']';n=0;w=0;t=x}requestAnimationFrame(f)})(t)})}catch(e){}})()`;

export default async function KLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ lang: string }> }>) {
  // The language is the URL's segment (owner 2026-11-14): the middleware rewrites `/ar/...` to `/ar/...` and a plain
  // path to `/en/...`, so the render knows it from `params` alone. No cookies/headers here: that is what lets Home,
  // Explore and the place pages be rendered once and cached (ISR, see src/app/api/revalidate).
  const locale: Lang = localeOf((await params).lang);
  const [settings, catalog, totals] = await Promise.all([
    getSiteSettings(),
    optional(getCatalog(), { cities: [], categories: [] }),
    optional(getCategoryTotals(), null),
  ]);
  const fonts = { '--display': `${cairo.style.fontFamily},${plex.style.fontFamily},system-ui,sans-serif`, '--text': `system-ui,-apple-system,'SF Pro Text','Segoe UI',${plex.style.fontFamily},sans-serif` } as React.CSSProperties;
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} style={fonts} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME }} /><style>{'html.landing #app{visibility:hidden}'}</style></head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph(organizationSchema(locale, settings), webSiteSchema(locale))) }} />
        <LocaleProvider initialLocale={locale}>
          <QueryProvider>
            <HydrationBoundary state={publicHydration([[['cities'], catalog.cities], [['categories'], catalog.categories], ...(totals ? [[catTotalsKey(null, null), totals] as [readonly string[], unknown]] : [])])}>
              <KChrome lang={locale}>{children}</KChrome>
            </HydrationBoundary>
            <NavProgress />
            <PageViewTracker />
          </QueryProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
