// Every user-facing string in the prototype (ui-unify/proto/app.js), keyed by screen.section.thing.
// {name} placeholders are filled by fill() in copy/index.ts. No "·" separators; 12-hour time; western digits.
export const en = {
  brand: '5argny',
  units: { am: 'am', pm: 'pm', hour: 'h', minute: 'min', thousand: 'k', egp: '{n} EGP', fromEgp: 'from {n} EGP', km: '{km} km', kmAway: '~{km} km away', kmRough: '~{km} km', minByCar: '{n} min by car' },
  days: {
    short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    long: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    today: 'Today',
    tomorrow: 'Tomorrow',
  },
  nav: { home: 'Home', explore: 'Explore', market: 'Marketplace', saved: 'Saved', profile: 'Settings', homeAria: '5argny home', tabsAria: 'Main' },
  common: {
    seeAll: 'See all', back: 'Back', close: 'Close', more: 'More', share: 'Share', save: 'Save', love: 'Love', like: 'Like', remove: 'Remove',
    clear: 'Clear', create: 'Create', findPlaces: 'Find places', places: '{n} places', optional: 'optional', sendToTeam: 'Send to our team',
    previousPhoto: 'Previous photo', nextPhoto: 'Next photo', showAll: 'Show all {n}', opening: 'Opening {name}', linkCopied: 'Link copied', copyLink: 'Copy link', tooMany: 'That is enough for today. Try again tomorrow', failed: 'That did not go through. Try again',
  },
  // the T dictionary entries that no screen uses today, kept so nothing is lost
  unused: { want: 'What do you want to do?', where: 'Where?', anywhere: 'Anywhere in', forYou: 'For you', directions: 'Directions', badgesWhy: 'What these marks mean' },
  intents: { eat: 'Eat', coffee: 'Coffee', fun: 'Have fun', history: 'History', stay: 'Stay', shop: 'Shop', outdoors: 'Outdoors' },
  moments: { morningCoffee: 'Morning coffee', lunch: 'Lunch', goldenHour: 'Golden hour outside', dinner: 'Dinner', lateNight: 'Late night' },
  location: {
    aria: 'Where', allEgypt: 'All Egypt', area: 'Area', allAreas: 'All areas', category: 'Category', mood: 'Mood', allMoods: 'Any mood', filters: 'Filters', reset: 'Clear location and filters', resetBtn: 'Reset',
    citySheet: 'City', areaSheet: 'Area in {city}', cityPicked: '{city}. Pick an area to narrow it', cleared: 'Cleared. Showing all of Egypt', egypt: 'Egypt',
  },
  sidebar: { shortcuts: 'Shortcuts', collections: 'Collections', privacy: 'Privacy policy', getTheApp: 'Get the app', contact: 'Contact', follow: 'Follow us' },
  search: {
    placeholder: 'Search places, areas, food', cancel: 'Cancel', clear: 'Clear search', remove: 'Remove',
    hints: ['Try “sushi in Zamalek”', 'Try “open now”', 'Try “قهوة”', 'Try “kids”', 'Try “rooftop”', 'Try “Golden hour outside”'],
    zero: { rightNow: 'Right now', openLate: 'Open late tonight', workFrom: 'Coffee to work from', surprise: 'Surprise me', recent: 'Recent', trendingIn: 'Trending in {place}', oneSearch: '{n} search', searches: '{n} searches', youOpened: 'You opened' },
    results: { go: 'Go', places: 'Places', areas: 'Areas', intentIn: '{intent} in {place}', intentOpenNow: '{intent} open now', openNow: 'Open now', seeEverything: 'See everything for “{q}”', nothing: 'Nothing for “{q}” yet' },
  },
  home: {
    takeMe: {
      aria: 'Take me out', question: '5argny!… where?', timeNow: 'Time now', cantPick: "Can't pick?", surprise: 'Surprise me', surpriseLoading: 'Rolling…', rightNow: 'Right now',
      leadOpen: '{n} open now in {place}', leadPlaces: '{n} places in {place}', all: 'All', kinds: '{n} kinds', yourPick: 'Your pick', shuffleAgain: 'Surprise me again',
      everythingSheet: 'Everything to do',
    },
    nearYou: 'Near you', nearestFirst: 'Nearest first', nearestFirstIn: 'Nearest first in {place}', nearAsk: 'Use my location', nearAskBody: 'See the places closest to you, and how far each one is.',
    earned: 'Earned on {brand}', earnedAll: 'All {n}', teamCollections: 'Collections by {brand}', social: '{brand} Social',
    loveHint: 'Double-tap to love. Double-tap and hold to share',
  },
  trending: {
    title: 'Trending', in: 'in {place}', hereNow: '{n} here now', market: 'Trending in {market}', marketRail: 'Marketplace', seeAllExperiences: 'See all experiences',
    windows: { live: 'Live now', '24h': 'Last 24 h', '7d': 'Last 7 days', '30d': 'Last 30 days' },
  },
  stats: {
    views30: 'views in the last 30 days', loves: 'people who love it', saves30: 'saves in the last 30 days', shares30: 'shares in the last 30 days',
    goTotal: 'people who tapped 5argny! here', opened30: 'people who opened it in the last 30 days', goBefore: 'people who tapped 5argny! here before you',
    viewsGroup: 'views in the last 30 days',
  },
  marks: { rising: '⬆️ Rising', new: 'New on 5argny' },
  go5: { label: '5argny!', aria: '5argny! Take me there', mapsSheet: 'Which map?', maps: ['Google Maps', 'Apple Maps'] },
  share: { sheet: 'Share', apps: ['WhatsApp', 'Facebook', 'Messenger'], copyLink: 'Copy link' },
  open: {
    open: 'Open', closed: 'Closed', openNow: 'Open now', closedNow: 'Closed now', left: '{dur} left', opensIn: 'Opens in {dur}',
    openAria: 'Open now, opened {from}, closes {until}, {left}', closedAria: 'Closed now, opens {until}, {left}',
    allDay: 'Open 24 hours, every day', allDayShort: 'Open 24 hours', unknown: 'Hours not listed', tellUs: 'Know the hours? Tell us',
  },
  place: {
    loveHint: 'Double-tap to love', shareHint: 'Double-tap and hold to share', hours: 'Opening hours', closedDay: 'Closed', amenities: 'What it has', amenitiesOf: 'What {name} has',
    contact: 'More about this place', instagram: 'Instagram', website: 'Website', theWebsite: 'the website', addressCopied: 'Address copied',
    similar: 'Similar places', services: '{name} services', call: 'Call', callNow: 'Call now', calling: 'Calling…',
    promoted: 'Promoted: this place pays to be shown more often.', promotedMore: "Promoted: this place pays to be shown more often. It still has to match what you're looking for.",
    correctionAsk: 'Something not right here?', correctionCta: 'Suggest a correction',
    more: { addToCollection: 'Add to a collection', newCollection: 'New collection', copyLink: 'Copy link' },
    swap: { what: 'What in {area}?', where: '{cat} where?' },
  },
  badges: {
    mostViewed: '#{rank} most viewed in {city}', mostSaved: '#{rank} most saved in {city}', most5argnyd: '#{rank} most 5argny! in {city}', theCity: 'the city', pricing: 'Prices listed', priceMatch: 'Prices checked by us', visited: 'Visited by our team',
    meaning: {
      most_viewed: 'The place people opened most in its city over the last 30 days.',
      most_saved: 'The place people saved most in its city over the last 30 days.',
      most_5argnyd: 'The place people tapped 5argny! on most in its city over the last 30 days.',
      pricing: 'It shows a price list you can read before you go.',
      price_match: 'Our team compared its listed prices with the real ones.',
      visited: 'Someone from 5argny went there and checked it.',
    },
  },
  overview: {
    title: 'On {brand}', viewed: 'people viewed it in the last 30 days', days30: '30 days', allTime: 'All time',
    rows: { views: 'Views', likes: 'Likes', saves: 'Saves', shares: 'Shares', go: '5argny' },
    steady: 'Steady', busier: '{pct}% busier', quieter: '{pct}% quieter', thanLastWeek: 'this week than the week before', busiest: 'Busiest',
    help: 'Slide along the line to see any day. Busiest: {day}, {n} views', aria: 'Views per day over the last 30 days. Busiest {day} with {n} views.', tip: '{n} views',
  },
  explore: {
    everything: 'Everything', earned: 'Earned on {brand}', in: 'in', results: '{n} places', empty: 'No places for {what} {when} in {place} yet',
    when: { any: 'Any time', now: 'Open now', tonight: 'Tonight', weekend: 'This weekend' },
    sort: { popular: 'Popular', near: 'Nearest', open: 'Open first', rising: 'Rising' }, map: 'Map', list: 'List',
  },
  filters: { title: 'Filters', sort: 'Open first', when: 'When', category: 'Category', price: 'Price per person', mustHave: 'Must have', clear: 'Clear', show: 'Show {n} places', showPlaces: 'Show places', seeAllCats: 'See all categories', allCats: 'All categories', findCat: 'Find a category', noCat: 'No category called “{q}”' },
  market: {
    title: 'Marketplace', all: 'All', verifiedOnly: 'ID verified only', verified: 'ID verified', notVerified: 'Not verified', trips: '{n} trips', seatsLeft: '{n} seats left',
    perPerson: 'per person', hostKinds: { guide: 'Guide', individual: 'Individual', office: 'Travel office' },
    host: 'Your host', hostLine: '{kind}, {n} trips on {brand}', checkedId: "We checked this host's ID.", checkedIdLicence: "We checked this host's ID and tourism licence.",
    notChecked: "We haven't checked this host. Meet in public places and don't pay before you see the trip.", included: 'Included',
    messageHost: 'Message the host', openingWhatsApp: 'Opening WhatsApp', reportTrip: 'Report this trip', whatWrong: 'What is wrong?',
    reasons: ['Wrong hours', 'Wrong location', 'Closed for good', 'Wrong photos', 'Something else'], reported: 'Thanks. Our team will look at it',
    about: 'About', tripsBy: 'Trips by {name}', since: 'On {brand} since {year}', idLicence: 'ID and licence verified', reviewsOfHost: 'Reviews of the host', reviewsOfTrip: 'Reviews of this trip',
    noReviews: 'No reviews yet. Only people who went can review, after the trip.', reviewsFrom: '{n} reviews from people who went', reviewFrom: '1 review from people who went', reviewsN: '{n} reviews', outOf5: '{n} out of 5',
    oneTrip: '1 trip', hostLineOne: '{kind}, 1 trip on {brand}', nights: '{n} nights', oneNight: '1 night', empty: 'No experiences listed yet', emptyBody: 'Trips and experiences people list for free show up here.',
  },
  saved: {
    places: 'Places', collections: 'Collections', emptyTitle: 'Nothing saved yet', emptyBody: 'Tap the bookmark on any place and it waits for you here.',
    fromTeam: 'Saved from {brand}', yours: 'Yours', newCollection: 'New collection', privateUntilShared: 'Private until you share it', added: 'Saved', removed: 'Removed from saved',
  },
  collections: {
    private: 'Private', public: 'Public', byTeam: 'by {brand}', places: '{n} places', save: 'Save collection', saved: 'Saved', saveAria: 'Save {title}',
    gone: 'This collection is private or gone', emptyTitle: 'Nothing here yet', emptyBody: 'Open a place, tap {more} and add it to {title}.',
    newSheet: 'New collection', namePlaceholder: 'Name it, like Date night', nameAria: 'Collection name', defaultTitle: 'New collection',
    whoCanSee: 'Who can see it', onlyMe: 'Only me', anyone: 'Anyone with the link', createdPublic: '{title} created, public', createdPrivate: '{title} created, private',
    savedToast: 'Collection saved. Find it in Saved', removedToast: 'Removed from Saved', publicToast: 'Public. Anyone with the link can see it', privateToast: 'Private. Only you can see it',
    shareSheet: 'Share this collection', sharePrivate: '{title} is private. Make it public so anyone with the link can open it. You can make it private again any time.',
    makePublicShare: 'Make public and share', addedTo: 'Added to {title}', removedFrom: 'Removed from {title}',
  },
  settings: {
    title: 'Settings', preferences: 'Preferences', appearance: 'Appearance', light: 'Light', dark: 'Dark', auto: 'Auto', language: 'Language', english: 'English', arabic: 'العربية',
    notify: { near: 'New places near me', saved: 'Updates from my saved places', weekend: 'Weekend picks on Thursday' },
    help: 'Help', report: 'Report a problem', privacy: 'Privacy policy',
  },
  report: {
    title: 'Report a problem', whatHappened: 'What happened?',
    issues: { bug: 'Something is broken', wrong: 'Wrong information', slow: 'Slow or not loading', idea: 'An idea', other: 'Something else' },
    tellMore: 'Tell us more', detail: 'What you did and what you saw', screenshot: 'Add a screenshot', device: 'We attach your device and app version so we can find it.',
  },
  // proof on a correction or a report: up to 4 photos or short videos (owner, 2026-11-14; same words as the app)
  proof: {
    add: 'Add photo or video', label: 'Photos or videos (up to {n})', remove: 'Remove', retry: 'Tap to try again', uploading: 'Uploading…', wait: 'Wait for the upload to finish',
    errors: {
      missing: 'That file was empty. Pick it again', type: 'Only photos and mp4 or mov videos', decode: "We couldn't read that file", heic: "We couldn't read that photo. Try a JPEG",
      too_large: 'Too big: photos up to 8 MB, videos up to 30 MB', too_long: 'Videos up to 30 seconds', rate: "That's enough for today. Try again tomorrow",
      storage: "We couldn't save it. Try again", failed: "It didn't upload. Tap to try again",
    },
  },
  correction: {
    title: 'Suggest a correction', whatsWrong: "What's not right?", rightAnswer: 'The right answer',
    issues: { hours: 'Opening hours', location: 'Location', phone: 'Phone number', closed: 'Closed for good', photos: 'Photos', prices: 'Prices or menu', name: 'Name or category', other: 'Something else' },
    fields: {
      hours: { label: 'The right hours', placeholder: 'For example: every day 10 am to 1 am, Friday from 1 pm' },
      location: { label: 'Where it really is', placeholder: 'Paste a Google Maps link or write the address' },
      phone: { label: 'The right number', placeholder: '01x xxxx xxxx' },
      closed: { label: 'Since when?', recent: 'Recently', months: 'Months ago', unsure: 'Not sure' },
      photos: { label: "What's wrong with the photos?", placeholder: 'Old, wrong place, not the real view…' },
      prices: { label: 'The right prices', placeholder: 'Item and price, one per line' },
      name: { label: 'The right name or category', placeholder: "Write it as it's known" },
      other: { label: "Tell us what's wrong", placeholder: 'A sentence is enough' },
    },
    howKnow: 'How do you know?', visit: 'I was there', staff: 'I work there', online: 'Online', proof: 'Add a photo as proof', pickPhoto: 'Pick a photo',
    pickFirst: "Pick what's not right first", doneTitle: 'Thanks. Our team will check it', doneBody: 'We look at every correction within 48 hours and fix the place for everyone.',
    backToPlace: 'Back to the place',
  },
  owner: {
    title: 'Your results', period: '{name}, last 30 days', reached: 'people reached', seen: 'times seen', taps: 'taps', actions: 'actions',
    whatPeopleDid: 'What people did', directions: 'Asked for directions', called: 'Called', savedIt: 'Saved it', sharedIt: 'Shared it', costPerAction: 'Each action cost you about {n} EGP.',
    inOneLine: 'In one line', whereAppeared: 'See where you appeared', homeFeed: 'Home feed', storiesRow: 'Stories row', exploreIn: 'Explore, {intent}',
    weekly: 'Weekly summary', weeklyWhatsApp: 'Send me this every Sunday on WhatsApp', weeklyAria: 'Weekly WhatsApp summary',
  },
  // the first-visit sheet that points web visitors at the apps (owner 2026-11-14)
  getApp: { title: '5argny is better in the app', body: 'Faster, with your saved places and what is near you.', appStore: 'Download on the App Store', googlePlay: 'Get it on Google Play', notNow: 'Not now' },
  // loading, empty and failing (owner 2026-11-14): one short line in the 5argny voice, one action
  states: {
    retry: 'Try again', offline: "You're offline. We'll pick up when you're back",
    failed: { offline: "You're offline. This loads when you're back", gone: "This isn't on 5argny any more", slow: 'This is taking too long', server: 'Something broke on our side', network: "We couldn't reach 5argny" },
    page: { title: "We couldn't open this page", body: 'Check your connection and try again, or start from Home.', home: 'Go to Home' },
    placeGone: "This place isn't on 5argny any more", placeGoneBody: 'It may have closed or moved. Find another one like it.',
    moreFailed: "The next places didn't load",
    near: {
      denied: 'Location is off for 5argny. Allow it in your browser settings, then try again', unavailable: "We couldn't find where you are. Try again in a moment",
      approximate: 'Location is approximate, so distances are hidden',
      outside: "You're outside Egypt, so nothing is near you yet", empty: 'Nothing listed near you yet', emptyBody: 'We add places every week. See all of Egypt for now.', seeEgypt: 'See all of Egypt',
    },
    feed: { empty: 'No places in {place} yet', emptyBody: 'We add places every week. Try another area, or all of Egypt.', allEgypt: 'See all of Egypt' },
    explore: { clear: 'Clear filters', everything: 'See everything' },
    market: { action: 'Find places instead' },
    search: { action: 'Browse every place' },
    surpriseEmpty: 'Nothing to pick here yet. Try all of Egypt',
  },
};

export type Copy = typeof en;
