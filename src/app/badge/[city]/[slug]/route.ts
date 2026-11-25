import { getCities, getPlace } from '@/lib/server/public-data';
import { ApiError } from '@/lib/api/client';

/**
 * The "Find us on 5argny" badge (SEO Stage 3): a place can embed it on its own website, and the
 * link points back at the place's page — a free backlink the place's owner is happy to add.
 *
 *   /badge/{city}/{slug}.svg
 *
 * It reads no cookies and tracks nobody: the same bytes for every place, cached for a year. An
 * unknown place or a city that does not own it is a real 404, so the route cannot be used to mint
 * links for places that do not exist.
 */
export const dynamic = 'force-static';

const CACHE = 'public, max-age=31536000, immutable';

/** 240×64, self-contained: no external image or font file, so it renders inside an <img>. */
function badgeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64" role="img" aria-label="Find us on 5argny — تلاقينا على خرجني">
<rect x="0.5" y="0.5" width="239" height="63" rx="12" fill="#FBF6EE" stroke="#EFE6DA"/>
<rect x="8" y="8" width="48" height="48" rx="14" fill="#FF6100"/>
<text x="32" y="42" text-anchor="middle" font-family="Cairo, 'IBM Plex Sans Arabic', system-ui, sans-serif" font-size="30" font-weight="900" fill="#FFFFFF">5</text>
<text x="66" y="28" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13.5" font-weight="700" fill="#241C16">Find us on 5argny</text>
<text x="66" y="47" font-family="Cairo, 'IBM Plex Sans Arabic', system-ui, sans-serif" font-size="13" font-weight="600" fill="#6E6259">تلاقينا على خرجني</text>
</svg>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ city: string; slug: string }> },
) {
  const { city, slug } = await params;
  if (!slug.endsWith('.svg')) return new Response('Not found', { status: 404 });
  const placeSlug = slug.slice(0, -'.svg'.length);

  try {
    const [place, cities] = await Promise.all([getPlace(placeSlug), getCities()]);
    const owner = cities.find((item) => item.slug === city);
    // A badge only exists for the city the place is really in.
    if (!owner || owner.id !== place.cityId) return new Response('Not found', { status: 404 });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return new Response('Not found', { status: 404 });
    return new Response('Badge unavailable', { status: 503 });
  }

  return new Response(badgeSvg(), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': CACHE,
      'x-robots-tag': 'noindex',
    },
  });
}
