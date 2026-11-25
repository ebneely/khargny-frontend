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
];
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
    if (h1 !== 1) failures.push(`${label}: ${h1} <h1> elements`);

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
