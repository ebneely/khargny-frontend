import { describe, expect, it } from 'vitest';
import {
  AI_TRAINING_BOTS,
  ALLOWED_API_PATHS,
  DISALLOWED_PATHS,
  SEARCH_AND_AI_ANSWER_BOTS,
  SEO_DATA_BOTS,
  buildRobots,
} from './robots';
import { robotsText } from './crawler-responses';

const agents = (rule: { userAgent?: string | string[] }): string[] =>
  [rule.userAgent ?? []].flat() as string[];

describe('robots policy', () => {
  const robots = buildRobots({ siteUrl: 'https://example.test' });
  const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
  const ruleFor = (bot: string) => rules.find((rule) => agents(rule).includes(bot));

  it('opens the site to everyone and names the sitemap index', () => {
    expect(rules[0]).toMatchObject({ userAgent: '*', allow: ['/', '/api/indexnow/'] });
    expect(robots.sitemap).toBe('https://example.test/sitemap.xml');
  });

  it('withdraws the API and account pages, but allows the IndexNow key file', () => {
    for (const path of ['/api/', '/saved', '/ar/saved', '/settings', '/ar/settings']) {
      expect(DISALLOWED_PATHS).toContain(path);
    }
    expect(DISALLOWED_PATHS).not.toContain('/*?*');
    expect(ALLOWED_API_PATHS).toEqual(['/api/indexnow/']);
    expect(rules[0].allow).toEqual(expect.arrayContaining(['/', '/api/indexnow/']));
    expect(rules[0].disallow).toEqual(expect.arrayContaining(['/api/', '/saved', '/settings']));
    expect(rules[0].disallow).not.toContain('/*?*');
  });

  it('gives search and AI answer engines their own open group', () => {
    const search = ruleFor('Googlebot');
    expect(search).toBeDefined();
    expect(agents(search!)).toEqual(expect.arrayContaining([
      'Googlebot', 'Bingbot', 'Applebot', 'PetalBot', 'YandexBot', 'DuckDuckBot',
      'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User',
    ]));
    expect(search?.allow).toEqual(expect.arrayContaining(['/', '/api/indexnow/']));
    expect(search?.disallow).not.toContain('/');
  });

  it('refuses every AI training crawler', () => {
    for (const bot of ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'Claude-Web', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'meta-externalagent', 'cohere-ai', 'Amazonbot', 'Diffbot', 'omgili']) {
      expect(AI_TRAINING_BOTS).toContain(bot);
      expect(ruleFor(bot), bot).toMatchObject({ disallow: '/' });
      expect(ruleFor(bot)?.allow).toBeUndefined();
    }
  });

  it('refuses the SEO-data crawlers', () => {
    for (const bot of ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'BLEXBot', 'DataForSeoBot']) {
      expect(SEO_DATA_BOTS).toContain(bot);
      expect(ruleFor(bot), bot).toMatchObject({ disallow: '/' });
    }
  });

  it('lets every training crawler back in with an empty list (one switch)', () => {
    const open = buildRobots({ trainingBots: [] });
    const openRules = Array.isArray(open.rules) ? open.rules : [open.rules];
    expect(openRules.some((rule) => agents(rule).includes('GPTBot'))).toBe(false);
    expect(openRules.some((rule) => agents(rule).includes('CCBot'))).toBe(false);
    // The SEO-data list is its own switch and stays closed.
    expect(openRules.some((rule) => agents(rule).includes('AhrefsBot'))).toBe(true);
  });

  it('never emits a Content-Signal line, and keeps the IndexNow key file allowed', () => {
    const text = robotsText(robots);
    expect(text).not.toMatch(/Content-Signal/i);
    expect(text).toContain('Allow: /api/indexnow/');
    expect(text).toContain('Disallow: /api/');
    expect(text).not.toContain('/*?*');
    expect(text).toContain('Sitemap: https://example.test/sitemap.xml');
  });

  it('keeps training-only crawlers out of the search/answer list', () => {
    for (const bot of ['GPTBot', 'CCBot', 'Google-Extended', 'ClaudeBot', 'AhrefsBot']) {
      expect(SEARCH_AND_AI_ANSWER_BOTS).not.toContain(bot);
    }
    // Applebot stays allowed; its training-only sibling does not.
    expect(SEARCH_AND_AI_ANSWER_BOTS).toContain('Applebot');
    expect(SEARCH_AND_AI_ANSWER_BOTS).not.toContain('Applebot-Extended');
  });
});
