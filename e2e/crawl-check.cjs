const { performance } = require('node:perf_hooks');

function decode(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function inspectHtml(html) {
  const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const headings = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => decode(match[1].replace(/<[^>]*>/g, '')).trim());
  const links = [...body.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map((match) => decode(match[1]));
  const photos = [...body.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const places = links.filter((href) => /^\/(?:ar|en)\/explorer\/[^/?#]+\/[^/?#]+\/?(?:[?#]|$)/.test(href));
  const cities = links.filter((href) => /^\/(?:ar|en)\/explorer\/[^/?#]+\/?(?:[?#]|$)/.test(href));
  return { headings, links, places, cities, photos, text: decode(body.replace(/<[^>]*>/g, '')), bytes: Buffer.byteLength(html), total: Number(body.match(/data-city-total="(\d+)"/)?.[1]), pageSize: Number(body.match(/data-page-size="(\d+)"/)?.[1]) };
}

function htmlFailures(result, { kind, locale, minCities = 1, cityTotal } = {}) {
  const errors = [];
  if (result.headings.length !== 1) errors.push(`expected one h1, got ${result.headings.length}`);
  if (result.headings.some((heading) => !heading || /loading|ثانية واحدة|جار[يٍ] التحميل|تحميل[.…]/i.test(heading))) errors.push('empty/loading heading');
  if (result.photos.some((image) => !/\balt="[^"]*"/.test(image))) errors.push('image without alt');
  if ((kind === 'home' || kind === 'explorer') && new Set(result.cities).size < minCities) errors.push(`expected ${minCities} city links`);
  if (kind === 'city') {
    const minimum = Number.isFinite(result.total) && Number.isFinite(result.pageSize) ? Math.min(result.total, result.pageSize) : 1;
    if (new Set(result.places).size < minimum) errors.push(`expected ${minimum} place links`);
    if (result.total > result.pageSize && !result.links.some((href) => /[?&]page=2(?:&|$)/.test(href))) errors.push('missing page=2 link');
  }
  if (kind === 'place') {
    const minimum = cityTotal === undefined ? 8 : Math.min(8, Math.max(0, cityTotal - 1));
    if (new Set(result.places).size < minimum) errors.push(`expected ${minimum} related place links`);
    for (const href of [`/${locale}/`, `/${locale}/explorer/`]) if (!result.links.includes(href)) errors.push(`missing breadcrumb ${href}`);
    if (!result.cities.length) errors.push('missing city breadcrumb');
  }
  return errors;
}

async function crawl(baseAddress) {
  const base = new URL(baseAddress);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Use an http(s) base URL without credentials.');
  const request = (url) => fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'KhargnySEO-Crawler/1.0 (no JavaScript)', Accept: 'text/html,application/xml' }, signal: AbortSignal.timeout(30000) });
  const locations = [];
  const visited = new Set();
  async function sitemap(address) {
    if (visited.has(address)) return;
    if (visited.size >= 100) throw new Error('Unexpectedly large sitemap index');
    visited.add(address);
    const response = await request(address);
    if (response.status !== 200) throw new Error(`Sitemap HTTP ${response.status}: ${address}`);
    const xml = await response.text();
    const entries = [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map((match) => decode(match[1].trim()));
    if (/<sitemapindex\b/i.test(xml)) {
      for (const entry of entries) { const url = new URL(entry, base); await sitemap(new URL(url.pathname + url.search, base).href); }
    } else locations.push(...entries);
  }
  await sitemap(new URL('/sitemap.xml', base).href);
  const cityPaths = new Set();
  const placePaths = new Set();
  for (const location of locations) {
    const path = new URL(location, base).pathname.replace(/^\/(?:ar|en)(?=\/)/, '').replace(/\/+$/, '') + '/';
    if (/^\/explorer\/[^/]+\/$/.test(path)) cityPaths.add(path);
    if (/^\/explorer\/[^/]+\/[^/]+\/$/.test(path)) { placePaths.add(path); cityPaths.add(path.split('/').slice(0, 3).join('/') + '/'); }
  }
  if (!cityPaths.size || !placePaths.size) throw new Error('Sitemap contains no city/place URLs');
  const available = [...placePaths].sort();
  const sample = Array.from({ length: Math.min(20, available.length) }, (_, index) => available[Math.floor(index * available.length / Math.min(20, available.length))]);
  const totals = new Map();
  const failures = [];
  for (const locale of ['ar', 'en']) {
    const targets = [{ path: '/', kind: 'home' }, { path: '/explorer/', kind: 'explorer' }, ...[...cityPaths].sort().map((path) => ({ path, kind: 'city' })), ...sample.map((path) => ({ path, kind: 'place' }))];
    for (const target of targets) {
      const url = new URL(`/${locale}${target.path}`, base);
      const start = performance.now();
      try {
        const response = await request(url);
        const html = await response.text();
        const result = inspectHtml(html);
        const errors = htmlFailures(result, { ...target, locale, minCities: cityPaths.size, cityTotal: totals.get(target.path.split('/').slice(0, 3).join('/') + '/') });
        if (response.status !== 200) errors.unshift(`HTTP ${response.status}`);
        if (!new RegExp(`<html\\b[^>]*\\blang="${locale}"`).test(html)) errors.push('wrong html lang');
        if (!new RegExp(`<html\\b[^>]*\\bdir="${locale === 'ar' ? 'rtl' : 'ltr'}"`).test(html)) errors.push('wrong html dir');
        if (target.kind === 'city' && Number.isFinite(result.total)) totals.set(target.path, result.total);
        console.log(`${response.status} ${url.href} h1=${JSON.stringify(result.headings.join(' | '))} links=${result.links.length} places=${result.places.length} images=${result.photos.length} bytes=${result.bytes} ms=${Math.round(performance.now() - start)}${errors.length ? ` FAIL: ${errors.join('; ')}` : ''}`);
        if (errors.length) failures.push(url.href);
      } catch (error) { console.log(`ERROR ${url.href} ms=${Math.round(performance.now() - start)} ${error.message}`); failures.push(url.href); }
    }
  }
  const largest = [...totals].sort((first, second) => second[1] - first[1])[0];
  if (largest) console.log(`Largest city: ${largest[0]} places=${largest[1]} page-size=24 pages=${Math.ceil(largest[1] / 24)}`);
  if (failures.length) throw new Error(`${failures.length} crawl checks failed`);
}

if (require.main === module) {
  if (!process.argv[2]) { console.error('Usage: node e2e/crawl-check.cjs <base-url>'); process.exitCode = 1; }
  else crawl(process.argv[2]).catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { inspectHtml, htmlFailures, crawl };
