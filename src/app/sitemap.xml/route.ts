import { sitemapIndexEntries } from '@/lib/sitemap';
import { sitemapIndexXml } from '@/lib/crawler-responses';

export const dynamic = 'force-dynamic';

/** /sitemap.xml: a sitemap index, so each kind of page keeps its own file and its own dates. */
export function GET(): Response {
  return new Response(sitemapIndexXml(sitemapIndexEntries()), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
