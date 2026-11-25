/**
 * A place page's own words, built from the place's own data.
 *
 * Measured 2026-11-25 (Search Console, 400 places): a search for a place's own name put only 8
 * places in the top 3, and 142 sat under the place's own site and Tripadvisor. The cause was not
 * ranking alone — every one of the 400 pages carried the same title shape ("Name — Category —
 * City"), the same description sentence, and a page with almost no sentences of its own. Google
 * had nothing to match a query like "el-kababgy luxor menu" against.
 *
 * So every sentence here is derived from a stored field, and nothing is claimed that the data does
 * not contain: no "menu" without menu rows, no "prices" without a price band, no "open daily"
 * without hours. Arabic is written as Arabic, not transliterated from the English template.
 *
 * This module is pure: no React, no request context, so every rule is unit-tested.
 */
import type { Locale } from '@/i18n/dictionaries';
import { clampDescription, fitTitle, joinWords, titleBase, titleSuffix } from './seo-text';

export type HourFact = {
  dayOfWeek: number;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed?: boolean | null;
};

export type MenuHighlight = { name: string; price: string };

/** Everything the page's own words may use. Built once per render from the place record. */
export type PlaceSeoFacts = {
  /** The name in the page's language. */
  name: string;
  /** The name in the other language, only when it really differs (shown once, and in alternateName). */
  nameOther: string | null;
  categorySlug: string | null;
  /** The catalog's own label for the category, in the page's language ("Restaurants" / "مطاعم"). */
  categoryName: string | null;
  /** The area inside the city, localized — '' when the stored area has no form in this language. */
  area: string;
  city: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  mapsUrl: string | null;
  /** The price band label, already localized, or null when the place has no stored band. */
  priceRange: string | null;
  hours: HourFact[];
  /** Amenity names in the page's language, in the backend's own order. */
  amenities: string[];
  /** The same amenities in English (nameEn || name), aligned index by index: the page language may hide a fact the record still holds. */
  amenityKeys: string[];
  tags: string[];
  hasMenu: boolean;
  menuHighlights: MenuHighlight[];
  imageCount: number;
  viewCount: number;
  likeCount: number;
  /** Absolute canonical URL of the page. */
  url: string;
};

type Kind = 'eat' | 'coffee' | 'nightlife' | 'cinema' | 'retail' | 'stay' | 'culture' | 'outdoor' | 'sport' | 'wellness';
type Intent = 'menu' | 'prices' | 'hours' | 'location' | 'photos' | 'contact';

type Profile = {
  /** schema.org type this category really is (one table, fallback LocalBusiness). */
  schema: string;
  kind: Kind;
  noun: { en: string; ar: string };
  /** Intent words for the title, in priority order; each one is only used when its data exists. */
  intents: Intent[];
};

/**
 * The one mapping table. A category the table does not know keeps the generic LocalBusiness and
 * calls itself a place — never a type we cannot stand behind.
 */
export const CATEGORY_PROFILES: Record<string, Profile> = {
  restaurants: { schema: 'Restaurant', kind: 'eat', noun: { en: 'restaurant', ar: 'مطعم' }, intents: ['menu', 'prices', 'hours', 'photos'] },
  mtam: { schema: 'Restaurant', kind: 'eat', noun: { en: 'restaurant', ar: 'مطعم' }, intents: ['menu', 'prices', 'hours', 'photos'] },
  bakeries: { schema: 'Bakery', kind: 'eat', noun: { en: 'bakery', ar: 'مخبز وحلواني' }, intents: ['menu', 'prices', 'hours', 'photos'] },
  cafes: { schema: 'CafeOrCoffeeShop', kind: 'coffee', noun: { en: 'café', ar: 'مقهى' }, intents: ['menu', 'prices', 'hours', 'photos'] },
  bars: { schema: 'BarOrPub', kind: 'nightlife', noun: { en: 'bar', ar: 'بار' }, intents: ['hours', 'prices', 'photos', 'location'] },
  clubs: { schema: 'NightClub', kind: 'nightlife', noun: { en: 'club', ar: 'نادي ليلي' }, intents: ['hours', 'prices', 'photos', 'location'] },
  cinemas: { schema: 'MovieTheater', kind: 'cinema', noun: { en: 'cinema', ar: 'سينما' }, intents: ['hours', 'location', 'photos'] },
  malls: { schema: 'ShoppingCenter', kind: 'retail', noun: { en: 'shopping mall', ar: 'مول تجاري' }, intents: ['hours', 'location', 'photos'] },
  shops: { schema: 'ShoppingCenter', kind: 'retail', noun: { en: 'shop', ar: 'متجر' }, intents: ['hours', 'location', 'photos'] },
  hotels: { schema: 'Hotel', kind: 'stay', noun: { en: 'hotel', ar: 'فندق' }, intents: ['location', 'photos', 'contact'] },
  museums: { schema: 'Museum', kind: 'culture', noun: { en: 'museum', ar: 'متحف' }, intents: ['hours', 'location', 'photos'] },
  attractions: { schema: 'TouristAttraction', kind: 'culture', noun: { en: 'attraction', ar: 'مكان سياحي' }, intents: ['hours', 'location', 'photos'] },
  landmarks: { schema: 'TouristAttraction', kind: 'culture', noun: { en: 'landmark', ar: 'معلم تاريخي' }, intents: ['hours', 'location', 'photos'] },
  libraries: { schema: 'Library', kind: 'culture', noun: { en: 'library', ar: 'مكتبة' }, intents: ['hours', 'location', 'photos'] },
  parks: { schema: 'Park', kind: 'outdoor', noun: { en: 'park', ar: 'حديقة' }, intents: ['hours', 'location', 'photos'] },
  beaches: { schema: 'Beach', kind: 'outdoor', noun: { en: 'beach', ar: 'شاطئ' }, intents: ['hours', 'location', 'photos'] },
  entertainment: { schema: 'AmusementPark', kind: 'outdoor', noun: { en: 'entertainment venue', ar: 'مكان ترفيهي' }, intents: ['hours', 'location', 'photos'] },
  sports: { schema: 'SportsActivityLocation', kind: 'sport', noun: { en: 'sports venue', ar: 'ملعب أو مركز رياضي' }, intents: ['hours', 'location', 'photos'] },
  spas: { schema: 'DaySpa', kind: 'wellness', noun: { en: 'spa', ar: 'سبا' }, intents: ['hours', 'prices', 'photos'] },
};

const FALLBACK: Profile = {
  schema: 'LocalBusiness',
  kind: 'culture',
  noun: { en: 'place', ar: 'مكان' },
  intents: ['hours', 'location', 'photos'],
};

export function profileFor(categorySlug: string | null | undefined): Profile {
  return (categorySlug && CATEGORY_PROFILES[categorySlug]) || FALLBACK;
}

/** The schema.org type a category really is. */
export function schemaTypeFor(categorySlug: string | null | undefined): string {
  return profileFor(categorySlug).schema;
}

const INTENT_WORDS: Record<Intent, { en: string; ar: string }> = {
  menu: { en: 'menu', ar: 'المنيو' },
  prices: { en: 'prices', ar: 'الأسعار' },
  hours: { en: 'hours', ar: 'مواعيد العمل' },
  location: { en: 'location', ar: 'الموقع' },
  photos: { en: 'photos', ar: 'الصور' },
  contact: { en: 'contact', ar: 'التواصل' },
};

// ── hours ────────────────────────────────────────────────────────────────────

const DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_EN_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

type OpenDay = { day: number; opens: string; closes: string };

/** A day's clock times, or null when that day is closed or has no stored times. */
function openDay(hour: HourFact): OpenDay | null {
  if (hour.isClosed) return null;
  const opens = String(hour.openTime ?? '').slice(0, 5);
  const closes = String(hour.closeTime ?? '').slice(0, 5);
  if (!/^\d\d:\d\d$/.test(opens) || !/^\d\d:\d\d$/.test(closes)) return null;
  return { day: Number(hour.dayOfWeek), opens, closes };
}

/** "11 am", "12 am", "2:30 pm" — the way a person says a time. */
function timeEn(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
}

/** "11 صباحًا", "12 منتصف الليل", "6 مساءً", "12 ظهرًا" — Egyptian Arabic, Western digits. */
function timeAr(hhmm: string, which: 'open' | 'close'): string {
  const [h, m] = hhmm.split(':').map(Number);
  const clock = m ? `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')}` : String(h % 12 === 0 ? 12 : h % 12);
  if (h === 0) return `${clock} منتصف الليل`;
  if (h === 12) return `${clock} ${which === 'open' ? 'ظهرًا' : 'مساءً'}`;
  return `${clock} ${h < 12 ? 'صباحًا' : 'مساءً'}`;
}

/** Consecutive runs of days, e.g. [0,1,2,4] → [[0,1,2],[4]] (week order, Sunday first). */
function dayRuns(days: number[]): number[][] {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const day of sorted) {
    const last = runs[runs.length - 1];
    if (last && day === last[last.length - 1] + 1) last.push(day);
    else runs.push([day]);
  }
  return runs;
}

function dayLabelEn(run: number[]): string {
  if (run.length === 1) return DAY_EN[run[0]];
  if (run.length === 7) return 'every day';
  return `${DAY_EN_SHORT[run[0]]}–${DAY_EN_SHORT[run[run.length - 1]]}`;
}

function dayLabelAr(run: number[]): string {
  if (run.length === 1) return DAY_AR[run[0]];
  if (run.length === 7) return 'كل يوم';
  return `${DAY_AR[run[0]]}–${DAY_AR[run[run.length - 1]]}`;
}

export type HoursSummary = {
  /** "open daily 11 am–12 am" — lowercase, for a sentence or a description. */
  short: string;
  /** "It opens daily from 11 am to 12 am." */
  sentence: string;
  /** "daily 11 am–12 am" — for the Q&A answer. */
  answer: string;
  /** How many days are open (0 = no usable hours). */
  openDays: number;
  /** Days the place is marked closed. */
  closedDays: number;
};

/**
 * Opening hours in words. A week that is the same every day becomes "daily"; a week that differs
 * becomes named day ranges; days marked closed are stated. No hours stored → null.
 */
export function hoursSummary(hours: HourFact[] | undefined, locale: Locale): HoursSummary | null {
  if (!hours?.length) return null;
  const open = hours.map(openDay).filter((day): day is OpenDay => Boolean(day));
  if (!open.length) return null;
  const closed = hours.filter((hour) => hour.isClosed).map((hour) => Number(hour.dayOfWeek));
  const ar = locale === 'ar';

  const byTimes = new Map<string, number[]>();
  for (const day of open) {
    const key = `${day.opens}|${day.closes}`;
    byTimes.set(key, [...(byTimes.get(key) ?? []), day.day]);
  }

  if (byTimes.size === 1 && !closed.length) {
    const [times, days] = [...byTimes.entries()][0];
    const [opens, closes] = times.split('|');
    if (days.length === 7) {
      const rangeEn = `${timeEn(opens)}–${timeEn(closes)}`;
      const rangeAr = `${timeAr(opens, 'open')}–${timeAr(closes, 'close')}`;
      return {
        short: ar ? `يفتح يوميًا ${rangeAr}` : `open daily ${rangeEn}`,
        sentence: ar ? `يفتح يوميًا من ${timeAr(opens, 'open')} حتى ${timeAr(closes, 'close')}.` : `It opens daily from ${timeEn(opens)} to ${timeEn(closes)}.`,
        answer: ar ? `مفتوح يوميًا ${rangeAr}` : `Open daily ${rangeEn}`,
        openDays: 7,
        closedDays: 0,
      };
    }
  }

  const groups = [...byTimes.entries()].map(([times, days]) => {
    const [opens, closes] = times.split('|');
    const runs = dayRuns(days);
    const label = ar ? runs.map(dayLabelAr).join(' و') : runs.map(dayLabelEn).join(' and ');
    const range = ar ? `${timeAr(opens, 'open')}–${timeAr(closes, 'close')}` : `${timeEn(opens)}–${timeEn(closes)}`;
    return { label, range, days: days.length };
  }).sort((a, b) => b.days - a.days);

  const closedLabel = closed.length
    ? ar
      ? dayRuns(closed).map(dayLabelAr).join(' و')
      : dayRuns(closed).map(dayLabelEn).join(' and ')
    : '';

  const partsEn = groups.map((group) => `${group.label} ${group.range}`);
  const partsAr = groups.map((group) => `${group.label} ${group.range}`);
  const closedEn = closed.length ? `closed ${closedLabel}` : '';
  const closedAr = closed.length ? `مقفول ${closedLabel}` : '';

  return {
    short: ar
      ? `يفتح ${partsAr.join('، ')}${closedAr ? `، و${closedAr}` : ''}`
      : `open ${partsEn.join(', ')}${closedEn ? `; ${closedEn}` : ''}`,
    sentence: ar
      ? `يفتح ${partsAr.join('، ')}${closedAr ? `، و${closedAr}` : ''}.`
      : `It opens ${partsEn.join(', ')}${closedEn ? `; it is ${closedEn}` : ''}.`,
    answer: ar
      ? `${partsAr.join('، ')}${closedAr ? `، و${closedAr}` : ''}`
      : `${partsEn.join(', ')}${closedEn ? `; ${closedEn}` : ''}`,
    openDays: open.length,
    closedDays: closed.length,
  };
}

// ── the words themselves ─────────────────────────────────────────────────────

function where(facts: PlaceSeoFacts, locale: Locale): string {
  const parts = [facts.area, facts.city].filter(Boolean);
  const unique = parts.filter((part, index) => parts.indexOf(part) === index);
  return unique.join(locale === 'ar' ? '، ' : ', ');
}

function hasHours(facts: PlaceSeoFacts): boolean {
  return Boolean(hoursSummary(facts.hours, 'en'));
}

/** Which intent word the place can honestly carry, in the profile's own order. */
export function intentWords(facts: PlaceSeoFacts, locale: Locale): string[] {
  const ar = locale === 'ar';
  const available: Record<Intent, boolean> = {
    menu: facts.hasMenu,
    prices: Boolean(facts.priceRange),
    hours: hasHours(facts),
    location: Boolean(facts.area || facts.city),
    photos: facts.imageCount > 0,
    contact: Boolean(facts.phone),
  };
  return profileFor(facts.categorySlug).intents
    .filter((intent) => available[intent])
    .slice(0, 3)
    .map((intent) => (ar ? INTENT_WORDS[intent].ar : INTENT_WORDS[intent].en));
}

/**
 * The page title: the name first, then where it is, then the words the place can stand behind —
 * "Restaurant El-Kababgy Luxor, Luxor East Bank: hours & photos". Words drop one by one until the
 * title fits 60 characters, and the brand suffix is only kept when it fits.
 */
export function placeTitle(facts: PlaceSeoFacts, locale: Locale): string {
  const ar = locale === 'ar';
  const name = titleBase(facts.name);
  const words = intentWords(facts, locale);
  const comma = ar ? '،' : ',';
  // The most specific place name first (the area), then the city.
  const heads = [
    facts.area ? `${name}${comma} ${facts.area}` : null,
    facts.city ? `${name}${comma} ${facts.city}` : null,
  ].filter((head, index, list): head is string => Boolean(head) && list.indexOf(head) === index);

  // More facts win first; with the same number of facts, the title that also keeps the brand wins,
  // then the area over the city. A place with neither keeps the bare name. The brand suffix is only
  // used where it fits after the facts (owner's rule).
  const suffix = titleSuffix(locale);
  for (let count = words.length; count >= 1; count -= 1) {
    for (const head of heads) {
      const candidate = `${head}: ${joinWords(words.slice(0, count), locale)}`;
      if (candidate.length + suffix.length <= 60) return `${candidate}${suffix}`;
    }
    for (const head of heads) {
      const candidate = `${head}: ${joinWords(words.slice(0, count), locale)}`;
      if (candidate.length <= 60) return candidate;
    }
  }
  for (const head of heads) {
    if (head.length + suffix.length <= 60) return `${head}${suffix}`;
    if (head.length <= 60) return head;
  }
  // No room for any of it (a very long name): fitTitle truncates at a word boundary, brand and all.
  return fitTitle(name, locale);
}

/**
 * The meta description: what the place is, where, when it opens and what it has — 70 to 160
 * characters, different for every place, and only true statements.
 */
export function placeDescription(facts: PlaceSeoFacts, locale: Locale): string {
  const ar = locale === 'ar';
  const profile = profileFor(facts.categorySlug);
  const noun = ar ? profile.noun.ar : profile.noun.en;
  const place = where(facts, locale) || facts.city;
  const hours = hoursSummary(facts.hours, locale);
  const features = featureWords(facts, locale, 3);

  const lead = ar
    ? `${facts.name} ${noun}${place ? ` في ${place}` : ''}.`
    : `${facts.name} is ${article(noun)} ${noun}${place ? ` in ${place}` : ''}.`;
  const hoursSentence = hours?.sentence ?? '';
  const priceSentence = facts.priceRange ? (ar ? `الأسعار ${facts.priceRange}.` : `Prices ${facts.priceRange}.`) : '';
  const featureSentence = features.length
    ? ar
      ? `وفيه ${joinWords(features, locale)}.`
      : `It has ${joinSentence(features)}.`
    : '';

  const parts = [lead, hoursSentence, priceSentence, featureSentence].filter(Boolean);
  // 155 is the budget: the page metadata helper clamps at 155, so a description that fits here is
  // published exactly as built (a longer one would be cut at the previous full stop).
  let text = '';
  for (const part of parts) {
    const next = text ? `${text} ${part}` : part;
    if (next.length > 155) continue; // this sentence does not fit; a later, shorter one may
    text = next;
  }
  // A place with little data (no hours, no features) still gets a full description from what it has.
  const extras = [
    facts.phone ? (ar ? `للتواصل: ${facts.phone}.` : `Call ${facts.phone}.`) : '',
    ar
      ? `شاهد صور ${facts.name} وعنوانه وخريطة الوصول على خرجني.`
      : `See photos, the address and the map for ${facts.name} on 5argny.`,
  ].filter(Boolean);
  for (const extra of extras) {
    if (text.length >= 70) break;
    if (`${text} ${extra}`.length <= 155) text = `${text} ${extra}`;
  }
  return clampDescription(text, 155);
}

/** A list read inside a sentence: "x, y and z" (never the "&" a title uses). */
export function joinSentence(words: string[], locale: Locale = 'en'): string {
  if (words.length <= 1) return words[0] ?? '';
  if (locale === 'ar') return words.join(' و');
  if (words.length === 2) return `${words[0]} and ${words[1]}`;
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** "a restaurant", "an entertainment venue" — the article follows the sound, not the spelling. */
function article(noun: string): string {
  return /^(a|e|i|o|u)/i.test(noun) ? 'an' : 'a';
}

/**
 * An amenity written inside a sentence: "Outdoor Seating" → "outdoor seating", but "Wi-Fi" and
 * "TV" keep their case (they are names, not words).
 */export function sentenceCase(name: string): string {
  return name.split(' ').map((word) => {
    if (/^[A-Z0-9]{2,}$/.test(word)) return word;        // TV, EGP, AC
    if (/\d/.test(word)) return word;                   // 24h
    if (/^[A-Z][a-z]*-[A-Z]/.test(word)) return word;    // Wi-Fi
    return word.charAt(0).toLowerCase() + word.slice(1);
  }).join(' ');
}

/** Amenities worth naming, most useful first; only ones the place really lists. */
const FEATURE_ORDER = [
  /outdoor seating/i, /indoor seating/i, /free parking/i, /paid parking/i, /valet/i,
  /wifi|wi-fi/i, /delivery/i, /takeaway/i, /wheelchair accessible entrance/i,
  /kid friendly|kids area|playground/i, /accepts reservations/i, /table service/i,
  /vegetarian options/i, /vegan options/i, /alcohol|bar on site/i, /swimming pool/i,
  /gym|fitness/i, /air condition/i, /credit cards/i, /cash/i,
];

/** The place's own amenity name for a known feature, or null when it does not list one. */
function featureAt(facts: PlaceSeoFacts, pattern: RegExp): string | null {
  const index = facts.amenityKeys.findIndex((key) => pattern.test(key));
  return index >= 0 ? (facts.amenities[index] ?? null) : null;
}

export function featureWords(facts: PlaceSeoFacts, locale: Locale, max = 4): string[] {
  const ar = locale === 'ar';
  const chosen: string[] = [];
  for (const pattern of FEATURE_ORDER) {
    const found = featureAt(facts, pattern);
    if (!found || chosen.includes(found)) continue;
    // The API sends both languages; on the English page an Arabic-only name is not English text.
    if (!ar && /[\u0600-\u06FF]/.test(found)) continue;
    if (ar && /[A-Za-z]/.test(found)) continue;
    chosen.push(ar ? found : sentenceCase(found));
    if (chosen.length >= max) break;
  }
  return chosen;
}

/** "About {Name}" and its paragraph — the page's own explanation of the place. */
export function aboutParagraph(facts: PlaceSeoFacts, locale: Locale): { heading: string; text: string } {
  const ar = locale === 'ar';
  const profile = profileFor(facts.categorySlug);
  const noun = ar ? profile.noun.ar : profile.noun.en;
  const place = where(facts, locale);
  const hours = hoursSummary(facts.hours, locale);
  const features = featureWords(facts, locale, 5);
  const named = new Set(features.map((feature) => feature.toLowerCase()));
  const sentences: string[] = [];

  sentences.push(
    ar
      ? `${facts.name} ${noun}${place ? ` في ${place}` : ''}.`
      : `${facts.name} is ${article(noun)} ${noun}${place ? ` in ${place}` : ''}.`,
  );

  if (hours) sentences.push(hours.sentence);

  if (features.length) {
    sentences.push(ar ? `وفيه ${joinWords(features, locale)}.` : `It has ${joinSentence(features)}.`);
  }

  // Kind-specific close, from amenities the place lists and the paragraph has not already named.
  const extras: string[] = [];
  const addExtra = (pattern: RegExp, en: string, arText: string) => {
    const own = featureAt(facts, pattern);
    if (!own || named.has(own.toLowerCase()) || named.has(sentenceCase(own).toLowerCase())) return;
    extras.push(ar ? arText : en);
  };
  if (profile.kind === 'eat' || profile.kind === 'coffee' || profile.kind === 'nightlife') {
    addExtra(/accepts reservations/i, 'takes reservations', 'يقبل الحجز');
    addExtra(/delivery/i, 'delivers', 'فيه خدمة توصيل');
    addExtra(/takeaway/i, 'does takeaway', 'فيه طلبات خارجية');
  }
  if (extras.length) {
    sentences.push(ar ? `${joinWords(extras, 'ar')}.` : `It ${joinSentence(extras)}.`);
  }

  if (facts.hasMenu && facts.menuHighlights.length) {
    const items = facts.menuHighlights.slice(0, 3).map((item) => `${item.name} (${item.price})`);
    sentences.push(ar ? `من المنيو: ${joinWords(items, 'ar')}.` : `From the menu: ${joinWords(items, 'en')}.`);
  }

  // The catalog's own tags, attributed to the listing (never asserted as this page's opinion).
  if (facts.tags.length) {
    const tags = facts.tags.slice(0, 3).map((tag) => (ar ? tag : sentenceCase(tag)));
    sentences.push(ar ? `مصنّف: ${tags.join('، ')}.` : `Listed as ${joinSentence(tags)}.`);
  }

  // The stored address is written in one script; it is worth showing only to a reader of it.
  if (facts.address && sameScript(facts.address, ar)) {
    sentences.push(ar ? `العنوان: ${facts.address}.` : `Address: ${facts.address}.`);
  }

  if (facts.viewCount > 0) {
    sentences.push(
      ar
        ? `شوهدت صفحة المكان ${facts.viewCount} مرة على خرجني.`
        : `Its page has been viewed ${facts.viewCount} ${facts.viewCount === 1 ? 'time' : 'times'} on 5argny.`,
    );
  }
  if (facts.likeCount > 0) {
    sentences.push(ar ? `وأعجب بها ${facts.likeCount} شخص على خرجني.` : `${facts.likeCount} people liked it on 5argny.`);
  }

  return { heading: ar ? `عن ${facts.name}` : `About ${facts.name}`, text: sentences.join(' ') };
}

function sameScript(text: string, arabic: boolean): boolean {
  const letters = text.match(/\p{Letter}/gu) ?? [];
  if (!letters.length) return false;
  const pattern = arabic ? /\p{Script=Arabic}/u : /\p{Script=Latin}/u;
  return letters.filter((letter) => pattern.test(letter)).length >= letters.length * 0.8;
}

/** "Also known as …" — the other language's name, shown once. */
export function otherNameLine(facts: PlaceSeoFacts, locale: Locale): string | null {
  if (!facts.nameOther) return null;
  return locale === 'ar' ? `ويُعرف أيضًا باسم ${facts.nameOther}.` : `Also known as ${facts.nameOther}.`;
}

// ── questions the data answers ───────────────────────────────────────────────

export type Question = { question: string; answer: string };

type AmenityQuestion = { match: RegExp; en: string; ar: string; answerEn: string; answerAr: string };

/** The amenities a visitor actually asks about, with written answers in both languages. */
const AMENITY_QUESTIONS: AmenityQuestion[] = [
  {
    match: /outdoor seating/i,
    en: 'outdoor seating', ar: 'جلوس خارجي',
    answerEn: 'Yes — it has outdoor seating.', answerAr: 'نعم، يوجد جلوس خارجي.',
  },
  {
    match: /free parking/i,
    en: 'free parking', ar: 'موقف سيارات مجاني',
    answerEn: 'Yes — free parking is available.', answerAr: 'نعم، يوجد موقف سيارات مجاني.',
  },
  {
    match: /wheelchair accessible entrance/i,
    en: 'a wheelchair accessible entrance', ar: 'مدخل لذوي الهمم',
    answerEn: 'Yes — the entrance is wheelchair accessible.', answerAr: 'نعم، المدخل مناسب لذوي الهمم.',
  },
  {
    match: /kid friendly|playground|kids area/i,
    en: 'a kids area', ar: 'منطقة أطفال',
    answerEn: 'Yes — it is kid friendly.', answerAr: 'نعم، المكان مناسب للأطفال.',
  },
  {
    match: /delivery/i,
    en: 'delivery', ar: 'خدمة توصيل',
    answerEn: 'Yes — it delivers.', answerAr: 'نعم، يوجد خدمة توصيل.',
  },
  {
    match: /takeaway/i,
    en: 'takeaway', ar: 'طلبات خارجية',
    answerEn: 'Yes — it does takeaway.', answerAr: 'نعم، يوجد طلبات خارجية.',
  },
  {
    match: /accepts reservations/i,
    en: 'reservations', ar: 'حجز',
    answerEn: 'Yes — it takes reservations.', answerAr: 'نعم، المكان يقبل الحجز.',
  },
  {
    match: /wifi|wi-fi/i,
    en: 'Wi-Fi', ar: 'واي فاي',
    answerEn: 'Yes — it has Wi-Fi.', answerAr: 'نعم، يوجد واي فاي.',
  },
];

/**
 * The Q&A block, from facts only: a question is asked only when the record answers it. Plain
 * HTML on the page — no FAQPage markup (Google stopped showing it for this kind of site).
 */
export function placeQuestions(facts: PlaceSeoFacts, locale: Locale, max = 4): Question[] {
  const ar = locale === 'ar';
  const place = where(facts, locale) || facts.city;
  const questions: Question[] = [];

  if (place || facts.address) {
    const address = facts.address && sameScript(facts.address, ar) ? facts.address : '';
    const answer = ar
      ? `${facts.name} في ${place}${address ? `، ${address}` : ''}.`
      : `${facts.name} is in ${place}${address ? `, ${address}` : ''}.`;
    questions.push({ question: ar ? `أين يقع ${facts.name}؟` : `Where is ${facts.name}?`, answer });
  }

  const hours = hoursSummary(facts.hours, locale);
  if (hours) {
    questions.push({
      question: ar ? `ما مواعيد عمل ${facts.name}؟` : `What are ${facts.name}'s opening hours?`,
      answer: `${hours.answer}.`,
    });
  }

  if (facts.hasMenu) {
    questions.push({
      question: ar ? `هل يوجد منيو في ${facts.name}؟` : `Does ${facts.name} have a menu?`,
      answer: ar ? 'نعم، المنيو بالأسعار معروض على هذه الصفحة.' : 'Yes — the menu with prices is on this page.',
    });
  }

  if (facts.priceRange) {
    questions.push({
      question: ar ? `ما مستوى أسعار ${facts.name}؟` : `How much does ${facts.name} cost?`,
      answer: ar ? `الأسعار في نطاق ${facts.priceRange}.` : `Prices are in the ${facts.priceRange} range.`,
    });
  }

  for (const amenity of AMENITY_QUESTIONS) {
    if (questions.length >= max) break;
    if (featureAt(facts, amenity.match) === null) continue;
    questions.push({
      question: ar ? `هل يوجد ${amenity.ar} في ${facts.name}؟` : `Does ${facts.name} have ${amenity.en}?`,
      answer: ar ? amenity.answerAr : amenity.answerEn,
    });
  }

  if (facts.phone && questions.length < max) {
    questions.push({
      question: ar ? `كيف أتواصل مع ${facts.name}؟` : `How can I contact ${facts.name}?`,
      answer: ar ? `اتصل على ${facts.phone}.` : `Call ${facts.phone}.`,
    });
  }

  return questions.slice(0, max);
}

// ── images ───────────────────────────────────────────────────────────────────

/** Every place photo's alt text: "{Name} — {area}, photo N", in the page's own language. */
export function photoAlt(name: string, area: string, city: string, index: number, locale: Locale): string {
  const where = area || city;
  const number = index + 1;
  if (locale === 'ar') return where ? `${name} — ${where}، صورة ${number}` : `${name} — صورة ${number}`;
  return where ? `${name} — ${where}, photo ${number}` : `${name} — photo ${number}`;
}

/** The alt text of the place's share image, which doubles as its hero. */
export const shareAlt = (facts: PlaceSeoFacts, locale: Locale) => photoAlt(facts.name, facts.area, facts.city, 0, locale);

// ── from the API record to the facts ─────────────────────────────────────────

/** The fields a place record really carries (GET /v1/places/:slug), as this page reads them. */
export type RawPlaceRecord = {
  name?: string | null;
  nameEn?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  mapsUrl?: string | null;
  priceRange?: number | null;
  hours?: HourFact[];
  amenities?: { name?: string | null; nameEn?: string | null }[];
  tags?: { name?: string | null; nameEn?: string | null }[];
  hasMenu?: boolean;
  images?: unknown[];
  viewCount?: number | null;
  likeCount?: number | null;
};

/**
 * One place, in the page's language. `area` is already localized by the caller (regionLabel hides a
 * region that has no form in this language rather than printing it in the other script).
 */
export function buildPlaceFacts(input: {
  place: RawPlaceRecord;
  locale: Locale;
  city: string;
  /** The place's area in the page's language, or ''. */
  area: string;
  categorySlug: string | null;
  categoryName: string | null;
  priceRangeLabel: string | null;
  url: string;
  menuHighlights?: MenuHighlight[];
}): PlaceSeoFacts {
  const { place, locale } = input;
  const ar = locale === 'ar';
  const arName = (place.name ?? '').trim();
  const enName = (place.nameEn ?? '').trim();
  const name = (ar ? arName || enName : enName || arName) || '';
  const other = ar ? enName : arName;
  const amenity = (entry: { name?: string | null; nameEn?: string | null }) =>
    ((ar ? entry.name : entry.nameEn || entry.name) || '').trim();
  const amenityKey = (entry: { name?: string | null; nameEn?: string | null }) =>
    ((entry.nameEn || entry.name) || '').trim();
  // Label and key are built together so index i of one always describes index i of the other.
  const amenities = (place.amenities ?? [])
    .map((entry) => ({ label: amenity(entry) || amenityKey(entry), key: amenityKey(entry) || amenity(entry) }))
    .filter((entry) => entry.label);
  return {
    name,
    // Same name in both languages is not "another name".
    nameOther: other && other !== name ? other : null,
    categorySlug: input.categorySlug,
    categoryName: input.categoryName,
    area: input.area,
    city: input.city,
    address: (place.address ?? '').trim() || null,
    phone: (place.phone ?? '').trim() || null,
    website: (place.website ?? '').trim() || null,
    instagram: (place.instagram ?? '').trim() || null,
    facebook: (place.facebook ?? '').trim() || null,
    mapsUrl: (place.mapsUrl ?? '').trim() || null,
    priceRange: input.priceRangeLabel,
    hours: place.hours ?? [],
    amenities: amenities.map((entry) => entry.label),
    amenityKeys: amenities.map((entry) => entry.key),
    tags: (place.tags ?? []).map(amenity).filter(Boolean),
    hasMenu: place.hasMenu === true,
    menuHighlights: input.menuHighlights ?? [],
    imageCount: Array.isArray(place.images) ? place.images.length : 0,
    viewCount: Number(place.viewCount) || 0,
    likeCount: Number(place.likeCount) || 0,
    url: input.url,
  };
}
