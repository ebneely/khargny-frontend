import { permanentRedirect } from 'next/navigation';
import { SITE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** The same one-hop alias for the image sitemap: /sitemaps/images.xml → images-1.xml. */
export function GET(): never {
  // The public origin, never the origin of the process serving the request (standalone is 0.0.0.0:3000 internally).
  permanentRedirect(`${SITE_URL}/sitemaps/images-1.xml`);
}
