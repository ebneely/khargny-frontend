import type { Metadata } from 'next';
import { API_BASE_URL, SITE_URL } from '@/lib/config';
import {
  alternatesFor,
  breadcrumbSchema,
  clampDescription,
  currentLocale,
  currentPath,
  graph,
  jsonLdScript,
  ogAlternateLocale,
  ogLocale,
  urlFor,
} from '@/lib/seo';

/**
 * Server wrapper for the (client) city page, which cannot export metadata itself.
 *
 * Without this every city inherited the root layout's metadata verbatim: Cairo, Alexandria
 * and Luxor all shipped the same title, the same description, and a canonical pointing at
 * the site root. Nine of the site's most searchable pages were telling Google they were
 * duplicates of the home page.
 */
type Params = { citySlug: string };

type City = {
  name?: string;
  nameEn?: string;
  slug?: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  imageUrl?: string | null;
  areaKeys?: string[] | null;
};

async function fetchCity(slug: string): Promise<City | null> {
  if (!API_BASE_URL) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/cities/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data ?? json;
    return (data?.city ?? data) as City;
  } catch {
    return null;
  }
}

/** How many places the city has, for a description that states a real number. */
async function fetchCount(slug: string): Promise<number | null> {
  if (!API_BASE_URL) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/cities/${slug}/places?limit=1`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // The envelope is {success, data:{data:[…], meta}} — the meta sits one level deeper
    // than the outer `data`, so reading json.meta.total silently returned nothing.
    return json?.data?.meta?.total ?? json?.meta?.total ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { citySlug } = await params;
  const locale = await currentLocale();
  const isAr = locale === 'ar';
  const path = `/explorer/${citySlug}`;

  const [city, count] = await Promise.all([fetchCity(citySlug), fetchCount(citySlug)]);

  const name =
    (isAr ? city?.name : city?.nameEn) || city?.name || city?.nameEn || citySlug;

  // The title carries the words someone actually types: the city, what they want, and the
  // country. "Cairo" alone competes with the whole internet.
  const title = isAr
    ? `أماكن ${name} — مطاعم ومقاهي وأنشطة${count ? ` (${count} مكان)` : ''}`
    : `Things to do in ${name}${count ? ` — ${count} places` : ''}`;

  const editorial = isAr ? city?.descriptionAr : city?.descriptionEn;
  const description =
    clampDescription(editorial || '') ||
    (isAr
      ? `اكتشف أفضل الأماكن في ${name}: مطاعم، مقاهي، شواطئ، فنادق ومعالم${count ? ` — ${count} مكان مختار` : ''}. تصفح حسب المنطقة والتصنيف على خرجني.`
      : `Discover the best places in ${name} — restaurants, cafes, beaches, hotels and landmarks${count ? `, ${count} curated spots` : ''}. Browse by area and category on Khargny.`);

  const image = city?.imageUrl || '/images/logo-en.png';

  return {
    title,
    description,
    alternates: alternatesFor(path, locale),
    openGraph: {
      type: 'website',
      title,
      description,
      url: urlFor(path, locale),
      images: [{ url: image, alt: name }],
      locale: ogLocale(locale),
      alternateLocale: ogAlternateLocale(locale),
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function CityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { citySlug } = await params;
  const locale = await currentLocale();
  const isAr = locale === 'ar';

  // A place page renders inside this layout too. Only the city page itself should describe
  // itself as a collection and emit the city breadcrumb; the place page emits its own,
  // longer one, and two BreadcrumbLists on a page is worse than none.
  const path = await currentPath();
  const isCityPage = path.replace(/\/+$/, '').split('/').filter(Boolean).length <= 2;
  if (!isCityPage) return <>{children}</>;

  const city = await fetchCity(citySlug);
  const name = (isAr ? city?.name : city?.nameEn) || city?.name || citySlug;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            graph(
              breadcrumbSchema(
                [
                  { name: isAr ? 'الرئيسية' : 'Home', path: '/' },
                  { name: isAr ? 'استكشف' : 'Explore', path: '/explorer' },
                  { name, path: `/explorer/${citySlug}` },
                ],
                locale,
              ),
              {
                '@type': 'CollectionPage',
                '@id': `${urlFor(`/explorer/${citySlug}`, locale)}#page`,
                url: urlFor(`/explorer/${citySlug}`, locale),
                name,
                isPartOf: { '@id': `${SITE_URL}/#website` },
                about: {
                  '@type': 'City',
                  name,
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: name,
                    addressCountry: 'EG',
                  },
                },
              },
            ),
          ),
        }}
      />
      {children}
    </>
  );
}
