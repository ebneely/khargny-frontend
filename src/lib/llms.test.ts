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

const input = (full: boolean) =>
  llmsInputFromContent({ siteUrl: 'https://example.test', cities: CITIES, categories: CATEGORIES, places: PLACES, full });

describe('llms.txt', () => {
  it('names all three brand spellings and says what the site is', () => {
    const text = buildLlmsTxt(input(false));
    expect(text.startsWith('# 5argny / خرجني / Khargny')).toBe(true);
    expect(text).toMatch(/^> 5argny/m);
    expect(text).toContain('Egyptian guide');
    expect(text).toContain('https://example.test/llms-full.txt');
  });

  it('lists cities and categories with real place counts', () => {
    const text = buildLlmsTxt(input(false));
    expect(text).toContain('Cairo (القاهرة) — 2 places');
    expect(text).toContain('Cafes (مقاهي) — 1 place');
    expect(text).toContain('Restaurants (مطاعم) — 1 place');
  });

  it('leaves the place list to llms-full.txt', () => {
    const text = buildLlmsTxt(input(false));
    expect(text).not.toContain('https://example.test/explorer/cairo/zooba/');
    expect(text).not.toContain('## Places');
  });
});

describe('llms-full.txt', () => {
  it('links every place page in English and Arabic', () => {
    const text = buildLlmsTxt(input(true));
    expect(text).toContain('## Places');
    expect(text).toContain('[Zooba](https://example.test/explorer/cairo/zooba/)');
    expect(text).toContain('[زوبا](https://example.test/ar/explorer/cairo/zooba/)');
    expect(text).toContain('[Sequoia](https://example.test/explorer/cairo/sequoia/)');
  });

  it('carries each place description and links back to llms.txt', () => {
    const text = buildLlmsTxt(input(true));
    expect(text).toContain('Egyptian street food.');
    expect(text).toContain('https://example.test/llms.txt');
  });
});

describe('plainText', () => {
  it('strips tags and decodes entities', () => {
    expect(plainText('<p>A &amp; B</p>')).toBe('A & B');
  });
});

describe('empty data', () => {
  it('still produces a valid file', () => {
    const text = buildLlmsTxt({ siteUrl: 'https://example.test', cities: [], categories: [], places: [], full: true });
    expect(text.startsWith('# 5argny')).toBe(true);
    expect(text).toContain('No places are listed right now.');
  });
});
