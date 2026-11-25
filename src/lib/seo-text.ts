/**
 * Title and description fitting, with no server-only imports.
 *
 * These lived in `seo.ts`, which reads request headers — so anything that could be tested
 * (and anything that must be built from a place's own facts) had to drag Next's server
 * request context along with it. They are pure string work, so they live here and `seo.ts`
 * re-exports them for the pages that already import from it.
 */
import type { Locale } from '@/i18n/dictionaries';

/** Trim to a length search engines actually display, without cutting mid-word. */
export function fitText(text: string, max: number): string {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const words: string[] = [];
  for (const word of clean.split(' ')) {
    if ([...words, word].join(' ').length > max - 1) break;
    words.push(word);
  }
  return `${words.join(' ')}…`;
}

export function clampDescription(text: string, max = 155): string {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return trimDanglingText(clean);
  // Never cut the text down to a stub: a boundary that leaves less than 70 characters (the least a
  // search engine shows) is not a boundary worth using, so the cut falls on the next clause instead.
  const floor = Math.min(70, max);
  const sentences = [...clean.matchAll(/[.!?؟](?=\s|$)/g)]
    .map((match) => (match.index ?? 0) + 1).filter((end) => end <= max && end >= floor);
  if (sentences.length) return clean.slice(0, sentences[sentences.length - 1]);
  const clauses = [...clean.matchAll(/[,،;؛:](?=\s)|\s[—–-](?=\s)/g)]
    .filter((match) => !/&(?:#\d+|#x[\da-f]+|[a-z][\da-z]*);$/i.test(clean.slice(0, (match.index ?? 0) + 1)))
    .map((match) => match.index ?? 0).filter((end) => end <= max - 1 && end >= floor);
  const fitted = clauses.length
    ? clean.slice(0, clauses[clauses.length - 1])
    : fitText(clean, max).replace(/…$/, '');
  return `${trimDanglingText(fitted)}…`;
}

export function trimDanglingText(text: string): string {
  return text.replace(/(?:\s*[—–,،-]|\s+(?:and|or|but|و|أو|لكن))+$/gi, '').trim();
}

export function titleBase(text: string): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
    .replace(/(?:\s*[·—|]\s*(?:Khargny|5argny|خرجني))+$/i, '')
    .replace(/^(?:Khargny|5argny|خرجني)\s*[·—|]\s*/i, '');
}

/** The brand suffix each language uses, and the room a title has left for its own words. */
export const titleSuffix = (locale: Locale) => (locale === 'ar' ? ' | خرجني' : ' | 5argny'); // no "·" on screen (owner rule)

export function fitTitle(text: string, locale: Locale): string {
  const suffix = titleSuffix(locale);
  const fitted = fitText(titleBase(text), 60 - suffix.length);
  const truncated = fitted.endsWith('…');
  return `${trimDanglingText(fitted.replace(/…$/, ''))}${truncated ? '…' : ''}${suffix}`;
}

export function fitPlaceTitle(parts: { name: string; category?: string | null; area?: string | null; city?: string | null }, locale: Locale): string {
  const name = titleBase(parts.name);
  const location = [parts.area, parts.city].filter(Boolean).join(', ');
  const candidates = [
    [name, parts.category, location],
    [name, parts.category, parts.city],
    [name, parts.city],
    [name],
  ].map((candidate) => candidate.filter(Boolean).join(' — '));
  const suffix = titleSuffix(locale);
  return fitTitle(candidates.find((candidate) => candidate.length + suffix.length <= 60) ?? name, locale);
}

export function fitCityTitle(base: string, count: number | null, locale: Locale): string {
  const counted = count ? `${base}${locale === 'ar' ? ` (${count} مكان)` : ` — ${count} ${count === 1 ? 'place' : 'places'}`}` : base;
  const suffix = titleSuffix(locale);
  return fitTitle(titleBase(counted).length + suffix.length <= 60 ? counted : base, locale);
}

/** Join words the way a title reads: "a, b & c" / "أ و ب و ج". Omitted words are already gated by data. */
export function joinWords(words: string[], locale: Locale): string {
  if (words.length <= 1) return words[0] ?? '';
  if (locale === 'ar') return words.join(' و');
  if (words.length === 2) return `${words[0]} & ${words[1]}`;
  return `${words.slice(0, -1).join(', ')} & ${words[words.length - 1]}`;
}
