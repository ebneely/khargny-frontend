import { getHomeData } from '@/components/k/home-data';
import { HomeView } from '@/components/k/home';
import { localeOf } from '@/lib/seo';

// Home (spec 002 T021), server-rendered for search: every row is built from the real API and handed to the client view.
// No per-request API here (the language is the [lang] segment), so the page is rendered once and served from the cache
// until it goes stale (ISR, 300 s) or the backend calls POST /api/revalidate after a place changes.
export const revalidate = 300;
export const dynamic = 'force-static';

/**
 * The two addresses Home exists at. It is declared here as well as on the layout because a page that is itself the
 * `[lang]` segment needs its own list for Next to treat the route as rendered-once-and-kept (ISR) rather than dynamic.
 */
export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  // An API outage while this page is being rendered must not break the build or the whole site: Home's client-side blend
  // fills the rows in, and the page revalidates in 300 s.
  const data = await getHomeData(localeOf(lang)).catch(() => ({ pool: [], trending: [], collections: [], categories: [], openByCategory: null }));
  return <HomeView data={data} />;
}
