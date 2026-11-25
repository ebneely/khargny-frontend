import type { Locale } from '@/i18n/dictionaries';

/**
 * The landing pages of SEO-DIRECTION 4.1 / 4.9, as the website addresses them.
 *
 *   /explorer/<city>/                                          city
 *   /explorer/<city>/area/<area>/                              area
 *   /category/<category>/                                      category
 *   /explorer/<city>/category/<category>/                      city + category
 *   /explorer/<city>/area/<area>/category/<category>/          area + category
 *
 * Areas sit behind an explicit /area/ segment: a place page is /explorer/<city>/<place>, and a
 * place slug is free-form ("zamalek-cafe"), so it could equal an area key. The extra segment makes
 * the two kinds of page impossible to confuse. "category" is likewise static, so it can never be
 * read as a place slug either.
 */
export const LANDING_TYPES = [
  'city',
  'area',
  'category',
  'city-category',
  'area-category',
] as const;
export type LandingType = (typeof LANDING_TYPES)[number];

export interface LandingName {
  name: string;
  nameEn: string | null;
  slug: string;
}

export interface LandingTopCategory {
  slug: string;
  nameAr: string;
  nameEn: string | null;
  count: number;
}

export interface LandingTopArea {
  areaKey: string;
  nameAr: string;
  nameEn: string;
  count: number;
}

export interface LandingFacts {
  type: LandingType;
  city: LandingName | null;
  area: (LandingName & { nameEn: string }) | null;
  category: LandingName | null;
  count: number;
  openNow: number;
  updatedAt: string | null;
  topCategories: LandingTopCategory[];
  topAreas: LandingTopArea[];
}

export interface LandingSummary {
  type: LandingType;
  citySlug?: string;
  areaKey?: string;
  categorySlug?: string;
  count: number;
  openNow: number;
  updatedAt: string | null;
}

export interface LandingQuery {
  citySlug?: string;
  areaKey?: string;
  categorySlug?: string;
  /** 1-based list page; a cursor wins when both are present. */
  page?: number;
  cursor?: string;
}

/** The page's address without a language prefix or trailing slash. */
export function landingPath(type: LandingType, page: LandingQuery): string {
  const city = page.citySlug ? `/explorer/${encodeURIComponent(page.citySlug)}` : '';
  switch (type) {
    case 'city':
      return city;
    case 'area':
      return `${city}/area/${encodeURIComponent(page.areaKey ?? '')}`;
    case 'category':
      return `/category/${encodeURIComponent(page.categorySlug ?? '')}`;
    case 'city-category':
      return `${city}/category/${encodeURIComponent(page.categorySlug ?? '')}`;
    case 'area-category':
      return `${city}/area/${encodeURIComponent(page.areaKey ?? '')}/category/${encodeURIComponent(page.categorySlug ?? '')}`;
  }
}

/** True when a summary has the fields its type needs, so a broken index row never becomes a link. */
export function isValidSummary(row: LandingSummary): boolean {
  switch (row.type) {
    case 'city':
      return Boolean(row.citySlug);
    case 'area':
      return Boolean(row.citySlug && row.areaKey);
    case 'category':
      return Boolean(row.categorySlug);
    case 'city-category':
      return Boolean(row.citySlug && row.categorySlug);
    case 'area-category':
      return Boolean(row.citySlug && row.areaKey && row.categorySlug);
    default:
      return false;
  }
}

export function summaryPath(row: LandingSummary): string {
  return landingPath(row.type, {
    citySlug: row.citySlug,
    areaKey: row.areaKey,
    categorySlug: row.categorySlug,
  });
}

/** The URL key of an area, the same rule the backend stores (`Zamalek` → `zamalek`). */
export function areaKeyOf(region: string): string {
  return region
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const categoryName = (facts: LandingFacts, locale: Locale) =>  facts.category
    ? locale === 'ar'
      ? facts.category.name
      : facts.category.nameEn || facts.category.name
    : '';

const areaName = (facts: LandingFacts, locale: Locale) =>
  facts.area ? (locale === 'ar' ? facts.area.name : facts.area.nameEn) : '';

const cityName = (facts: LandingFacts, locale: Locale) =>
  facts.city ? (locale === 'ar' ? facts.city.name : facts.city.nameEn || facts.city.name) : '';

/** What the page is about, in one phrase: "Zamalek, Cairo" or "Egypt". */
export function landingPlace(facts: LandingFacts, locale: Locale): string {
  const area = areaName(facts, locale);
  const city = cityName(facts, locale);
  // An area page names the area only: "Cafés in Zamalek" is the query, and the city is in the
  // breadcrumb, the intro and the description.
  if (area) return area;
  if (city) return city;
  return locale === 'ar' ? 'مصر' : 'Egypt';
}

/** The page's one H1 and its search title: "Cafés in Zamalek" / "كافيهات في الزمالك". */
export function landingTitle(facts: LandingFacts, locale: Locale): string {
  const ar = locale === 'ar';
  const place = landingPlace(facts, locale);
  const category = categoryName(facts, locale);
  if (category) return ar ? `${category} في ${place}` : `${category} in ${place}`;
  if (facts.type === 'city') return ar ? `أماكن في ${place}` : `Places in ${place}`;
  return ar ? `أماكن في ${place}` : `Places in ${place}`;
}

export function landingDescription(facts: LandingFacts, locale: Locale): string {
  const ar = locale === 'ar';
  const place = landingPlace(facts, locale);
  const category = categoryName(facts, locale);
  const open = facts.openNow;
  if (category)
    return ar
      ? `${facts.count} ${category} في ${place}، ${open} منهم فاتحين دلوقتي. العنوان والمواعيد والصور لكل مكان على خرجني.`
      : `${facts.count} ${category.toLowerCase()} in ${place}, ${open} of them open right now. Addresses, photos and opening hours where known, on 5argny.`;
  return ar
    ? `${facts.count} مكان في ${place}، ${open} منهم فاتحين دلوقتي. كافيهات ومطاعم وأماكن خروج مختارة على خرجني.`
    : `${facts.count} places in ${place}, ${open} of them open right now. Cafés, restaurants and outings on 5argny.`;
}

function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) result = (result * 31 + value.charCodeAt(i)) >>> 0;
  return result;
}

const list = (values: string[]): string =>
  values.length <= 1
    ? values.join('')
    : `${values.slice(0, -1).join(', ')} ${values.at(-1)}`;

/**
 * The 80–150-word intro, written from the page's own numbers. Not a template translated once:
 * the sentences are selected by a hash of the address, so two areas do not read identically, and
 * every number in them is the count the page just fetched.
 */
export function landingIntro(facts: LandingFacts, locale: Locale): string {
  const ar = locale === 'ar';
  const place = landingPlace(facts, locale);
  const city = cityName(facts, locale);
  const category = categoryName(facts, locale);
  const count = facts.count;
  const open = facts.openNow;
  const variant = hash(`${facts.type}/${place}/${category}`) % 2;

  const topCategories = facts.topCategories
    .filter((item) => (facts.category ? item.slug !== facts.category.slug : true))
    .slice(0, 2)
    .map((item) => ({
      name: ar ? item.nameAr : item.nameEn || item.nameAr,
      count: item.count,
    }));
  const topAreas = facts.topAreas.slice(0, 2).map((item) => ({
    name: ar ? item.nameAr : item.nameEn,
    count: item.count,
  }));
  const topAreasInCategory = facts.topAreas.slice(0, 2).map((item) => ({
    name: ar ? item.nameAr : item.nameEn,
    count: item.count,
  }));

  const sentences: string[] = [];

  if (ar) {
    const thing = category ? category : 'مكان';
    sentences.push(
      variant === 0
        ? `خرجني بيجمع ${count} ${thing} في ${place}، منهم ${open} فاتحين دلوقتي، والباقي مواعيده مكتوبة على الصفحة.`
        : `في ${place} عندنا ${count} ${thing} على خرجني، و${open} منهم شغالين في الوقت ده.`,
    );
    if (facts.category && topAreasInCategory.length)
      sentences.push(
        `أكترهم موجودين في ${list(topAreasInCategory.map((item) => `${item.name} (${item.count})`))}، والباقي متوزع على مناطق قريبة.`,
      );
    if (!facts.category && topAreas.length)
      sentences.push(
        `أغلب الأماكن في ${list(topAreas.map((item) => `${item.name} (${item.count})`))}، بس القايمة بتغطي المنطقة كلها.`,
      );
    if (!facts.category && topCategories.length)
      sentences.push(
        `أكبر التصنيفات هنا ${list(topCategories.map((item) => `${item.name} (${item.count})`))}، ومعاهم مطاعم وكافيهات وأماكن تانية.`,
      );
    if (facts.category && topCategories.length)
      sentences.push(
        `جوه نفس المنطقة فيه كمان ${list(topCategories.map((item) => `${item.name} (${item.count})`))}، لو المزاج اتغير، وممكن تختار على حسب الوقت اللي معاك.`,
      );
    sentences.push(
      `كل اسم تحت ليه صفحة فيها العنوان ومواعيد العمل والتليفون والصور، تقدر تفتحها وتشوف المكان قبل ما تروح وتعرف أقرب وقت يناسبك.`,
    );
    sentences.push(
      `الأرقام دي بتتحدّث من بيانات الأماكن نفسها، فأي تعديل في المواعيد أو الاسم بيظهر هنا مع أول تحديث للصفحة.`,
    );
    if (city && (facts.type === 'area-category' || facts.type === 'area'))
      sentences.push(
        `المنطقة دي جوه ${city}، ولو عايز تشوف أوسع، صفحة ${city} فيها كل الأماكن والقايمة كاملة.`,
      );
    else if (facts.type === 'city-category')
      sentences.push(
        `لو عايز تضيّق البحث أكتر، روابط المناطق تحت بتوديك لنفس التصنيف في حي واحد بس.`,
      );
    else if (facts.type === 'category')
      sentences.push(
        `روابط المناطق تحت بتوديك لنفس النوع في منطقة واحدة، بدل ما تلف مصر كلها.`,
      );
    else
      sentences.push(
        `روابط المناطق والتصنيفات تحت بتوديك على طول لنفس نوع القايمة في حتة أضيق.`,
      );
  } else {
    const thing = category ? category.toLowerCase() : 'place';
    sentences.push(
      variant === 0
        ? `5argny lists ${count} ${count === 1 ? thing.replace(/s$/, '') : thing} in ${place}, and ${open} of them are open right now.`
        : `${place} has ${count} ${count === 1 ? thing.replace(/s$/, '') : thing} on 5argny, with ${open} open at this hour.`,
    );
    if (facts.category && topAreasInCategory.length)
      sentences.push(
        `Most of them are in ${list(topAreasInCategory.map((item) => `${item.name} (${item.count})`))}, and the rest sit in neighbouring areas.`,
      );
    if (!facts.category && topAreas.length)
      sentences.push(
        `The busiest corners are ${list(topAreas.map((item) => `${item.name} (${item.count})`))}, though the list covers the whole area.`,
      );
    if (!facts.category && topCategories.length)
      sentences.push(
        `The biggest groups here are ${list(topCategories.map((item) => `${item.name.toLowerCase()} (${item.count})`))}, with restaurants and cafés filling the rest.`,
      );
    if (facts.category && topCategories.length)
      sentences.push(
        `The same area also has ${list(topCategories.map((item) => `${item.name.toLowerCase()} (${item.count})`))}, if you want to change the plan.`,
      );
    sentences.push(
      `Every name below links to its own page with the address, opening hours, phone number and photos, so you can look before you go.`,
    );
    sentences.push(
      `The numbers come from the place records themselves, so a change to a name or a set of hours appears here the next time the page is rebuilt.`,
    );
    if (city && (facts.type === 'area-category' || facts.type === 'area'))
      sentences.push(
        `This area is part of ${city}; the ${city} page widens the same list to the whole governorate.`,
      );
    else if (facts.type === 'city-category')
      sentences.push(
        `The area links below narrow this list to one district of ${place}, when you want fewer options.`,
      );
    else if (facts.type === 'category')
      sentences.push(
        `The area links below take the same list to one area of the country instead of all of it.`,
      );
    else
      sentences.push(
        `The area and category links below go straight to the same kind of list, one step narrower.`,
      );
  }

  return sentences.join(' ');
}

export function introWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface LandingFaq {
  question: string;
  answer: string;
}

/** Three or four questions someone actually types, answered from this page's numbers. */
export function landingFaq(facts: LandingFacts, locale: Locale): LandingFaq[] {
  const ar = locale === 'ar';
  const place = landingPlace(facts, locale);
  const category = categoryName(facts, locale);
  const thing = category ? (ar ? category : category.toLowerCase()) : ar ? 'مكان' : 'place';
  const items: LandingFaq[] = [
    ar
      ? {
          question: `كام ${thing} في ${place}؟`,
          answer: `خرجني بيجمع ${facts.count} ${thing} في ${place} دلوقتي، بالصور والعناوين ومواعيد العمل المتاحة.`,
        }
      : {
          question: `How many ${thing === 'place' ? 'places' : thing} are in ${place}?`,
          answer: `5argny lists ${facts.count} ${thing === 'place' ? 'places' : thing} in ${place} right now, with photos, addresses and the opening hours we have.`,
        },
    ar
      ? {
          question: `كام واحد منهم فاتح دلوقتي؟`,
          answer: `${facts.openNow} من ${facts.count} فاتحين في الوقت الحالي حسب مواعيد العمل المسجلة.`,
        }
      : {
          question: `How many are open right now?`,
          answer: `${facts.openNow} of the ${facts.count} are open at this hour, according to the hours on file.`,
        },
  ];

  const areas = facts.topAreas.slice(0, 2);
  if (areas.length)
    items.push(
      ar
        ? {
            question: `إيه أكتر المناطق اللي فيها ${thing}؟`,
            answer: `أكتر التركيز في ${list(areas.map((item) => `${ar ? item.nameAr : item.nameEn} (${item.count})`))}، والباقي متوزع على مناطق تانية.`,
          }
        : {
            question: `Which areas have the most ${thing === 'place' ? 'places' : thing}?`,
            answer: `The most are in ${list(areas.map((item) => `${item.nameEn} (${item.count})`))}, with the rest spread across nearby areas.`,
          },
    );

  const categories = facts.topCategories
    .filter((item) => (facts.category ? item.slug !== facts.category.slug : true))
    .slice(0, 3);
  if (categories.length)
    items.push(
      ar
        ? {
            question: `إيه أكتر الأنواع الموجودة في ${place}؟`,
            answer: `أكتر الأنواع ${list(categories.map((item) => `${item.nameAr} (${item.count})`))}.`,
          }
        : {
            question: `What kinds of places are most common in ${place}?`,
            answer: `The biggest groups are ${list(categories.map((item) => `${(item.nameEn || item.nameAr).toLowerCase()} (${item.count})`))}.`,
          },
    );

  return items.slice(0, 4);
}
