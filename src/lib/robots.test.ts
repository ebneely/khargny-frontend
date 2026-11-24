import { describe, expect, it } from 'vitest';
import {
  AI_TRAINING_BOTS,
  ALLOWED_API_PATHS,
  BLOCKED_SCRAPERS,
  DISALLOWED_PATHS,
  SEARCH_AND_AI_ANSWER_BOTS,
  buildRobots,
} from './robots';
import { robotsText } from './crawler-responses';

const agents = (rule: { userAgent?: string | string[] }): string[] =>
  [rule.userAgent ?? []].flat() as string[];

describe('robots policy', () => {
  const robots = buildRobots({ siteUrl: 'https://example.test' });
  const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];

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
    const search = rules.find((rule) => agents(rule).includes('Googlebot'));
    expect(search).toBeDefined();
    expect(agents(search!)).toEqual(expect.arrayContaining([
      'Googlebot', 'Bingbot', 'Applebot', 'OAI-SearchBot', 'ChatGPT-User',
      'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User',
    ]));
    expect(search?.allow).toEqual(expect.arrayContaining(['/', '/api/indexnow/']));
  });

  it('allows the AI training bots, in one exported list', () => {
    expect(AI_TRAINING_BOTS).toEqual(['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot']);
    const training = rules.find((rule) => agents(rule).includes('GPTBot'));
    expect(training).toBeDefined();
    expect(agents(training!)).toEqual(expect.arrayContaining([...AI_TRAINING_BOTS]));
    expect(training?.allow).toEqual(expect.arrayContaining(['/', '/api/indexnow/']));
  });

  it('switches every training bot off with an empty list', () => {
    const closed = buildRobots({ trainingBots: [] });
    const closedRules = Array.isArray(closed.rules) ? closed.rules : [closed.rules];
    expect(closedRules.some((rule) => agents(rule).includes('GPTBot'))).toBe(false);
    expect(closedRules.some((rule) => agents(rule).includes('ClaudeBot'))).toBe(false);
  });

  it('refuses the scrapers that give nothing back', () => {
    for (const bot of BLOCKED_SCRAPERS) {
      const rule = rules.find((item) => agents(item).includes(bot));
      expect(rule).toBeDefined();
      expect(rule).toMatchObject({ disallow: '/' });
    }
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
    expect(SEARCH_AND_AI_ANSWER_BOTS).not.toContain('GPTBot');
    expect(SEARCH_AND_AI_ANSWER_BOTS).not.toContain('CCBot');
  });
});
