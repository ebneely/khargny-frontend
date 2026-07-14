/**
 * Legacy explorer client API — kept only so the pre-existing prototype explorer
 * components (src/components/home/ContactSection/*) keep compiling after the
 * GraphQL layer was removed (Phase 0c). The old GraphQL backend cached raw
 * Google Places data (photos, opening_hours, reviews, ...) which has no
 * equivalent in the real REST contract (khargny-obsidian/Modules/places,
 * cities, categories, search) — that data was never real. A full rebuild of
 * this surface against the REST hooks in src/lib/api/hooks/* is a later
 * implement phase, not this one (Phase 0c only removes the dead GraphQL
 * wiring and stands up the REST client).
 *
 * `getCityNamesSimple` is wired to the real GET /v1/cities endpoint since the
 * shapes align (a list of city names). `getPlaceDetailsSimple` has no REST
 * equivalent today (it expected raw Google Places fields) so it returns an
 * empty list rather than fabricating data. `contact.submit` has no REST
 * contact endpoint in scope for this module set, so it is a stub.
 */
import { apiRequest } from '@/lib/api/client';
import type { CityWithAreas } from '@/lib/api/types';

export const clientApi = {
  places: {
    /** Backed by the real GET /v1/cities endpoint. */
    getCityNamesSimple: async (): Promise<string[]> => {
      try {
        const cities = await apiRequest<CityWithAreas[]>('GET', '/v1/cities');
        return cities.map((city) => city.name);
      } catch (error) {
        console.error('Error fetching city names:', error);
        return [];
      }
    },

    /**
     * No REST equivalent exists for the old Google-Places-shaped payload this
     * used to return. Returns an empty list until the explorer surface is
     * rebuilt against the real Place/PlaceDetail contract.
     */
    getPlaceDetailsSimple: async (_city: string): Promise<any[]> => {
      return [];
    },
  },

  contact: {
    /**
     * No REST contact endpoint exists in the modules this app owns
     * (cities/categories/places/search). Stubbed until one is specced.
     */
    submit: async (_data: {
      name: string;
      email: string;
      message: string;
      subject?: string;
    }): Promise<{ id: string; createdAt: string }> => {
      console.warn('clientApi.contact.submit: no REST contact endpoint wired yet — no-op.');
      return { id: `temp-${Date.now()}`, createdAt: new Date().toISOString() };
    },
  },
};

export default clientApi;
