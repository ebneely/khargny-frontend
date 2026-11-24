#!/usr/bin/env node
/**
 * Verify that crawlers (and browsers) get title, canonical and hreflang inside <head>, and that
 * every checked page has exactly one <h1>.
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
  { path: '/', status: 200 },
  { path: '/ar/', status: 200 },
  { path: '/explorer/', status: 200 },
  { path: placePath, status: 200 },
  { path: `/ar${placePath}`, status: 200 },
  { path: '/explorer/matrouh/definitely-not-a-place-check/', status: 404 },
];
const agents = {
  browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
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
    const headEnd = html.indexOf('</head>');
    if (headEnd < 0) {
      failures.push(`${label}: no </head>`);
      continue;
    }
    const head = html.slice(0, headEnd);
    const afterHead = html.slice(headEnd + '</head>'.length);
    if (!hasTitle(head)) failures.push(`${label}: no <title> in <head>`);
    if (!hasCanonical(head)) failures.push(`${label}: no rel="canonical" in <head>`);
    if (!hasHreflang(head)) failures.push(`${label}: no hreflang link in <head>`);
    if (hasTitle(afterHead)) failures.push(`${label}: <title> after </head>`);
    if (hasCanonical(afterHead)) failures.push(`${label}: rel="canonical" after </head>`);
    if (hasHreflang(afterHead)) failures.push(`${label}: hreflang after </head>`);
    const h1 = h1Count(html);
    if (h1 !== 1) failures.push(`${label}: ${h1} <h1> elements`);
    if (res.status === page.status) console.log(`PASS ${label}: ${res.status}, head complete, ${h1} h1`);
  }
}

if (failures.length) {
  console.error(`\nFAILED ${failures.length}/${checks} checks:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\nPASS ${checks}/${checks} checks`);
