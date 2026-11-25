#!/usr/bin/env node
/**
 * Verify crawler metadata placement and the one-<h1> rule.
 *
 * Crawler UAs must see title/canonical/hreflang inside <head> (and nothing after it).
 * A browser UA only needs the expected status and exactly one <h1>; its metadata may stream.
 *
 * Usage: node scripts/check-head.mjs http://127.0.0.1:3106 [place-path]
 * Default place path: /explorer/aswan/movenpick-resort-aswan/
 */
const baseArg = process.argv[2];
if (!baseArg) {
  console.error('usage: node scripts/check-head.mjs <base-url> [place-path]');
  process.exit(2);
}

let base;
try {
  base = new URL(baseArg);
} catch {
  console.error(`invalid base URL: ${baseArg}`);
  process.exit(2);
}
if (!['127.0.0.1', 'localhost', '::1'].includes(base.hostname)) {
  console.error('refusing a non-local base URL; this check runs against the local standalone build');
  process.exit(2);
}

const placePath = process.argv[3] || '/explorer/aswan/movenpick-resort-aswan/';
const pages = [
  { path: '/', status: 200, metadata: true },
  { path: '/ar/', status: 200, metadata: true },
  { path: '/explorer/', status: 200, metadata: true },
  { path: placePath, status: 200, metadata: true },
  { path: `/ar${placePath}`, status: 200, metadata: true },
  { path: '/explorer/matrouh/definitely-not-a-place-check/', status: 404, metadata: false },
  // A city that does not exist is a real 404, not an empty landing page.
  { path: '/explorer/not-a-real-city-check/', status: 404, metadata: false },
];

/**
 * One landing page of each type, discovered from the site's own landing sitemap, so this check
 * proves `<h1>`, canonical, hreflang and a single heading on the pages the sitemap actually
 * publishes — not on a hard-coded address that may stop qualifying tomorrow.
 */
const LANDING_SHAPES = [
  { kind: 'area-category', re: /^\/explorer\/[^/]+\/area\/[^/]+\/category\/[^/]+\/$/ },
  { kind: 'city-category', re: /^\/explorer\/[^/]+\/category\/[^/]+\/$/ },
  { kind: 'area', re: /^\/explorer\/[^/]+\/area\/[^/]+\/$/ },
  { kind: 'category', re: /^\/category\/[^/]+\/$/ },
  { kind: 'city', re: /^\/explorer\/[^/]+\/$/ },
];

async function discoverLandingPaths() {
  const found = new Map();
  const index = await fetch(new URL('/sitemap.xml', base), { headers: { accept: 'application/xml' } });
  if (!index.ok) throw new Error(`/sitemap.xml answered ${index.status}`);
  const indexXml = await index.text();
  const landingFiles = [...indexXml.matchAll(/<loc>([^<]*\/sitemaps\/landing-\d+\.xml)<\/loc>/g)].map((match) => match[1]);
  if (!landingFiles.length) throw new Error('/sitemap.xml lists no landing-N.xml');
  // The index lists absolute URLs built from the site's public origin; a local run serves the
  // same files from its own base, so the origin is swapped for the base being checked.
  const first = new URL(new URL(landingFiles[0]).pathname, base).href;
  const file = await fetch(first, { headers: { accept: 'application/xml' } });
  if (!file.ok) throw new Error(`${first} answered ${file.status}`);
  const xml = await file.text();
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    let path;
    try { path = new URL(match[1]).pathname; } catch { continue; }
    const bare = path.replace(/^\/ar(?=\/)/, '');
    for (const shape of LANDING_SHAPES) {
      if (found.has(shape.kind) || !shape.re.test(bare)) continue;
      if (shape.kind === 'city' && /^\/explorer\/(search|not-a-real-city-check)\/$/.test(bare)) continue;
      found.set(shape.kind, path);
      break;
    }
  }
  const missing = LANDING_SHAPES.map((shape) => shape.kind).filter((kind) => !found.has(kind));
  if (missing.length) throw new Error(`no landing page of type(s) ${missing.join(', ')} in ${landingFiles[0]}`);
  return [...found.values()].flatMap((path) => [
    { path, status: 200, metadata: true },
    { path: `/ar${path}`, status: 200, metadata: true },
  ]);
}

try {
  pages.push(...(await discoverLandingPaths()));
} catch (error) {
  console.error(`landing page discovery failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
const agents = {
  browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  'OAI-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  PerplexityBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot',
  facebookexternalhit: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  WhatsApp: 'WhatsApp/2.23.20.0',
  'curl/8': 'curl/8.4.0',
};

const hasTitle = (html) => /<title[\s>]/i.test(html);
const hasCanonical = (html) => /<link\b[^>]*\brel=["']canonical["']/i.test(html);
const hasHreflang = (html) => /\bhreflang\s*=/i.test(html);
const h1Count = (html) => (html.match(/<h1(?:\s|>)/gi) || []).length;

const failures = [];
let checks = 0;

for (const page of pages) {
  for (const [name, userAgent] of Object.entries(agents)) {
    checks += 1;
    const label = `${page.path} [${name}]`;
    let res;
    try {
      res = await fetch(new URL(page.path, base), {
        headers: { 'user-agent': userAgent, accept: 'text/html' },
        redirect: 'follow',
      });
    } catch (error) {
      failures.push(`${label}: request failed: ${error instanceof Error ? error.message : error}`);
      continue;
    }
    const html = await res.text();
    if (res.status !== page.status) failures.push(`${label}: status ${res.status}, expected ${page.status}`);
    const h1 = h1Count(html);
    // A 404 document is not a landing page; only a 200 has to carry exactly one heading.
    if (page.status === 200 && h1 !== 1) failures.push(`${label}: ${h1} <h1> elements`);

    // A person's browser may stream metadata; it only has to get the right page and heading.
    if (name === 'browser') {
      if (res.status === page.status) console.log(`PASS ${label}: ${res.status}, ${h1} h1`);
      continue;
    }

    const headEnd = html.indexOf('</head>');
    if (headEnd < 0) {
      failures.push(`${label}: no </head>`);
      continue;
    }
    const head = html.slice(0, headEnd);
    const afterHead = html.slice(headEnd + '</head>'.length);
    if (!hasTitle(head)) failures.push(`${label}: no <title> in <head>`);
    if (page.metadata && !hasCanonical(head)) failures.push(`${label}: no rel="canonical" in <head>`);
    if (page.metadata && !hasHreflang(head)) failures.push(`${label}: no hreflang link in <head>`);
    if (hasTitle(afterHead)) failures.push(`${label}: <title> after </head>`);
    if (page.metadata && hasCanonical(afterHead)) failures.push(`${label}: rel="canonical" after </head>`);
    if (page.metadata && hasHreflang(afterHead)) failures.push(`${label}: hreflang after </head>`);
    if (res.status === page.status) console.log(`PASS ${label}: ${res.status}, head complete, ${h1} h1`);
  }
}

if (failures.length) {
  console.error(`\nFAILED ${failures.length}/${checks} checks:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\nPASS ${checks}/${checks} checks`);
