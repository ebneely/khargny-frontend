import { dark, light } from '@5argny/core/tokens';
import type { Locale } from '@/i18n/dictionaries';

/**
 * The proxy rewrites an unknown place here. This is a route handler, not a page calling
 * notFound(): Next 16 renders the app's not-found boundary outside the site providers and falls
 * back to the global error shell, which has no <h1> and no site UI. A handler can return the
 * real 404 status and a complete, styled document reliably.
 *
 * A noindex page carries no canonical or hreflang links. The palette is the site's own token
 * set, with a prefers-color-scheme dark variant.
 */
export async function GET(request: Request): Promise<Response> {
  const locale: Locale = request.headers.get('x-khargny-locale') === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';
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
<meta name="color-scheme" content="light dark">
<title>${title}</title>
<meta name="robots" content="noindex, follow">
<style>
:root {
  --bg: ${light.bg}; --card: ${light.card}; --ink: ${light.ink}; --ink2: ${light.ink2};
  --line: ${light.line}; --accent: ${light.accent}; --accent-ink: ${light.accentInk};
  --sh1: ${light.sh1};
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: ${dark.bg}; --card: ${dark.card}; --ink: ${dark.ink}; --ink2: ${dark.ink2};
    --line: ${dark.line}; --accent: ${dark.accent}; --accent-ink: ${dark.accentInk};
    --sh1: ${dark.sh1};
  }
}
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font-family: system-ui, -apple-system, "Segoe UI", "IBM Plex Sans Arabic", sans-serif; }
header { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; border-bottom:1px solid var(--line); background:var(--card); }
header a { text-decoration:none; }
.brand { color:var(--accent); font-size:1.35rem; font-weight:700; }
nav a { color:var(--ink2); font-size:1rem; }
main { max-width:42rem; margin:0 auto; padding:4.5rem 1.5rem; text-align:center; }
h1 { font-size:2rem; line-height:1.25; margin:0 0 .5rem; }
p { color:var(--ink2); line-height:1.6; margin:0 0 1.75rem; }
a.back { display:inline-flex; align-items:center; min-height:44px; padding:0 20px; border-radius:999px; background:var(--accent); color:var(--accent-ink); font-weight:600; text-decoration:none; box-shadow:var(--sh1); }
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
