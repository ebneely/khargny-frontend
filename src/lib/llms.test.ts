import { describe, expect, it } from 'vitest';
import { buildLlmsTxt, llmsInputFromContent, plainText } from './llms';
import type { SeoCategory, SeoCity, SeoPlace } from './seo-content';

const CITIES: SeoCity[] = [
  { id: 'cairo', slug: 'cairo', name: 'القاهرة', nameEn: 'Cairo' },
  { id: 'giza', slug: 'giza', name: 'الجيزة', nameEn: 'Giza' },
];

const CATEGORIES: SeoCategory[] = [
  { id: 'cafes', slug: 'cafes', nameAr: 'مقاهي', nameEn: 'Cafes' },
  { id: 'food', slug: 'food', nameAr: 'مطاعم', nameEn: 'Restaurants' },
];

const PLACES: SeoPlace[] = [
  {
    slug: 'zooba', cityId: 'cairo', categoryId: 'cafes',
    name: 'زوبا', nameEn: 'Zooba', descriptionEn: 'Egyptian street food.', description: 'أكل مصري.',
  },
  {
    slug: 'sequoia', cityId: 'cairo', categoryId: 'food',
    name: 'سيكويا', nameEn: 'Sequoia', descriptionEn: 'Nile-side dining.',
  },
];

const input = () =>
  llmsInputFromContent({ siteUrl: 'https://example.test', cities: CITIES, categories: CATEGORIES, places: PLACES });

describe('llms.txt', () => {
  it('names all three brand spellings and says what the site is', () => {
    const text = buildLlmsTxt(input());
    expect(text.startsWith('# 5argny / خرجني / Khargny')).toBe(true);
    expect(text).toMatch(/^> 5argny/m);
    expect(text).toContain('Egyptian guide');
    expect(text).toContain('https://example.test/sitemap.xml');
  });

  it('lists cities and categories with real place counts', () => {
    const text = buildLlmsTxt(input());
    expect(text).toContain('Cairo (القاهرة) — 2 places');
    expect(text).toContain('Cafes (مقاهي) — 1 place');
    expect(text).toContain('Restaurants (مطاعم) — 1 place');
  });

  it('carries no place list and no llms-full.txt: the catalogue is not handed out', () => {
    const text = buildLlmsTxt(input());
    expect(text).not.toContain('https://example.test/explorer/cairo/zooba/');
    expect(text).not.toContain('## Places');
    expect(text).not.toContain('llms-full');
    expect(text).not.toContain('Egyptian street food.');
  });
});

describe('plainText', () => {
  it('strips tags and decodes entities', () => {
    expect(plainText('<p>A &amp; B</p>')).toBe('A & B');
  });
});

describe('empty data', () => {
  it('still produces a valid file', () => {
    const text = buildLlmsTxt({ siteUrl: 'https://example.test', cities: [], categories: [] });
    expect(text.startsWith('# 5argny')).toBe(true);
    expect(text).toContain('No cities are listed right now.');
  });
});
