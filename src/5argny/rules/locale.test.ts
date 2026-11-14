import { describe, expect, it } from 'vitest';
import { bare, hreflangFor, langOf, pathIn, redirectFor, switchTo } from './locale.ts';

describe('locale: the language comes from the URL only', () => {
  it('a plain path is English and a path under /ar is Arabic', () => {
    expect(langOf('/')).toBe('en');
    expect(langOf('/explorer/')).toBe('en');
    expect(langOf('/explorer/cairo/zooba/')).toBe('en');
    expect(langOf('/ar')).toBe('ar');
    expect(langOf('/ar/')).toBe('ar');
    expect(langOf('/ar/explorer/cairo/zooba/')).toBe('ar');
    expect(langOf('/area/')).toBe('en'); // a path that only starts with the letters "ar" is not Arabic
    expect(langOf('/arabic-food/')).toBe('en');
  });

  it('builds each page path in each language with the trailing slash the site serves', () => {
    expect(pathIn('/', 'en')).toBe('/');
    expect(pathIn('', 'ar')).toBe('/ar/');
    expect(pathIn('/explorer', 'en')).toBe('/explorer/');
    expect(pathIn('/explorer/cairo/zooba', 'ar')).toBe('/ar/explorer/cairo/zooba/');
    expect(pathIn('/ar/c/date-night/', 'en')).toBe('/c/date-night/');
    expect(pathIn('/en/saved/?tab=collections', 'en')).toBe('/saved/');
    expect(bare('/ar')).toBe('/');
  });

  it('every old /en URL lands on the plain URL in one 308, keeping the query', () => {
    expect(redirectFor('/en', '')).toBe('/');
    expect(redirectFor('/en/', '')).toBe('/');
    expect(redirectFor('/en/explorer/', '?q=cafe')).toBe('/explorer/?q=cafe');
    expect(redirectFor('/en/explorer/cairo/zooba/', '')).toBe('/explorer/cairo/zooba/');
    expect(redirectFor('/en/c/date-night/', '?x=1&y=2')).toBe('/c/date-night/?x=1&y=2');
  });

  it('old redesign addresses land on the new URL in the same hop, never a chain', () => {
    expect(redirectFor('/explorer/cairo/', '')).toBe('/explorer/?city=cairo');
    expect(redirectFor('/en/explorer/cairo/', '?category=cafes')).toBe('/explorer/?city=cairo&cat=cafes');
    expect(redirectFor('/ar/explorer/cairo/', '?q=koshary')).toBe('/ar/explorer/?city=cairo&q=koshary');
    expect(redirectFor('/plan/', '')).toBe('/saved/');
    expect(redirectFor('/en/plan/', '')).toBe('/saved/');
    expect(redirectFor('/ar/plan/', '')).toBe('/ar/saved/');
    expect(redirectFor('/en/trips/listers/abc/', '')).toBe('/host/abc/');
    expect(redirectFor('/ar/trips/listers/abc/', '')).toBe('/ar/host/abc/');
    // and no target is itself redirected again
    for (const [p, q] of [['/en/explorer/cairo/', ''], ['/en/plan/', ''], ['/en/', ''], ['/ar/plan/', ''], ['/explorer/cairo/', '?q=a']]) {
      const to = new URL(redirectFor(p, q)!, 'https://x');
      expect(redirectFor(to.pathname, to.search)).toBeNull();
    }
  });

  it('current English and Arabic URLs are served, not redirected', () => {
    for (const p of ['/', '/explorer/', '/explorer/cairo/zooba/', '/saved/', '/ar/', '/ar/explorer/', '/ar/explorer/cairo/zooba/', '/ar/c/date-night/']) {
      expect(redirectFor(p, '?q=a')).toBeNull();
    }
  });

  it('the language switch goes to the same page under the other URL', () => {
    expect(switchTo('/')).toBe('/ar/');
    expect(switchTo('/ar/')).toBe('/');
    expect(switchTo('/ar')).toBe('/');
    expect(switchTo('/explorer/', '?q=cafe')).toBe('/ar/explorer/?q=cafe');
    expect(switchTo('/ar/explorer/cairo/zooba/')).toBe('/explorer/cairo/zooba/');
  });

  it('hreflang: en is the plain URL, ar is under /ar, x-default is plain English', () => {
    expect(hreflangFor('/explorer/cairo/zooba')).toEqual({ en: '/explorer/cairo/zooba/', ar: '/ar/explorer/cairo/zooba/', 'x-default': '/explorer/cairo/zooba/' });
    expect(hreflangFor('/')).toEqual({ en: '/', ar: '/ar/', 'x-default': '/' });
  });
});
