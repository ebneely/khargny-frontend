import { permanentRedirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * /sitemaps/places.xml is what Search Console has submitted since the split, so it keeps working: one 308 to the
 * first numbered file. The catalogue itself lives in places-1.xml … places-N.xml (see /sitemaps/[name]).
 */
export function GET(request: Request): never {
  permanentRedirect(new URL('/sitemaps/places-1.xml', request.url).toString());
}
