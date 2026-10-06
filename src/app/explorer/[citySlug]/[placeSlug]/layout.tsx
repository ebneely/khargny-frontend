import type { Metadata } from 'next';
import { regionLabel } from '@/lib/egypt-regions';
import { API_BASE_URL, SITE_URL } from '@/lib/config';
import {
  alternatesFor,
  breadcrumbSchema,
  clampDescription,
  currentLocale,
  graph,
  jsonLdScript,
  ogAlternateLocale,
  ogLocale,
  urlFor,
} from '@/lib/seo';
import type { Locale } from '@/i18n/dictionaries';

// Server wrapper for the (client) place detail page. Its job is this place's search
// presence: a title and description built from its own facts, and LocalBusiness structured
// data carrying the address, coordinates, phone, hours and price band the API already
// returns and the page previously threw away.
type Params = { citySlug: string; placeSlug: string };

type Hour = {
  dayOfWeek: number;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed?: boolean;
};

type Place = {
  cityId?: string;
  categoryId?: string;
  name?: string;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  address?: string | null;
  region?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  phone?: string | null;
  website?: string | null;
  mapsUrl?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  priceRange?: number | null;
  coverImage?: string | null;
  images?: { url?: string; altText?: string | null }[];
  placeHours?: Hour[];
  category?: { nameAr?: string; nameEn?: string | null };
  city?: { name?: string; nameEn?: string | null; slug?: string };
};

/**
 * The place detail endpoint returns `cityId` and `categoryId` but not the city or category
 * objects, so their names have to be looked up. Both lists are small and cached for an hour.
 */
async function fetchCityName(slug: string, isAr: boolean): Promise<string | null> {
  if (!API_BASE_URL) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/cities/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const city = json?.data?.city ?? json?.data ?? json;
    return (isAr ? city?.name : city?.nameEn) || city?.name || null;
  } catch {
    return null;
  }
}

async function fetchCategoryName(id: string | undefined, isAr: boolean): Promise<string | null> {
  if (!API_BASE_URL || !id) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/categories`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const list: { id?: string; nameAr?: string; nameEn?: string | null }[] =
      json?.data?.data ?? json?.data ?? [];
    const hit = Array.isArray(list) ? list.find((c) => c.id === id) : null;
    if (!hit) return null;
    return (isAr ? hit.nameAr : hit.nameEn) || hit.nameAr || hit.nameEn || null;
  } catch {
    return null;
  }
}

async function fetchPlace(slug: string): Promise<Place | null> {
  if (!API_BASE_URL) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/places/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? json) as Place;
  } catch {
    return null;
  }
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Opening hours in the shape schema.org expects, skipping days the place is closed. */
function hoursSchema(hours?: Hour[]) {
  if (!hours?.length) return undefined;
  const open = hours.filter((h) => !h.isClosed && h.openTime && h.closeTime);
  if (!open.length) return undefined;
  return open.map((h) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${DAYS[h.dayOfWeek] ?? 'Monday'}`,
    opens: String(h.openTime).slice(0, 5),
    closes: String(h.closeTime).slice(0, 5),
  }));
}

/** A place's own name in the reader's language, falling back so it is never blank. */
function pickName(place: Place, locale: Locale): string {
  const ar = place.name?.trim();
  const en = place.nameEn?.trim();
  return (locale === 'ar' ? ar || en : en || ar) || 'Khargny';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { citySlug, placeSlug } = await params;
  const locale = await currentLocale();
  const isAr = locale === 'ar';
  const path = `/explorer/${citySlug}/${placeSlug}`;
  const place = await fetchPlace(placeSlug);

  // Even a place we could not load gets a correct canonical and hreflang, so a transient
  // API failure never publishes a page pointing at the wrong URL. It is marked noindex
  // rather than indexed with a placeholder title.
  if (!place) {
    return {
      title: isAr ? 'مكان' : 'Place',
      alternates: alternatesFor(path, locale),
      robots: { index: false, follow: true },
    };
  }

  const name = pickName(place, locale);
  const [resolvedCity, categoryName] = await Promise.all([
    fetchCityName(citySlug, isAr),
    fetchCategoryName(place.categoryId, isAr),
  ]);
  const cityName =
    resolvedCity || (isAr ? place.city?.name : place.city?.nameEn) || citySlug;
  const area = regionLabel(place.region, locale, place.city?.nameEn || place.city?.name || resolvedCity || citySlug);

  // Name, what it is, and where — the three things a search for this place contains.
  const where = [area, cityName].filter(Boolean).join(', ');
  const title = [name, categoryName, where].filter(Boolean).join(' — ');

  const editorial = isAr ? place.description : place.descriptionEn;
  const description =
    clampDescription(editorial || '') ||
    clampDescription(
      isAr
        ? `${name}${categoryName ? ` — ${categoryName}` : ''} في ${where || cityName}. العنوان ومواعيد الشغل والصور والطريق على خرجني.`
        : `${name}${categoryName ? `, ${categoryName}` : ''} in ${where || cityName}. Address, opening hours, photos and directions on Khargny.`,
    );

  const image = place.images?.[0]?.url || place.coverImage || '/images/logo-en.png';

  return {
    title,
    description,
    alternates: alternatesFor(path, locale),
    openGraph: {
      type: 'article',
      title: `${name} · Khargny`,
      description,
      url: urlFor(path, locale),
      images: [{ url: image, alt: name }],
      locale: ogLocale(locale),
      alternateLocale: ogAlternateLocale(locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} · Khargny`,
      description,
      images: [image],
    },
  };
}

export default async function PlaceDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { citySlug, placeSlug } = await params;
  const locale = await currentLocale();
  const isAr = locale === 'ar';
  const place = await fetchPlace(placeSlug);
  if (!place) return <>{children}</>;

  const name = pickName(place, locale);
  const [resolvedCity, categoryName] = await Promise.all([
    fetchCityName(citySlug, isAr),
    fetchCategoryName(place.categoryId, isAr),
  ]);
  const cityName =
    resolvedCity || (isAr ? place.city?.name : place.city?.nameEn) || citySlug;
  const path = `/explorer/${citySlug}/${placeSlug}`;
  const url = urlFor(path, locale);
  const area = regionLabel(place.region, locale, place.city?.nameEn || place.city?.name || resolvedCity || citySlug);

  const lat = Number(place.lat);
  const lng = Number(place.lng);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);
  const social = [place.website, place.instagram, place.facebook, place.mapsUrl].filter(
    Boolean,
  ) as string[];
  const hours = hoursSchema(place.placeHours);

  // LocalBusiness rather than the generic Place: these are venues someone visits, and it is
  // the type that carries address, hours, phone and price band together.
  const business: Record<string, unknown> = {
    '@type': 'LocalBusiness',
    '@id': `${url}#business`,
    name,
    url,
    ...(place.nameEn && place.name && place.nameEn !== place.name
      ? { alternateName: isAr ? place.nameEn : place.name }
      : {}),
    ...(place.description || place.descriptionEn
      ? {
          description: clampDescription(
            (isAr ? place.description : place.descriptionEn) || '',
            300,
          ),
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      ...(place.address ? { streetAddress: place.address } : {}),
      ...(area ? { addressRegion: area } : {}),
      addressLocality: cityName,
      addressCountry: 'EG',
    },
    ...(hasGeo ? { geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } } : {}),
    ...(place.phone ? { telephone: place.phone } : {}),
    ...(social.length ? { sameAs: social } : {}),
    // 1-4 becomes $ to $$$$, which is the notation Google renders.
    ...(place.priceRange
      ? { priceRange: '$'.repeat(Math.min(4, Math.max(1, place.priceRange))) }
      : {}),
    ...(place.images?.length
      ? { image: place.images.slice(0, 6).map((i) => i.url).filter(Boolean) }
      : place.coverImage
        ? { image: [place.coverImage] }
        : {}),
    ...(hours ? { openingHoursSpecification: hours } : {}),
    ...(categoryName ? { additionalType: categoryName } : {}),
  };

  // No aggregateRating on purpose: there is no review system, so every place's rating is 0.
  // Publishing that would be asserting a score nobody gave, which Google treats as spam.

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            graph(
              business,
              breadcrumbSchema(
                [
                  { name: isAr ? 'الرئيسية' : 'Home', path: '/' },
                  { name: isAr ? 'استكشف' : 'Explore', path: '/explorer' },
                  { name: cityName, path: `/explorer/${citySlug}` },
                  { name, path },
                ],
                locale,
              ),
              {
                '@type': 'WebPage',
                '@id': `${url}#page`,
                url,
                name,
                isPartOf: { '@id': `${SITE_URL}/#website` },
                ...(place.images?.[0]?.url || place.coverImage
                  ? { primaryImageOfPage: place.images?.[0]?.url ?? place.coverImage }
                  : {}),
              },
            ),
          ),
        }}
      />
      {children}
    </>
  );
}
