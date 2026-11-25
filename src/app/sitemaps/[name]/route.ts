import { imagesSitemapFile, placesSitemapFile } from '@/lib/sitemap';
import { imageSitemapXml, sitemapXml } from '@/lib/crawler-responses';

export const dynamic = 'force-dynamic';

/**
 * /sitemaps/places-1.xml … places-N.xml and /sitemaps/images-1.xml … images-N.xml.
 *
 * The file name carries the number because Google reads at most 50,000 URLs per file; a file holds 20,000 places
 * (40,000 URLs once English and Arabic are counted). A number past the catalogue's last file is a 404, not an empty
 * sitemap, so Search Console reports it instead of counting it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }): Promise<Response> {
  const { name } = await params;
  const match = /^(places|images)-(\d+)\.xml$/.exec(name);
  if (!match) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });

  const kind = match[1] as 'places' | 'images';
  const index = Number(match[2]);
  try {
    if (kind === 'places') {
      const entries = await placesSitemapFile(index);
      if (!entries) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
      return xml(sitemapXml(entries));
    }
    const entries = await imagesSitemapFile(index);
    if (!entries) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
    return xml(imageSitemapXml(entries));
  } catch {
    return new Response('Sitemap temporarily unavailable', {
      status: 500,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}

function xml(body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
