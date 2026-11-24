import { imagesSitemap } from '@/lib/sitemap';
import { imageSitemapXml } from '@/lib/crawler-responses';

export const dynamic = 'force-dynamic';

/** /sitemaps/images.xml: the place pages and their own photos, in the image sitemap namespace. */
export async function GET(): Promise<Response> {
  try {
    return new Response(imageSitemapXml(await imagesSitemap()), {
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
