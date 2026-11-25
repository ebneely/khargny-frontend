import { permanentRedirect } from 'next/navigation';
import { SITE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * /sitemaps/places.xml is what Search Console has submitted since the split, so it keeps working: one 308 to the
 * first numbered file. The catalogue itself lives in places-1.xml … places-N.xml (see /sitemaps/[name]).
 */
export function GET(): never {
  // The public origin, never the origin of the process serving the request (standalone is 0.0.0.0:3000 internally).
  permanentRedirect(`${SITE_URL}/sitemaps/places-1.xml`);
}
