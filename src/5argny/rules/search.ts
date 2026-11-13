import { en, ar } from '../copy/index.ts';

// The seven intents and the categories each covers (app.js INTENTS); labels live in copy.intents
export const INTENTS = [
  { key: 'eat', cats: ['Restaurants'] },
  { key: 'coffee', cats: ['Cafes'] },
  { key: 'fun', cats: ['Entertainment', 'Cinemas', 'Clubs'] },
  { key: 'history', cats: ['Historic Landmarks', 'Museums'] },
  { key: 'stay', cats: ['Hotels & Resorts'] },
  { key: 'shop', cats: ['Shopping Malls'] },
  { key: 'outdoors', cats: ['Parks'] },
] as const;
export type Intent = (typeof INTENTS)[number];
export type IntentKey = Intent['key'];

// What fits this hour, for the "Right now" card and the search zero state (app.js moment())
export const momentFor = (hour: number): { intent: IntentKey; title: keyof typeof en.moments } =>
  hour >= 6 && hour < 11 ? { intent: 'coffee', title: 'morningCoffee' }
  : hour >= 11 && hour < 16 ? { intent: 'eat', title: 'lunch' }
  : hour >= 16 && hour < 19 ? { intent: 'outdoors', title: 'goldenHour' }
  : hour >= 19 && hour < 23 ? { intent: 'eat', title: 'dinner' }
  : { intent: 'fun', title: 'lateNight' };

// Arabic and English typed any way match the same words: lower case, no diacritics or tatweel, one alef, ة=ه, ى=ي, western digits
export const searchNormalize = (s: unknown) =>
  String(s ?? '').toLowerCase().normalize('NFKD')
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) & 0xf)) // first: Arabic digits sit inside the mark range below
    .replace(/[\u064B-\u0670\u0300-\u036F\u0640]/g, '') // Arabic marks, Latin accents, tatweel
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ').trim();

// what people type for each intent, already normalized (app.js SYN)
export const SYN: Record<IntentKey, string[]> = {
  eat: ['akl', 'food', 'restaurant', 'اكل', 'مطعم', 'مطاعم', 'غدا', 'عشا', 'dinner', 'lunch'],
  coffee: ['cafe', 'café', 'coffee', 'kahwa', 'qahwa', 'قهوه', 'كافيه', 'كافيهات'],
  fun: ['fun', 'ترفيه', 'خروجه', 'خروجات', 'cinema', 'سينما', 'club', 'kids', 'اطفال'],
  history: ['history', 'museum', 'متحف', 'اثار', 'تاريخ', 'temple'],
  stay: ['hotel', 'resort', 'فندق', 'فنادق', 'stay'],
  shop: ['mall', 'shop', 'مول', 'تسوق'],
  outdoors: ['park', 'garden', 'حديقه', 'حدايق', 'جنينه', 'sea', 'beach', 'بحر', 'شاطئ'],
};

// the intent a query asks for: a label, a category or a synonym that starts with it, or a synonym inside it
export function intentFor(q: string): Intent | null {
  const n = searchNormalize(q);
  if (n.length < 2) return null;
  const starts = (w: string) => searchNormalize(w).startsWith(n);
  return INTENTS.find((x) => starts(en.intents[x.key]) || starts(ar.intents[x.key]) || x.cats.some(starts)
    || SYN[x.key].some((w) => starts(w) || n.includes(searchNormalize(w)))) ?? null;
}

export type SearchablePlace = { en?: string | null; ar?: string | null; cat: string; area?: string | null; city?: string | null; services?: { n: string }[] };
// a place matches when the query is inside its names, category, area, city or services, or the query's intent covers its category
export function matchText(p: SearchablePlace, q: string) {
  const it = intentFor(q);
  const hay = searchNormalize([p.en, p.ar, p.cat, p.area, p.city, ...(p.services ?? []).map((x) => x.n)].join(' '));
  return hay.includes(searchNormalize(q)) || !!(it && (it.cats as readonly string[]).includes(p.cat));
}
