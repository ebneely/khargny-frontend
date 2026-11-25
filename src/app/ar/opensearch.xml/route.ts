import { SITE_URL } from '@/lib/config';
import { opensearchDescription } from '@/lib/opensearch';

export const dynamic = 'force-dynamic';

/** /ar/opensearch.xml: the Arabic search description, template under /ar/explorer/. */
export function GET(): Response {
  return new Response(opensearchDescription('ar', SITE_URL), {
    headers: {
      'Content-Type': 'application/opensearchdescription+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
