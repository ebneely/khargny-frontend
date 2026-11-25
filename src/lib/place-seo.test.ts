import { describe, expect, it } from 'vitest';
import {
  aboutParagraph,
  buildPlaceFacts,
  CATEGORY_PROFILES,
  featureWords,
  hoursSummary,
  intentWords,
  otherNameLine,
  photoAlt,
  placeDescription,
  placeQuestions,
  placeTitle,
  schemaTypeFor,
  type PlaceSeoFacts,
} from './place-seo';

const week = (opens: string, closes: string, closed: number[] = []) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    dayOfWeek: day,
    openTime: closed.includes(day) ? null : opens,
    closeTime: closed.includes(day) ? null : closes,
    isClosed: closed.includes(day),
  }));

const base = (over: Partial<PlaceSeoFacts> = {}): PlaceSeoFacts => ({
  name: 'Restaurant El-Kababgy Luxor',
  nameOther: 'مطعم الكبابجي الأقصر',
  categorySlug: 'restaurants',
  categoryName: 'Restaurants',
  area: 'Luxor East Bank',
  city: 'Luxor',
  address: null,
  phone: '01003396632',
  website: null,
  instagram: null,
  facebook: null,
  mapsUrl: null,
  priceRange: null,
  hours: week('11:00', '00:00'),
  amenities: ['Outdoor Seating', 'Free Parking', 'Takeaway', 'Wi-Fi', 'Accepts Reservations'],
  amenityKeys: ['Outdoor Seating', 'Free Parking', 'Takeaway', 'Wi-Fi', 'Accepts Reservations'],
  tags: [],
  hasMenu: false,
  menuHighlights: [],
  imageCount: 5,
  viewCount: 101,
  likeCount: 0,
  url: 'https://www.5argny.com/explorer/luxor/restaurant-el-kababgy-luxor/',
  ...over,
});

describe('place titles', () => {
  it('leads with the name and the area, then only the words the data supports', () => {
    const title = placeTitle(base(), 'en');
    // The area is too long to keep both fact words and the brand, so the city keeps all three.
    expect(title.startsWith('Restaurant El-Kababgy Luxor,')).toBe(true);
    expect(title).toContain('hours');
    expect(title).toContain('photos');
    expect(title.endsWith('| 5argny')).toBe(true);
    // no menu rows, no price band: neither word may appear
    expect(title).not.toContain('menu');
    expect(title).not.toContain('prices');
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it('uses the area when it fits', () => {
    const title = placeTitle(base({ name: 'Zed', area: 'Zamalek', city: 'Cairo' }), 'en');
    expect(title).toBe('Zed, Zamalek: hours & photos | 5argny');
  });

  it('adds menu and prices only when the place really has them, and keeps the brand when it fits', () => {
    const title = placeTitle(base({ hasMenu: true, priceRange: '100 – 500 EGP' }), 'en');
    expect(title).toContain('menu');
    expect(title).toContain('prices');
    expect(title.length).toBeLessThanOrEqual(60);

    const short = placeTitle(base({ name: 'Zed', area: 'Zamalek', city: 'Cairo' }), 'en');
    expect(short).toBe('Zed, Zamalek: hours & photos | 5argny');
  });

  it('drops words instead of cutting them when the name is long', () => {
    const title = placeTitle(base({ name: 'San Stefano Grand Plaza Four Seasons Alexandria Apartments' }), 'en');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.startsWith('San Stefano Grand Plaza')).toBe(true);
  });

  it('never repeats the category word (it is what the page is, not what it is called)', () => {
    for (const slug of Object.keys(CATEGORY_PROFILES)) {
      const title = placeTitle(base({ categorySlug: slug, categoryName: 'Restaurants' }), 'en');
      expect(title.toLowerCase()).not.toContain('restaurants —');
      expect(title.length).toBeLessThanOrEqual(60);
    }
  });

  it('gives venues hours, location and photos, and stays contact instead of hours', () => {
    const cinema = base({
      name: 'Point 90 Cinema', categorySlug: 'cinemas', categoryName: 'Cinemas',
      area: 'New Cairo', city: 'Cairo', hours: [], amenities: [], imageCount: 3,
    });
    const cinemaTitle = placeTitle(cinema, 'en');
    expect(cinemaTitle).not.toContain('hours');
    expect(cinemaTitle).toContain('location');
    expect(cinemaTitle).toContain('photos');

    const hotel = base({ name: 'Movenpick Resort Aswan', categorySlug: 'hotels', categoryName: 'Hotels & Resorts', area: 'Aswan', city: 'Aswan' });
    expect(intentWords(hotel, 'en')).toEqual(['location', 'photos', 'contact']);
  });

  it('writes the Arabic title in Arabic, with the Arabic brand', () => {
    const title = placeTitle(base({ name: 'مطعم الكبابجي الأقصر', area: 'الأقصر', city: 'الأقصر' }), 'ar');
    expect(title).toContain('مواعيد العمل');
    expect(title).toContain('الصور');
    expect(title).toContain('خرجني');
    expect(title).not.toMatch(/[A-Za-z]{4,}/);
    expect(title.length).toBeLessThanOrEqual(60);
  });
});

describe('place descriptions', () => {
  it('is built from facts: category, area, hours, features', () => {
    const description = placeDescription(base(), 'en');
    expect(description).toContain('is a restaurant in Luxor East Bank, Luxor');
    expect(description).toContain('11 am');
    expect(description).toContain('12 am');
    expect(description).not.toContain('Address, opening hours, photos and directions on Khargny.');
    expect(description.length).toBeGreaterThanOrEqual(70);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('differs between places, and never claims a menu or a price it does not have', () => {
    const a = placeDescription(base(), 'en');
    const b = placeDescription(base({ name: 'Another Place', viewCount: 3, imageCount: 0 }), 'en');
    expect(a).not.toBe(b);
    expect(a.toLowerCase()).not.toContain('menu');
    expect(a.toLowerCase()).not.toContain('price');
  });

  it('stays inside 70–160 characters on a place with almost no data', () => {
    const bare = base({
      name: 'Zed', categorySlug: 'shops', categoryName: 'Shops', area: '', city: 'Cairo',
      hours: [], amenities: [], imageCount: 0, phone: null, address: null,
    });
    const description = placeDescription(bare, 'en');
    expect(description.length).toBeGreaterThanOrEqual(70);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('writes Arabic, not a translation of the English template', () => {
    const description = placeDescription(base({ name: 'مطعم الكبابجي الأقصر', area: 'الأقصر', city: 'الأقصر' }), 'ar');
    expect(description).toContain('مطعم');
    expect(description).toContain('يفتح يوميًا');
    expect(description).not.toContain(' is ');
    expect(description.length).toBeLessThanOrEqual(160);
  });
});

describe('hours in words', () => {
  it('collapses a week that is the same every day into daily', () => {
    expect(hoursSummary(week('11:00', '00:00'), 'en')?.sentence).toBe('It opens daily from 11 am to 12 am.');
    expect(hoursSummary(week('11:00', '00:00'), 'ar')?.sentence).toContain('يفتح يوميًا');
    expect(hoursSummary(week('11:00', '00:00'), 'ar')?.sentence).toContain('منتصف الليل');
  });

  it('names the days when the week differs, and says which day is closed', () => {
    const hours = [
      ...week('09:00', '18:00', [4]),
      { dayOfWeek: 4, openTime: '14:00', closeTime: '23:00', isClosed: false },
    ];
    const summary = hoursSummary(hours, 'en');
    expect(summary?.sentence).toContain('Fri');
    expect(summary?.openDays).toBe(7);
  });

  it('is null without usable hours', () => {
    expect(hoursSummary([], 'en')).toBeNull();
    expect(hoursSummary(week('11:00', '00:00', [0, 1, 2, 3, 4, 5, 6]), 'en')).toBeNull();
    expect(hoursSummary(undefined, 'ar')).toBeNull();
  });
});

describe('schema types', () => {
  it('maps every category we actually store to a specific type', () => {
    const expected: Record<string, string> = {
      restaurants: 'Restaurant', cafes: 'CafeOrCoffeeShop', bars: 'BarOrPub', clubs: 'NightClub',
      cinemas: 'MovieTheater', malls: 'ShoppingCenter', shops: 'ShoppingCenter', hotels: 'Hotel',
      museums: 'Museum', attractions: 'TouristAttraction', landmarks: 'TouristAttraction',
      parks: 'Park', beaches: 'Beach', entertainment: 'AmusementPark',
      sports: 'SportsActivityLocation', libraries: 'Library', spas: 'DaySpa', bakeries: 'Bakery',
      mtam: 'Restaurant',
    };
    for (const [slug, type] of Object.entries(expected)) expect(schemaTypeFor(slug)).toBe(type);
  });

  it('falls back to LocalBusiness for a category it does not know', () => {
    expect(schemaTypeFor('brand-new-category')).toBe('LocalBusiness');
    expect(schemaTypeFor(null)).toBe('LocalBusiness');
  });
});

describe('the page content', () => {
  it('writes an About paragraph from facts, both languages', () => {
    const about = aboutParagraph(base(), 'en');
    expect(about.heading).toBe('About Restaurant El-Kababgy Luxor');
    expect(about.text).toContain('is a restaurant in Luxor East Bank, Luxor.');
    expect(about.text).toContain('It has outdoor seating');
    expect(about.text).toContain('101 times on 5argny');
    const arabic = aboutParagraph(base({ name: 'مطعم الكبابجي الأقصر', area: 'الأقصر', city: 'الأقصر', amenities: ['جلوس خارجي'], amenityKeys: ['Outdoor Seating'] }), 'ar');
    expect(arabic.heading).toBe('عن مطعم الكبابجي الأقصر');
    expect(arabic.text).toContain('جلوس خارجي');
    expect(arabic.text).not.toContain('It has');
  });

  it('puts the other language name on the page only when it differs', () => {
    expect(otherNameLine(base(), 'en')).toBe('Also known as مطعم الكبابجي الأقصر.');
    expect(otherNameLine(base({ nameOther: null }), 'en')).toBeNull();
  });

  it('asks only questions the record answers', () => {
    const questions = placeQuestions(base(), 'en');
    const text = questions.map((q) => `${q.question} ${q.answer}`).join(' ');
    expect(text).toContain('Where is Restaurant El-Kababgy Luxor?');
    expect(text).toContain('opening hours');
    expect(text).toContain('outdoor seating');
    expect(text).not.toContain('menu');
    expect(questions.length).toBeLessThanOrEqual(4);

    const noData = placeQuestions(base({ hours: [], amenities: [], phone: null, address: null }), 'en');
    expect(noData.map((q) => q.question)).toEqual(['Where is Restaurant El-Kababgy Luxor?']);

    const arabic = placeQuestions(base({ name: 'مطعم الكبابجي', area: 'الأقصر', city: 'الأقصر', amenities: ['جلوس خارجي'], amenityKeys: ['Outdoor Seating'] }), 'ar');
    expect(arabic[0].question).toBe('أين يقع مطعم الكبابجي؟');
    expect(arabic.some((q) => q.answer.includes('جلوس خارجي'))).toBe(true);
  });

  it('names only amenities the place lists, in the page language', () => {
    expect(featureWords(base(), 'en', 3)).toEqual(['outdoor seating', 'free parking', 'Wi-Fi']);
    expect(featureWords(base({ amenities: ['جلوس خارجي'], amenityKeys: ['Outdoor Seating'] }), 'en', 3)).toEqual([]);
    expect(featureWords(base({ amenities: ['جلوس خارجي'], amenityKeys: ['Outdoor Seating'] }), 'ar', 3)).toEqual(['جلوس خارجي']);
  });
});

describe('photos', () => {
  it('writes alt text as name, area and number, in the page language', () => {
    expect(photoAlt('Rehab Mall 1 Cinema', 'Rehab City', 'Cairo', 2, 'en')).toBe('Rehab Mall 1 Cinema — Rehab City, photo 3');
    expect(photoAlt('سينما رحاب مول', 'الرحاب', 'القاهرة', 0, 'ar')).toBe('سينما رحاب مول — الرحاب، صورة 1');
    expect(photoAlt('Zed', '', 'Cairo', 0, 'en')).toBe('Zed — Cairo, photo 1');
  });
});

describe('the record', () => {
  it('reads the name, the other name and the facts in the page language', () => {
    const facts = buildPlaceFacts({
      place: {
        name: 'بريمير سينما – مول بوينت 90', nameEn: 'point 90 Cinema', phone: ' 0100 ', hasMenu: false,
        hours: week('11:00', '00:00'),
        amenities: [{ name: 'جلوس خارجي', nameEn: 'Outdoor Seating' }],
        images: [{}, {}], viewCount: 54, priceRange: null,
      },
      locale: 'en',
      city: 'Cairo',
      area: 'New Cairo',
      categorySlug: 'cinemas',
      categoryName: 'Cinemas',
      priceRangeLabel: null,
      url: 'https://www.5argny.com/explorer/cairo/point-90-cinema/',
    });
    expect(facts.name).toBe('point 90 Cinema');
    expect(facts.nameOther).toBe('بريمير سينما – مول بوينت 90');
    expect(facts.phone).toBe('0100');
    expect(facts.amenities).toEqual(['Outdoor Seating']);
    expect(facts.imageCount).toBe(2);
    expect(facts.viewCount).toBe(54);
  });
});
