import { staticSitemap } from '@/lib/sitemap';
import { sitemapXml } from '@/lib/crawler-responses';

export const dynamic = 'force-dynamic';

/** /sitemaps/static.xml: the site's own pages (and trips, when the tourism module is present). */
export async function GET(): Promise<Response> {
  try {
    return new Response(sitemapXml(await staticSitemap()), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
    });
  } catch {
    return new Response('Sitemap temporarily unavailable', {
      status: 500,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}
