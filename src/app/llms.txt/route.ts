import { SITE_URL } from '@/lib/config';
import { buildLlmsTxt, llmsInputFromContent } from '@/lib/llms';
import { loadSeoContent, SEO_REVALIDATE_SECONDS } from '@/lib/seo-content';

export const dynamic = 'force-dynamic';

/** /llms.txt: what 5argny is, its cities and categories, for AI assistants. */
export async function GET(): Promise<Response> {
  try {
    const content = await loadSeoContent();
    const text = buildLlmsTxt(llmsInputFromContent({ siteUrl: SITE_URL, ...content }));
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': `public, s-maxage=${SEO_REVALIDATE_SECONDS}, stale-while-revalidate=3600`,
      },
    });
  } catch {
    return new Response('Place data temporarily unavailable. Try again shortly.\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '300' },
    });
  }
}
