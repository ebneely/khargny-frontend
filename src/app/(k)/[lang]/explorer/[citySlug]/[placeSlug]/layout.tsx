import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { placePath, placeRedirect } from '@/lib/place-address';
import { regionLabel } from '@/lib/egypt-regions';
import { priceBandLabel, formatMenuPrice, type PriceLevel } from '@/lib/price-bands';
import type { PlaceFlags } from '@/lib/api/normalize-place';
import { SITE_URL } from '@/lib/config';
import {
  breadcrumbSchema,
  clampDescription,
  localeOf,
  graph,
  jsonLdScript,
  pageMetadata,
  shareImageFor,
  urlFor,
} from '@/lib/seo';
import {
  buildPlaceFacts,
  placeDescription,
  placeTitle,
  schemaTypeFor,
  shareAlt,
  type MenuHighlight,
  type PlaceSeoFacts,
} from '@/lib/place-seo';
import type { Locale } from '@/i18n/dictionaries';
import { photoCandidates, photoSrcSet, PHOTO_SIZES, type Photo } from '@/lib/place-photo';

// Server wrapper for the (client) place detail page. Its job is this place's search presence: a
// title and description written from its own facts (SEO Stage 3), the specific schema.org type it
// really is, and server-rendered text (About, Nearby, questions) a crawler reads without running
// any JavaScript.
import {
  getPlace, getCities, getCategories, getLandingIndex, getPlaceList, getPlaceListInArea, getMenu,
} from '@/lib/server/public-data';
import { areaKeyOf } from '@/lib/landing';
import { langPrefix } from '@5argny/core/rules/locale';
import Link from 'next/link';
import { ApiError } from '@/lib/api/client';
import { PlaceSeoSections, type NearbyGroup, type NearbyPlace } from './place-sections';

type Params = { citySlug: string; placeSlug: string };

type Hour = {
  dayOfWeek: number;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed?: boolean;
};

type Place = Partial<PlaceFlags> & {
  id?: string;
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
  amenities?: { name?: string | null; nameEn?: string | null }[];
  tags?: { name?: string | null; nameEn?: string | null }[];
  viewCount?: number;
  likeCount?: number;
  category?: { nameAr?: string; nameEn?: string | null };
  city?: { name?: string; nameEn?: string | null; slug?: string };
};

/**
 * The place detail endpoint returns `cityId` and `categoryId` but not the city or category
 * objects, so their names have to be looked up. Both lists are small and cached for five minutes.
 */
async function fetchCityName(slug: string, isAr: boolean): Promise<string | null> {
  const city = (await getCities()).find((item) => item.slug === slug);
  return (isAr ? city?.name : city?.nameEn) || city?.name || null;
}

async function fetchCategory(id: string | undefined, isAr: boolean): Promise<{ name: string; slug: string } | null> {
  if (!id) return null;
  const category = (await getCategories()).find((item) => item.id === id);
  const name = (isAr ? category?.nameAr : category?.nameEn) || category?.nameAr || category?.nameEn || null;
  return name && category ? { name, slug: category.slug } : null;
}

async function fetchPlace(slug: string): Promise<Place> {
  try { return await getPlace(slug) as unknown as Place; } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

async function fetchPlaceCity(place: Place, requestedCity: string): Promise<string> {
  if (place.city?.slug) return place.city.slug;
  return (await getCities()).find((city) => city.id === place.cityId)?.slug || requestedCity;
}

async function resolvePlace(params: Params, locale: Locale) {
  const place = await fetchPlace(params.placeSlug);
  if (!place) return { place: null, citySlug: params.citySlug };
  const citySlug = await fetchPlaceCity(place, params.citySlug);
  // The page is cached per address, so it reads no request header; a moved address still answers one 308 (no query).
  const target = placeRedirect({ ...params, locale, search: '' }, { slug: place.slug, citySlug, redirectedFrom: place.redirectedFrom });
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

/** The place's photos as absolute URLs, in the order the backend returns them. */
function photoUrls(place: Place): string[] {
  const fromImages = (place.images ?? [])
    .map((image) => photoCandidates(image).at(-1)?.url)
    .filter((url): url is string => Boolean(url));
  if (fromImages.length) return fromImages;
  return place.coverImage ? [place.coverImage] : [];
}

/** Everything the page's own words are built from, and the name in the reader's language. */
async function placeFactsFor(
  place: Place,
  {
    locale, citySlug, cityName, categorySlug, categoryName, priceRangeLabel,
  }: {
    locale: Locale;
    citySlug: string;
    cityName: string;
    categorySlug: string | null;
    categoryName: string | null;
    priceRangeLabel: string | null;
  },
): Promise<PlaceSeoFacts> {
  const path = placePath(citySlug, place.slug || '');
  const area = regionLabel(place.region, locale, place.city?.nameEn || place.city?.name || cityName) || '';
  return buildPlaceFacts({
    place: {
      name: place.name,
      nameEn: place.nameEn,
      address: place.address,
      phone: place.phone,
      website: place.website,
      instagram: place.instagram,
      facebook: place.facebook,
      mapsUrl: place.mapsUrl,
      priceRange: place.priceRange,
      hours: place.placeHours,
      amenities: place.amenities,
      tags: place.tags,
      hasMenu: place.hasMenu,
      images: place.images,
      viewCount: place.viewCount,
      likeCount: place.likeCount,
    },
    locale,
    city: cityName,
    area,
    categorySlug,
    categoryName,
    priceRangeLabel,
    url: urlFor(path, locale),
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params & { lang: string }>;
}): Promise<Metadata> {
  const { lang, ...requested } = await params;
  const locale = localeOf(lang);
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

  const [resolvedCity, category] = await Promise.all([
    fetchCityName(citySlug, isAr),
    fetchCategory(place.categoryId, isAr),
  ]);
  const cityName = resolvedCity || (isAr ? place.city?.name : place.city?.nameEn) || citySlug;
  const facts = await placeFactsFor(place, {
    locale, citySlug, cityName,
    categorySlug: category?.slug ?? null,
    categoryName: category?.name ?? null,
    priceRangeLabel: priceBandLabel(place.priceRange, locale),
  });

  // A title by search intent: the name first, then where it is, then only the words this place's
  // own data can stand behind (menu / prices / hours / photos / location / contact).
  const title = placeTitle(facts, locale);

  // The editorial sentence wins when a person really wrote one and it fits the snippet; otherwise
  // the description is assembled from facts. Either way no two places share it.
  const editorial = clampDescription((isAr ? place.description : place.descriptionEn) || '', 160);
  const description = editorial.length >= 70 ? editorial : placeDescription(facts, locale);

  return pageMetadata({ path, locale, title, description, type: 'article', titleFitted: true, image: { ...shareImageFor(place), alt: shareAlt(facts, locale) } });
}

export default async function PlaceDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params & { lang: string }>;
}) {
  const { lang, ...requested } = await params;
  const locale = localeOf(lang);
  const isAr = locale === 'ar';
  const { place, citySlug } = await resolvePlace(requested, locale);
  if (!place) return <>{children}</>;
  const coverSrcSet = photoSrcSet(place.images?.[0] ?? {});
  const coverUrl = photoCandidates(place.images?.[0] ?? {}).at(-1)?.url || place.coverImage;

  const [resolvedCity, category, cities, categories] = await Promise.all([
    fetchCityName(citySlug, isAr),
    fetchCategory(place.categoryId, isAr),
    getCities(),
    getCategories(),
  ]);
  const cityName = resolvedCity || (isAr ? place.city?.name : place.city?.nameEn) || citySlug;
  const categoryName = category?.name ?? null;
  const path = placePath(citySlug, place.slug || requested.placeSlug);
  const url = urlFor(path, locale);
  const area = regionLabel(place.region, locale, place.city?.nameEn || place.city?.name || resolvedCity || citySlug) || '';

  const facts = await placeFactsFor(place, {
    locale, citySlug, cityName,
    categorySlug: category?.slug ?? null,
    categoryName,
    priceRangeLabel: priceBandLabel(place.priceRange, locale),
  });

  // The stored menu, when there is one: it becomes real text on the page (and the schema's `menu`
  // target) instead of a URL pointing at nothing.
  const menu = place.hasMenu && place.slug ? await getMenu(place.slug).catch(() => null) : null;
  const menuItems = (menu?.sections ?? []).flatMap((section) =>
    section.items.filter((item) => item.available).map((item) => ({
      name: (isAr ? item.nameAr : item.nameEn || item.nameAr) || item.nameAr,
      price: formatMenuPrice(item.price, locale),
    })));
  facts.menuHighlights = menuItems.slice(0, 6) as MenuHighlight[];

  const nearby = await nearbyGroups(place, { locale, citySlug, cityName, area, category, categories, cities });

  const lat = Number(place.lat);
  const lng = Number(place.lng);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);
  const social = [place.website, place.instagram, place.facebook].filter(Boolean) as string[];
  const hours = hoursSchema(place.placeHours);
  const images = photoUrls(place);

  // The specific type this place really is (Restaurant, MovieTheater, ShoppingCenter, Hotel …),
  // from one mapping table; LocalBusiness only when the category is one the table does not know.
  const business: Record<string, unknown> = {
    '@type': schemaTypeFor(category?.slug),
    '@id': `${url}#business`,
    name: facts.name,
    url,
    ...(facts.nameOther ? { alternateName: facts.nameOther } : {}),
    ...(place.description || place.descriptionEn
      ? { description: clampDescription((isAr ? place.description : place.descriptionEn) || '', 300) }
      : {}),
    address: {
      '@type': 'PostalAddress',
      ...(place.address ? { streetAddress: place.address } : {}),
      ...(area ? { addressRegion: area } : {}),
      addressLocality: cityName,
      addressCountry: 'EG',
    },
    ...(hasGeo ? { geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } } : {}),
    ...(place.mapsUrl ? { hasMap: place.mapsUrl } : {}),
    ...(place.phone ? { telephone: place.phone } : {}),
    ...(social.length ? { sameAs: social } : {}),
    ...(facts.priceRange ? { priceRange: facts.priceRange } : {}),
    ...(images.length ? { image: images } : {}),
    ...(hours ? { openingHoursSpecification: hours } : {}),
    ...(facts.hasMenu && menuItems.length ? { hasMenu: true, menu: `${url}#menu` } : {}),
  };

  // No aggregateRating or review on purpose: there is no review system, and a self-serving rating
  // is both an asserted score nobody gave and against Google's rules.

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
                  { name: facts.name, path },
                ],
                locale,
              ),
              {
                '@type': 'WebPage',
                '@id': `${url}#page`,
                url,
                name: facts.name,
                inLanguage: isAr ? 'ar' : 'en',
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
      <PlaceSeoSections
        facts={facts}
        locale={locale}
        nearby={nearby}
        menu={menuItems.length ? { heading: isAr ? 'من المنيو' : 'From the menu', items: menuItems.slice(0, 8) } : null}
      />
      <PlaceLandingLinks place={place} citySlug={citySlug} cityName={cityName} area={area} category={category} locale={locale} />
    </>
  );
}

/**
 * The places next to this one, as real links (SEO-DIRECTION 4.1): up to six in the same area
 * (any category) and up to six of the same category in the city. Two list requests of 7 rows,
 * both from the endpoint the site already uses; a place never links to itself twice.
 */
async function nearbyGroups(
  place: Place,
  {
    locale, citySlug, cityName, area, category, categories, cities,
  }: {
    locale: Locale;
    citySlug: string;
    cityName: string;
    area: string;
    category: { name: string; slug: string } | null;
    categories: { id: string; nameAr: string; nameEn: string | null; slug: string }[];
    cities: { id: string; slug: string }[];
  },
): Promise<NearbyGroup[]> {
  if (!place.cityId) return [];
  const isAr = locale === 'ar';
  const region = (place.region ?? '').trim();
  const [inArea, inCategory] = await Promise.all([
    region ? getPlaceListInArea(place.cityId, region, 7).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
    category ? getPlaceList(place.cityId, 1, place.categoryId ?? '', 7).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
  ]);

  const seen = new Set<string>([place.id ?? '', place.slug ?? '']);
  const toNearby = (item: Record<string, unknown>): NearbyPlace | null => {
    const slug = typeof item.slug === 'string' ? item.slug : '';
    const id = typeof item.id === 'string' ? item.id : '';
    if (!slug || seen.has(slug) || seen.has(id)) return null;
    seen.add(slug);
    if (id) seen.add(id);
    const name = (isAr ? (item.name as string) || (item.nameEn as string) : (item.nameEn as string) || (item.name as string)) || slug;
    const itemCategory = categories.find((entry) => entry.id === String(item.categoryId ?? ''));
    const catName = itemCategory ? ((isAr ? itemCategory.nameAr : itemCategory.nameEn) || itemCategory.nameAr) : null;
    const itemCitySlug = cities.find((city) => city.id === String(item.cityId ?? ''))?.slug || citySlug;
    const itemArea = regionLabel(typeof item.region === 'string' ? item.region : null, locale, cityName) || null;
    return { slug, name, categoryName: catName, areaName: itemArea, citySlug: itemCitySlug, href: `${langPrefix(locale)}${placePath(itemCitySlug, slug)}/` };
  };

  const areaPlaces = (inArea.items as Record<string, unknown>[]).map(toNearby).filter((p): p is NearbyPlace => Boolean(p)).slice(0, 6);
  const categoryPlaces = (inCategory.items as Record<string, unknown>[]).map(toNearby).filter((p): p is NearbyPlace => Boolean(p)).slice(0, 6);

  const groups: NearbyGroup[] = [];
  if (areaPlaces.length) {
    groups.push({ title: area ? (isAr ? `في ${area}` : `In ${area}`) : (isAr ? `في ${cityName}` : `In ${cityName}`), places: areaPlaces });
  }
  if (categoryPlaces.length && category) {
    groups.push({ title: isAr ? `${category.name} أخرى في ${cityName}` : `More ${category.name.toLowerCase()} in ${cityName}`, places: categoryPlaces });
  }
  return groups;
}

/**
 * The other pages this place belongs to (SEO-DIRECTION 4.1): its city, its area and its
 * city+category landing pages, shown only when that page exists (>= 5 places). Real anchors, so
 * a crawler that found this place can walk up to the pages that list it with its neighbours.
 */
async function PlaceLandingLinks({
  place,
  citySlug,
  cityName,
  area,
  category,
  locale,
}: {
  place: Place;
  citySlug: string;
  cityName: string;
  area: string;
  category: { name: string; slug: string } | null;
  locale: Locale;
}) {
  const isAr = locale === 'ar';
  const index = await getLandingIndex().catch(() => ({ data: [] }));
  const has = (type: string, extra: Record<string, string | undefined>) =>
    index.data.some((row) => {
      if (row.type !== type) return false;
      return Object.entries(extra).every(([key, value]) => !value || (row as unknown as Record<string, string | undefined>)[key] === value);
    });
  const prefix = langPrefix(locale);
  const areaKeyValue = place.region ? areaKeyOf(place.region) : '';
  const links: { href: string; label: string }[] = [];
  if (has('city', { citySlug })) links.push({ href: `${prefix}/explorer/${citySlug}/`, label: isAr ? `كل ${cityName}` : `All of ${cityName}` });
  if (areaKeyValue && has('area', { citySlug, areaKey: areaKeyValue })) links.push({ href: `${prefix}/explorer/${citySlug}/area/${areaKeyValue}/`, label: isAr ? area : area });
  if (category && has('city-category', { citySlug, categorySlug: category.slug }))
    links.push({ href: `${prefix}/explorer/${citySlug}/category/${category.slug}/`, label: isAr ? `${category.name} في ${cityName}` : `${category.name} in ${cityName}` });
  if (!links.length) return null;
  return (
    <section aria-label={isAr ? 'صفحات مرتبطة' : 'Related pages'} className="khg-place-seo" style={{ padding: '0 clamp(16px, 4vw, 32px) 40px' }}>
      <h2 style={{ margin: '0 0 10px', font: '600 13px/1.3 var(--text)', color: 'var(--ink3)', letterSpacing: '.01em' }}>
        {isAr ? 'المزيد في نفس المكان' : 'More around here'}
      </h2>
      <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 40, padding: '0 14px', borderRadius: 999, border: '1px solid var(--line)', font: '600 13.5px/1.2 var(--text)', color: 'var(--ink)', textDecoration: 'none' }}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
