// Bilingual (Arabic / English) UI strings for the visitor frontend.
// Arabic is the primary product language; English is the secondary.
// Keys are dot-namespaced by surface. Add strings here, never hard-code copy.

export type Locale = "ar" | "en";

export const LOCALES: Locale[] = ["ar", "en"];
export const DEFAULT_LOCALE: Locale = "ar";

export const LOCALE_DIR: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

export const LOCALE_LABEL: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
};

// The dictionary shape — English is the reference; Arabic must mirror its keys.
const en = {
  common: {
    appName: "Khargny",
    tagline: "Discover the best places in Egypt",
    search: "Search",
    searchPlaces: "Search places…",
    explore: "Explore",
    home: "Home",
    plan: "My plan",
    back: "Back",
    retry: "Retry",
    loading: "Loading…",
    seeAll: "See all",
    switchLang: "العربية",
  },
  home: {
    whereTo: "Where to?",
    pickRegion: "Pick a region to start exploring",
    categories: "Browse by category",
    recommended: "Recommended for you",
    popular: "Popular right now",
  },
  explorer: {
    cities: "Cities",
    pickCity: "Pick a city",
    places: "Places",
    filters: "Filters",
    clearFilters: "Clear filters",
    noResults: "No places match your filters.",
    placeCount: "{count} places",
  },
  place: {
    about: "About",
    hours: "Opening hours",
    amenities: "Amenities",
    location: "Location",
    gallery: "Photos",
    save: "Save to plan",
    saved: "Saved",
    closed: "Closed",
    open: "Open",
    similar: "Similar places",
    call: "Call",
    website: "Website",
    directions: "Directions",
  },
  plan: {
    title: "My visit plan",
    empty: "Your plan is empty. Save places while you explore.",
    startExploring: "Start exploring",
    remove: "Remove",
    scheduled: "Scheduled",
    unscheduled: "Not scheduled",
  },
  search: {
    title: "Search",
    placeholder: "Search places by name…",
    noResults: "Nothing found. Try another search.",
    results: "Results",
  },
  errors: {
    generic: "Something went wrong.",
    loadFailed: "This page couldn't load.",
    tryAgain: "Try again",
  },
};

const ar: typeof en = {
  common: {
    appName: "خرجني",
    tagline: "اكتشف أفضل الأماكن في مصر",
    search: "بحث",
    searchPlaces: "ابحث عن الأماكن…",
    explore: "استكشف",
    home: "الرئيسية",
    plan: "خطتي",
    back: "رجوع",
    retry: "إعادة المحاولة",
    loading: "جارٍ التحميل…",
    seeAll: "عرض الكل",
    switchLang: "English",
  },
  home: {
    whereTo: "إلى أين؟",
    pickRegion: "اختر منطقة لتبدأ الاستكشاف",
    categories: "تصفح حسب الفئة",
    recommended: "مقترح لك",
    popular: "الأكثر رواجًا الآن",
  },
  explorer: {
    cities: "المدن",
    pickCity: "اختر مدينة",
    places: "الأماكن",
    filters: "التصفية",
    clearFilters: "مسح التصفية",
    noResults: "لا توجد أماكن مطابقة.",
    placeCount: "{count} مكان",
  },
  place: {
    about: "نبذة",
    hours: "مواعيد العمل",
    amenities: "المرافق",
    location: "الموقع",
    gallery: "الصور",
    save: "أضف إلى الخطة",
    saved: "تمت الإضافة",
    closed: "مغلق",
    open: "مفتوح",
    similar: "أماكن مشابهة",
    call: "اتصال",
    website: "الموقع الإلكتروني",
    directions: "الاتجاهات",
  },
  plan: {
    title: "خطة زيارتي",
    empty: "خطتك فارغة. احفظ الأماكن أثناء الاستكشاف.",
    startExploring: "ابدأ الاستكشاف",
    remove: "إزالة",
    scheduled: "مجدول",
    unscheduled: "غير مجدول",
  },
  search: {
    title: "بحث",
    placeholder: "ابحث عن الأماكن بالاسم…",
    noResults: "لا توجد نتائج. جرّب بحثًا آخر.",
    results: "النتائج",
  },
  errors: {
    generic: "حدث خطأ ما.",
    loadFailed: "تعذّر تحميل هذه الصفحة.",
    tryAgain: "حاول مجددًا",
  },
};

export const dictionaries: Record<Locale, typeof en> = { en, ar };

export type Dictionary = typeof en;
