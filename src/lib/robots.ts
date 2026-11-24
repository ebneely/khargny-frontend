import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { isPreviewDeployment } from '@/lib/seo-environment';

/**
 * AI crawlers that train models on what they read. Being in the models helps the place data
 * spread, so these are allowed by default. To switch every training crawler off, set this to [].
 */
export const AI_TRAINING_BOTS: string[] = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
];

/** Search engines and AI search/answer bots whose crawls can bring a visitor or a citation. */
export const SEARCH_AND_AI_ANSWER_BOTS: string[] = [
  'Googlebot',
  'Bingbot',
  'Applebot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
];

/** Scrapers that give nothing back: no search result, no answer, no citation. */
export const BLOCKED_SCRAPERS: string[] = ['Diffbot', 'omgili', 'Bytespider'];

/**
 * Private pages, listed in both languages because /saved and /ar/saved are different prefixes to a
 * crawler. /api/ is not a page, but the IndexNow key file under it must stay fetchable. Query
 * strings are not disallowed: a blocked page cannot show its noindex, so the proxy sends
 * `X-Robots-Tag: noindex, follow` on GET pages with a search/filter query instead.
 */
export const DISALLOWED_PATHS: string[] = [
  '/api/',
  '/saved',
  '/ar/saved',
  '/settings',
  '/ar/settings',
  '/plan',
  '/ar/plan',
  '/trips/me',
  '/ar/trips/me',
  '/trips/cash',
  '/ar/trips/cash',
  '/trips/qr',
  '/ar/trips/qr',
  '/trips/sign-in',
  '/ar/trips/sign-in',
];

/** `/api/` stays closed, except the IndexNow key file Bing must fetch. */
export const ALLOWED_API_PATHS: string[] = ['/api/indexnow/'];

type Rule = {
  userAgent: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
};

function openRule(userAgent: string | string[]): Rule {
  return { userAgent, allow: ['/', ...ALLOWED_API_PATHS], disallow: DISALLOWED_PATHS };
}

/**
 * The whole policy as data, so the text builder and its tests need no deployment environment.
 * Order is meaningful only for the reader: `*` first, then the named search/answer bots, then the
 * training bots, and finally the scrapers that are refused everywhere.
 */
export function buildRobots({
  siteUrl = SITE_URL,
  trainingBots = AI_TRAINING_BOTS,
}: {
  siteUrl?: string;
  trainingBots?: string[];
} = {}): MetadataRoute.Robots {
  const rules: Rule[] = [
    openRule('*'),
    openRule(SEARCH_AND_AI_ANSWER_BOTS),
    ...(trainingBots.length ? [openRule(trainingBots)] : []),
    ...BLOCKED_SCRAPERS.map((userAgent) => ({ userAgent, disallow: '/' })),
  ];

  return {
    rules,
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

export default function robots(): MetadataRoute.Robots {
  if (isPreviewDeployment()) return { rules: { userAgent: '*', disallow: '/' } };
  return buildRobots();
}
