import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { placePath, placeRedirect } from '@/lib/place-address';
import { regionLabel } from '@/lib/egypt-regions';
import { priceBandLabel, type PriceLevel } from '@/lib/price-bands';
import { normalizePlaceFlags, type PlaceFlags } from '@/lib/api/normalize-place';
import { API_BASE_URL, SITE_URL } from '@/lib/config';
import {
  breadcrumbSchema,
  clampDescription,
  currentLocale,
  fitPlaceTitle,
  graph,
  jsonLdScript,
  pageMetadata,
  shareImageFor,
  urlFor,
} from '@/lib/seo';
import type { Locale } from '@/i18n/dictionaries';
import { photoCandidates, photoSrcSet, PHOTO_SIZES, type Photo } from '@/lib/place-photo';

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

type Place = Partial<PlaceFlags> & {
  slug?: string;
  redirectedFrom?: string;
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
  priceRange?: PriceLevel | null;
  coverImage?: string | null;
  coverImageDimensions?: { width?: number | null; height?: number | null } | null;
  images?: Photo[];
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
  let missing = false;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/places/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    missing = res.status === 404;
    if (res.ok) {
      const json = await res.json();
      const payload = json?.data ?? json;
      return payload && typeof payload === 'object' ? normalizePlaceFlags(payload as Place) : null;
    }
  } catch {
    return null;
  }
  if (missing) notFound();
  return null;
}

async function fetchPlaceCity(place: Place, requestedCity: string): Promise<string> {
  if (place.city?.slug) return place.city.slug;
  if (!place.cityId || !API_BASE_URL) return requestedCity;
  try {
    const response = await fetch(`${API_BASE_URL}/v1/cities`, { cache: 'no-store' });
    if (!response.ok) return requestedCity;
    const json = await response.json();
    const cities: { id: string; slug: string }[] = json?.data?.data ?? json?.data ?? [];
    return (Array.isArray(cities) ? cities.find((city) => city.id === place.cityId)?.slug : null) || requestedCity;
  } catch {
    return requestedCity;
  }
}

async function resolvePlace(params: Params, locale: Locale) {
  const place = await fetchPlace(params.placeSlug);
  if (!place) return { place: null, citySlug: params.citySlug };
  const citySlug = await fetchPlaceCity(place, params.citySlug);
  const search = (await headers()).get('x-khargny-search') ?? '';
  const target = placeRedirect({ ...params, locale, search }, { slug: place.slug, citySlug, redirectedFrom: place.redirectedFrom });
  if (target) permanentRedirect(target);
  return { place, citySlug };
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
  const requested = await params;
  const locale = await currentLocale();
  const isAr = locale === 'ar';
  const { place, citySlug } = await resolvePlace(requested, locale);
  const path = placePath(citySlug, place?.slug || requested.placeSlug);

  // Even a place we could not load gets a correct canonical and hreflang, so a transient
  // API failure never publishes a page pointing at the wrong URL. It is marked noindex
  // rather than indexed with a placeholder title.
  if (!place) {
    return pageMetadata({
      path, locale,
      title: isAr ? 'مكان' : 'Place',
      description: isAr ? 'تفاصيل المكان على خرجني.' : 'Place details on Khargny.',
      noindex: true,
    });
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
  const title = fitPlaceTitle({ name, category: categoryName, area, city: cityName }, locale);

  const editorial = isAr ? place.description : place.descriptionEn;
  const description =
    clampDescription(editorial || '') ||
    clampDescription(
      isAr
        ? `${name}${categoryName ? ` — ${categoryName}` : ''} في ${where || cityName}. العنوان ومواعيد الشغل والصور والطريق على خرجني.`
        : `${name}${categoryName ? `, ${categoryName}` : ''} in ${where || cityName}. Address, opening hours, photos and directions on Khargny.`,
    );

  return pageMetadata({ path, locale, title, description, type: 'article', image: { ...shareImageFor(place), alt: name } });
}

export default async function PlaceDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const requested = await params;
  const locale = await currentLocale();
  const isAr = locale === 'ar';
  const { place, citySlug } = await resolvePlace(requested, locale);
  if (!place) return <>{children}</>;
  const coverSrcSet = photoSrcSet(place.images?.[0] ?? {});
  const coverUrl = photoCandidates(place.images?.[0] ?? {}).at(-1)?.url || place.coverImage;

  const name = pickName(place, locale);
  const [resolvedCity, categoryName] = await Promise.all([
    fetchCityName(citySlug, isAr),
    fetchCategoryName(place.categoryId, isAr),
  ]);
  const cityName =
    resolvedCity || (isAr ? place.city?.name : place.city?.nameEn) || citySlug;
  const path = placePath(citySlug, place.slug || requested.placeSlug);
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
    ...(priceBandLabel(place.priceRange, locale)
      ? { priceRange: priceBandLabel(place.priceRange, locale) }
      : {}),
    ...(place.images?.length
      ? { image: place.images.slice(0, 6).map((image) => photoCandidates(image).at(-1)?.url).filter(Boolean) }
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
      {coverSrcSet && <link rel="preload" as="image" imageSrcSet={coverSrcSet} imageSizes={PHOTO_SIZES.hero} fetchPriority="high" />}
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
                ...(coverUrl
                  ? { primaryImageOfPage: coverUrl }
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
