import { SITE_URL } from '@/lib/config';
import { urlFor } from '@/lib/site-url';
import type { Locale } from '@/i18n/dictionaries';

/**
 * The proxy rewrites an unknown place here. This is a route handler, not a page calling
 * notFound(): Next 16 renders the app's not-found boundary outside the site providers and falls
 * back to the global error shell, which has no <h1> and no site UI. A handler can return the
 * real 404 status and a complete, styled document reliably.
 */
export async function GET(request: Request): Promise<Response> {
  const locale: Locale = request.headers.get('x-khargny-locale') === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';
  const canonical = urlFor('/explorer', locale);
  const english = urlFor('/explorer', 'en');
  const arabic = urlFor('/explorer', 'ar');
  const title = isAr ? 'المكان ده مش موجود | خرجني' : 'Place not found | 5argny';
  const heading = isAr ? 'المكان ده مش موجود' : 'Place not found';
  const body = isAr
    ? 'المكان ده مش متاح — يمكن اتشال، أو اللينك قديم.'
    : "This place isn't available — it may have been removed, or the link is from an older URL.";
  const back = isAr ? 'ارجع للأماكن' : 'Back to places';
  const explore = isAr ? 'استكشف' : 'Explore';
  const home = isAr ? 'خرجني' : '5argny';
  const prefix = isAr ? '/ar' : '';

  const html = `<!doctype html>
<html lang="${locale}" dir="${isAr ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hrefLang="en" href="${english}">
<link rel="alternate" hrefLang="ar" href="${arabic}">
<link rel="alternate" hrefLang="x-default" href="${english}">
<style>
:root { --brand-700:#0f766e; --surface-app:#f8faf9; --surface-card:#fff; --gray-200:#e5e7eb; --text-primary:#17211f; --text-secondary:#4b5563; }
* { box-sizing: border-box; }
body { margin:0; background:var(--surface-app); color:var(--text-primary); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
header { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; border-bottom:1px solid var(--gray-200); background:var(--surface-card); }
header a { text-decoration:none; }
.brand { color:var(--brand-700); font-size:1.35rem; font-weight:700; }
nav a { color:var(--text-secondary); font-size:1rem; }
main { max-width:42rem; margin:0 auto; padding:4.5rem 1.5rem; text-align:center; }
h1 { font-size:2rem; line-height:1.25; margin:0 0 .5rem; }
p { color:var(--text-secondary); line-height:1.6; margin:0 0 1.75rem; }
a.back { display:inline-flex; align-items:center; min-height:44px; padding:0 20px; border-radius:999px; background:var(--brand-700); color:#fff; font-weight:600; text-decoration:none; }
</style>
</head>
<body>
<header><a class="brand" href="${prefix}/">${home}</a><nav><a href="${prefix}/explorer/">${explore}</a></nav></header>
<main><h1>${heading}</h1><p>${body}</p><a class="back" href="${prefix}/explorer/">${back}</a></main>
</body>
</html>`;

  return new Response(html, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex, follow',
      'cache-control': 'no-store',
    },
  });
}
