import { permanentRedirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** The same one-hop alias for the image sitemap: /sitemaps/images.xml → images-1.xml. */
export function GET(request: Request): never {
  permanentRedirect(new URL('/sitemaps/images-1.xml', request.url).toString());
}
