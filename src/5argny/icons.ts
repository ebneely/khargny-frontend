// Icons per concept, copied from the prototype (data.js catIcons/amenIcons, app.js).
// Lucide names (lucide-react / lucide-react-native), except `strokePaths`: the prototype's own 24-grid line set
// (stroke 1.75, round caps, no fill) that draws the tab bar, the action buttons and the stats.

export const strokePaths = {
  home: 'M3.5 10.5 12 3.5l8.5 7V20a.5.5 0 0 1-.5.5h-5v-6h-6v6H4a.5.5 0 0 1-.5-.5z',
  explore: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm3.5 5-2 5-5 2 2-5z',
  market: 'M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5v10h16v-10M9.5 19.5v-5h5v5',
  saved: 'M6 3.5h12v17l-6-4.2-6 4.2z',
  user: 'M12 4.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM16 16l4.5 4.5',
  pin: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 7.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6z',
  heart: 'M12 20.5s-7.6-4.6-9.7-9.1C.8 8 3 4.5 6.7 4.5c2.3 0 4 1.3 5.3 3.2 1.3-1.9 3-3.2 5.3-3.2 3.7 0 5.9 3.5 4.4 6.9-2.1 4.5-9.7 9.1-9.7 9.1z',
  share: 'M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5v6.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5v-6.5',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  back: 'M15 5l-7 7 7 7',
  phone: 'M5 4h3l1.5 4-2 1.5a11 11 0 0 0 7 7l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  go: 'M3.5 11 20.5 3.5 13 20.5l-2-7.5z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  filter: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  x: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  globe: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17',
  insta: 'M7 3.5h10A3.5 3.5 0 0 1 20.5 7v10a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 6.8h.01',
  flag: 'M5 21V4.5M5 4.5h11l-2 4 2 4H5',
  info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 11v5M12 8h.01',
  shield: 'M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  cog: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2.5v3M12 18.5v3M4.3 6.4l2.6 1.5M17.1 16.1l2.6 1.5M4.3 17.6l2.6-1.5M17.1 7.9l2.6-1.5',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z',
  near: 'M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  fork: 'M7 3.5v17M4.5 3.5v5a2.5 2.5 0 0 0 5 0v-5M17 3.5c-2 1-3 3.5-3 6.5h3v10.5',
  cup: 'M4.5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM16.5 9.5h1.5a2.5 2.5 0 0 1 0 5h-1.5M8 3.5v2M12 3.5v2',
  fun: 'M4 7.5h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7.5v10',
  history: 'M3.5 20.5h17M5 20.5V10M9.5 20.5V10M14.5 20.5V10M19 20.5V10M3.5 10 12 4l8.5 6z',
  stay: 'M3.5 19.5V6M3.5 15.5h17v4M20.5 15.5v-3a3 3 0 0 0-3-3h-7v6M7 11.5h.01',
  shop: 'M5.5 8h13l-1 12.5h-11zM9 8V6.5a3 3 0 0 1 6 0V8',
  tree: 'M12 20.5v-5M12 3.5l6 8h-3l3 4H6l3-4H6z',
};


// tab bar and sidebar, in order: tab key -> strokePaths key
export const navIcons = { home: 'home', explore: 'explore', market: 'market', saved: 'saved', profile: 'cog' } as const;

export const intentIcons = { eat: 'utensils', coffee: 'coffee', fun: 'ferris-wheel', history: 'castle', stay: 'bed-double', shop: 'shopping-bag', outdoors: 'trees' } as const;

export const categoryIcons: Record<string, string> = {
  Entertainment: 'ferris-wheel', Cafes: 'coffee', Beaches: 'waves', 'Hotels & Resorts': 'bed-double', Museums: 'landmark', Clubs: 'users',
  'Sports Venues': 'volleyball', Parks: 'trees', Shops: 'store', 'Shopping Malls': 'shopping-bag', Cinemas: 'clapperboard', Bakeries: 'croissant',
  'Bars & Lounges': 'martini', Spas: 'flower-2', Restaurants: 'utensils', Attractions: 'camera', Libraries: 'book-open', 'Historic Landmarks': 'castle',
};
export const categoryIconFallback = 'tag';

export const amenityIcons: Record<string, string> = {
  'Birthday Parties': 'cake', 'Reservations Required': 'calendar-check', 'Bar On Site': 'martini', 'Sports On TV': 'tv', 'Credit Cards': 'credit-card',
  'Debit Cards': 'credit-card', 'Contactless Delivery': 'hand', 'Outdoor Seating': 'sun', 'Indoor Seating': 'armchair', 'Rooftop Seating': 'building',
  'Wheelchair Accessible Seating': 'accessibility', 'Drive-Through': 'car', 'Table Service': 'utensils', Catering: 'chef-hat', Delivery: 'bike',
  'Vegan Options': 'sprout', 'Vegetarian Options': 'salad', 'Mobile Payments': 'smartphone-nfc', Restrooms: 'toilet', 'Wheelchair Accessible Restroom': 'accessibility',
  Halal: 'check-circle', Takeaway: 'shopping-bag', 'Live Performances': 'mic', 'Private Dining Room': 'door-closed', 'Kids Menu': 'baby', 'High Chairs': 'baby',
  'Wheelchair Accessible Entrance': 'accessibility', Fireplace: 'flame', 'Alcohol Served': 'wine', 'Kid Friendly': 'baby', 'Family Friendly': 'users',
  Playground: 'toy-brick', 'Live Music': 'music', 'Free Parking': 'circle-parking', 'Paid Parking': 'circle-parking', 'Wheelchair Accessible Parking': 'accessibility',
  'Cash Only': 'banknote', 'Wi-Fi': 'wifi', 'Pet Friendly': 'dog', 'Accepts Reservations': 'calendar-check',
};
export const amenityIconFallback = 'check';
// the amenities offered under Filters > Must have, in order
export const mustHaveAmenities = ['Free Parking', 'Outdoor Seating', 'Wi-Fi', 'Kid Friendly', 'Credit Cards', 'Accepts Reservations', 'Wheelchair Accessible Entrance', 'Live Music', 'Halal', 'Rooftop Seating'] as const;

export const badgeIcons = { most_viewed: 'trophy', pricing: 'receipt', price_match: 'badge-check', visited: 'footprints' } as const;
export const badgeIconFallback = 'award';

// Suggest a correction (place) and Report a problem (app): issue key -> icon
export const correctionIcons = { hours: 'clock', location: 'map-pin', phone: 'phone', closed: 'circle-off', photos: 'image', prices: 'receipt', name: 'tag', other: 'message-circle' } as const;
export const reportIcons = { bug: 'bug', wrong: 'badge-alert', slow: 'gauge', account: 'user', idea: 'lightbulb', other: 'message-circle' } as const;

// one name per thing the screens show
export const uiIcons = {
  // opening piece
  opened: 'door-open', closes: 'door-closed', openAllDay: 'infinity', hoursAsk: 'clock-plus',
  // 5argny! and counts
  go5: 'navigation', go5People: 'users', distance: 'navigation',
  // home
  takeMeShuffle: 'dices', takeMeGo: 'arrow-right', allKinds: 'layout-grid', earned: 'award', teamCollections: 'library', trending: 'flame',
  trendUp: 'trending-up', trendDown: 'trending-down', trendWindow: 'clock', marketRail: 'store', seeAllArrow: 'arrow-right',
  // place
  price: 'wallet', promoted: 'info', hypeHelp: 'hand', correction: 'flag', rowChevron: 'chevron-right', photoPrev: 'chevron-left', photoNext: 'chevron-right',
  // location bar and filters
  allEgypt: 'map', area: 'map-pin', allAreas: 'layers', chevron: 'chevron-down', filters: 'sliders-horizontal', reset: 'rotate-ccw',
  filterWhen: 'clock', filterCategory: 'layout-grid', filterPrice: 'banknote', filterMustHave: 'list-checks',
  // search
  searchRightNow: 'sparkles', searchRecent: 'history', searchRecentRow: 'clock', searchTrending: 'flame', searchOpened: 'eye', searchGo: 'navigation',
  searchPlaces: 'map-pin', searchAreas: 'map', searchAll: 'search', searchNothing: 'search-x', openLate: 'moon', workFrom: 'laptop', clear: 'x',
  // collections
  collectionPublic: 'globe', collectionPrivate: 'lock', byTeam: 'badge-check', collectionPlaces: 'map-pin', collectionEmpty: 'images',
  collectionNothing: 'bookmark-plus', collectionAdd: 'plus', moreDots: 'ellipsis',
  // marketplace
  hostVerified: 'shield-check', hostNotVerified: 'shield-alert', hostGuide: 'compass', hostOffice: 'briefcase', hostPerson: 'user',
  trips: 'route', listingPrice: 'wallet', listingDate: 'calendar', listingLength: 'clock', listingSeats: 'users',
  // correction and report pages
  question: 'circle-help', rightAnswer: 'pencil-line', proofPhoto: 'camera', screenshot: 'image-plus', device: 'smartphone', sent: 'check',
} as const;
