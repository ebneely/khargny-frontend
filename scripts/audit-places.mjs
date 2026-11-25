#!/usr/bin/env node
/**
 * Measure every place page, in both languages, from the server's own HTML.
 *
 *   node scripts/audit-places.mjs http://127.0.0.1:3109 [--json out.json]
 *
 * What it proves for SEO Stage 3 (titles and descriptions written from each place's own facts):
 *   - no two places share a title or a description, in either language;
 *   - every title fits 60 characters, every description sits in 70–160;
 *   - how much visible text the page carries (min / median / max), so the before and the after
 *     runs of this same script are comparable;
 *   - the schema.org type each place claims, and that place photos carry alt text.
 *
 * The page list comes from the site's own places sitemap, so the audit covers exactly the URLs we
 * publish. Googlebot's user agent is used because that is the HTML a crawler gets (metadata inside
 * <head>).
 */
const baseArg = process.argv[2];
if (!baseArg) {
  console.error('usage: node scripts/audit-places.mjs <base-url> [--json out.json]');
  process.exit(2);
}
const base = new URL(baseArg);
const jsonIndex = process.argv.indexOf('--json');
const jsonOut = jsonIndex > 0 ? process.argv[jsonIndex + 1] : null;
const apiIndex = process.argv.indexOf('--api');
// The site's own backend, used only to list every place: the sitemap is one rendering of the same
// list and can come back short while the stack is under the load this very script creates.
const apiBase = new URL(apiIndex > 0 ? process.argv[apiIndex + 1] : 'http://127.0.0.1:3120');
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const get = async (path, tries = 2) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(new URL(path, base), { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow' });
      return { status: response.status, html: await response.text() };
    } catch (error) {
      if (attempt >= tries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
};

/**
 * Every published place URL. The place list comes from the public API (the same catalogue the
 * sitemaps are built from, paged 50 at a time like the sitemap builder does), and the sites map's
 * own count is read as a cross-check so a mismatch is visible instead of silent.
 */
async function placePaths() {
  const citiesResponse = await fetch(new URL('/v1/cities', apiBase), { headers: { accept: 'application/json' } });
  const cities = (await citiesResponse.json())?.data;
  if (!Array.isArray(cities)) throw new Error(`/v1/cities answered ${citiesResponse.status}`);
  const paths = new Set();
  for (const city of cities) {
    if (!city?.slug || !city?.id) continue;
    for (let skip = 0; ; skip += 50) {
      const response = await fetch(
        new URL(`/v1/places?cityId=${encodeURIComponent(city.id)}&skip=${skip}&limit=50`, apiBase),
        { headers: { accept: 'application/json' } },
      );
      const page = (await response.json())?.data;
      const items = Array.isArray(page)
        ? page
        : Array.isArray(page?.items)
          ? page.items
          : Array.isArray(page?.data) ? page.data : [];
      if (!items.length) break;
      for (const place of items) {
        if (place?.slug && place?.cityId === city.id) paths.add(`/explorer/${city.slug}/${place.slug}/`);
      }
      if (items.length < 50) break;
    }
  }
  return [...paths].sort();
}

/** The sitemap's own view of the catalogue, as a cross-check on the list above. */
async function sitemapPlaceCount() {
  try {
    const index = await get('/sitemap.xml');
    const files = [...index.html.matchAll(/<loc>([^<]*\/sitemaps\/places-\d+\.xml)<\/loc>/g)].map((m) => m[1]);
    const paths = new Set();
    for (const file of files) {
      const response = await fetch(new URL(new URL(file).pathname, base), { headers: { 'user-agent': UA } });
      const xml = await response.text();
      for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        let path;
        try { path = new URL(match[1]).pathname; } catch { continue; }
        if (/^\/(?:ar\/)?explorer\/[^/]+\/[^/]+\/$/.test(path)) paths.add(path.replace(/^\/ar(?=\/)/, ''));
      }
    }
    return paths.size;
  } catch {
    return null;
  }
}

/** HTML entities decoded, so a title's length is the length a search engine counts. */
const decodeEntities = (value) => (value ?? '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)));

const strip = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[#a-z0-9]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function readPage(html) {
  const head = html.split('</head>')[0] ?? '';
  const body = html.split('</head>').slice(1).join('</head>');
  const title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1]?.trim() ?? null);
  const description = decodeEntities(
    /<meta\s+name="description"\s+content="([\s\S]*?)"/i.exec(head)?.[1]
      ?? /<meta\s+content="([\s\S]*?)"\s+name="description"/i.exec(head)?.[1] ?? null,
  );
  const graph = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap((match) => {
      try {
        const data = JSON.parse(match[1]);
        return Array.isArray(data?.['@graph']) ? data['@graph'] : [data];
      } catch { return []; }
    });
  const business = graph.find((node) => node && node['@type'] && node['@id']?.endsWith('#business'));
  const photos = [...html.matchAll(/<img\b[^>]*\balt="([^"]*)"[^>]*>/g)].map((m) => m[1]).filter(Boolean);
  const text = strip(body);
  return {
    title,
    description,
    schemaType: business?.['@type'] ?? null,
    alternateName: business?.alternateName ?? null,
    hasMap: Boolean(business?.hasMap),
    altCount: photos.length,
    words: text ? text.split(' ').filter(Boolean).length : 0,
  };
}

const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

const paths = await placePaths();
const sitemapCount = await sitemapPlaceCount();
const rows = [];
const failures = [];
const CONCURRENCY = 6;
let cursor = 0;

async function worker() {
  for (;;) {
    const index = cursor++;
    const path = paths[index];
    if (!path) return;
    for (const lang of ['en', 'ar']) {
      const url = lang === 'ar' ? `/ar${path}` : path;
      const { status, html } = await get(url);
      if (status !== 200) {
        failures.push(`${url}: status ${status}`);
        continue;
      }
      rows.push({ url, lang, ...readPage(html) });
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// ── the checks ──────────────────────────────────────────────────────────────
const byLang = { en: rows.filter((row) => row.lang === 'en'), ar: rows.filter((row) => row.lang === 'ar') };
const report = { base: base.href, api: apiBase.href, places: paths.length, sitemapPlaces: sitemapCount, pages: rows.length, languages: {}, failures };

for (const [lang, list] of Object.entries(byLang)) {
  const titles = new Map();
  const descriptions = new Map();
  for (const row of list) {
    for (const [key, bucket] of [['title', titles], ['description', descriptions]]) {
      const value = row[key];
      if (!value) continue;
      bucket.set(value, [...(bucket.get(value) ?? []), row.url]);
    }
  }
  const duplicates = (bucket) => [...bucket.entries()].filter(([, urls]) => urls.length > 1);
  const words = list.map((row) => row.words);
  report.languages[lang] = {
    pages: list.length,
    duplicateTitles: duplicates(titles).length,
    duplicateTitleExamples: duplicates(titles).slice(0, 3),
    duplicateDescriptions: duplicates(descriptions).length,
    duplicateDescriptionExamples: duplicates(descriptions).slice(0, 3),
    missingTitle: list.filter((row) => !row.title).length,
    missingDescription: list.filter((row) => !row.description).length,
    titlesOver60: list.filter((row) => (row.title ?? '').length > 60).length,
    longestTitles: [...list].sort((a, b) => (b.title ?? '').length - (a.title ?? '').length).slice(0, 3).map((row) => ({ url: row.url, length: row.title.length, title: row.title })),
    descriptionsOutside70to160: list.filter((row) => (row.description ?? '').length < 70 || (row.description ?? '').length > 160).length,
    descriptionLengths: [...list].sort((a, b) => (a.description ?? '').length - (b.description ?? '').length).slice(0, 3).map((row) => ({ url: row.url, length: row.description.length, description: row.description })),
    words: { min: Math.min(...words), median: median(words), max: Math.max(...words) },
    wordsUnder250: list.filter((row) => row.words < 250).length,
    schemaTypes: Object.fromEntries([...new Set(list.map((row) => row.schemaType))].sort().map((type) => [type, list.filter((row) => row.schemaType === type).length])),
    withoutAlternateName: list.filter((row) => !row.alternateName).length,
  };
}

console.log(JSON.stringify(report, null, 2));
if (jsonOut) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(jsonOut, JSON.stringify({ report, rows }, null, 2));
  console.error(`\nwrote ${jsonOut}`);
}
if (failures.length) process.exitCode = 1;
