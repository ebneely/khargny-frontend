import { SITE_URL } from '@/lib/config';
import { opensearchDescription } from '@/lib/opensearch';

export const dynamic = 'force-dynamic';

/** /opensearch.xml: the English search description a browser reads for "search 5argny" in the address bar. */
export function GET(): Response {
  return new Response(opensearchDescription('en', SITE_URL), {
    headers: {
      'Content-Type': 'application/opensearchdescription+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
