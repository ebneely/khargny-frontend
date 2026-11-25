import { sitemapIndexEntries } from '@/lib/sitemap';
import { sitemapIndexXml } from '@/lib/crawler-responses';

export const dynamic = 'force-dynamic';

/** /sitemap.xml: a sitemap index — static once, then every numbered place and image file with its own lastmod. */
export async function GET(): Promise<Response> {
  try {
    return new Response(sitemapIndexXml(await sitemapIndexEntries()), {
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
