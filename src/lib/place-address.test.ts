import { describe, expect, it } from 'vitest';
import { PLACE_REDIRECT_STATUS, placeRedirect, placeSegments } from './place-address';

describe('a place address is decided on the server', () => {
  it('keeps a current address untouched', () => {
    expect(placeRedirect(
      { citySlug: 'cairo', placeSlug: 'zooba', locale: 'en' },
      { slug: 'zooba', citySlug: 'cairo' },
    )).toBeNull();
  });

  it('moves an old English slug to the current page in one permanent hop', () => {
    const target = placeRedirect(
      { citySlug: 'cairo', placeSlug: 'zooba-old', locale: 'en' },
      { slug: 'zooba', citySlug: 'cairo' },
    );
    expect(target).toBe('/explorer/cairo/zooba/');
    expect(PLACE_REDIRECT_STATUS).toBe(301);
  });

  it('keeps Arabic under /ar and the query string', () => {
    expect(placeRedirect(
      { citySlug: 'cairo', placeSlug: 'zooba-old', locale: 'ar', search: '?q=coffee' },
      { slug: 'zooba', citySlug: 'cairo' },
    )).toBe('/ar/explorer/cairo/zooba/?q=coffee');
    expect(placeRedirect(
      { citySlug: 'cairo', placeSlug: 'zooba-old', locale: 'en', search: 'q=coffee' },
      { slug: 'zooba', citySlug: 'cairo' },
    )).toBe('/explorer/cairo/zooba/?q=coffee');
  });

  it('moves a place that changed city', () => {
    expect(placeRedirect(
      { citySlug: 'cairo', placeSlug: 'zooba', locale: 'en' },
      { slug: 'zooba', citySlug: 'giza' },
    )).toBe('/explorer/giza/zooba/');
  });

  it('recognises exactly the two place segments', () => {
    expect(placeSegments('/explorer/cairo/zooba/')).toEqual({ citySlug: 'cairo', placeSlug: 'zooba' });
    expect(placeSegments('/explorer/cairo/zooba')).toEqual({ citySlug: 'cairo', placeSlug: 'zooba' });
    expect(placeSegments('/explorer/cairo/zooba/correct/')).toBeNull();
    expect(placeSegments('/explorer/cairo/')).toBeNull();
    expect(placeSegments('/saved/')).toBeNull();
  });
});
