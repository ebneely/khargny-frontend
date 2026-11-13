import type { Copy } from './en.ts';

// Egyptian Arabic. Strings that app.js already had in Arabic (its T.ar, the intents, the moments, Take me out) are copied as they are;
// the rest are written here. Western digits only; no "·".
export const ar: Copy = {
  brand: 'خرجني',
  units: { am: 'ص', pm: 'م', hour: 'س', minute: 'د', thousand: 'k', egp: '{n} جنيه', fromEgp: 'من {n} جنيه', km: '{km} كم', kmAway: 'على بعد {km} كم' },
  days: {
    short: ['الحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'],
    long: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    today: 'النهارده',
    tomorrow: 'بكرة',
  },
  nav: { home: 'الرئيسية', explore: 'استكشف', market: 'السوق', saved: 'المحفوظ', profile: 'الإعدادات', homeAria: 'الرئيسية في خرجني', tabsAria: 'التنقل الرئيسي' },
  common: {
    seeAll: 'الكل', back: 'رجوع', close: 'قفل', more: 'المزيد', share: 'شارك', save: 'احفظ', love: 'حبيته', like: 'عجبني', remove: 'امسح',
    clear: 'امسح', create: 'اعمل', findPlaces: 'دور على أماكن', places: '{n} مكان', optional: 'اختياري', sendToTeam: 'ابعت لفريقنا',
    previousPhoto: 'الصورة اللي قبلها', nextPhoto: 'الصورة اللي بعدها', showAll: 'اعرض الـ {n} كلهم', opening: 'بنفتح {name}', linkCopied: 'اتنسخ اللينك', copyLink: 'انسخ اللينك',
  },
  unused: { want: 'عايز تعمل إيه؟', where: 'فين؟', anywhere: 'في أي مكان في', forYou: 'ليك', directions: 'الاتجاهات', badgesWhy: 'معنى العلامات' },
  intents: { eat: 'أكل', coffee: 'قهوة', fun: 'خروجة', history: 'تاريخ', stay: 'إقامة', shop: 'تسوق', outdoors: 'في الهوا' },
  moments: { morningCoffee: 'قهوة الصبح', lunch: 'غدا', goldenHour: 'قبل المغرب', dinner: 'عشا', lateNight: 'سهرة' },
  location: {
    aria: 'فين', allEgypt: 'مصر كلها', area: 'المنطقة', allAreas: 'كل المناطق', filters: 'فلاتر', reset: 'امسح المكان والفلاتر',
    citySheet: 'المحافظة', areaSheet: 'منطقة في {city}', cityPicked: '{city}. اختار منطقة عشان تضيق البحث', cleared: 'اتمسح. بنعرض مصر كلها', egypt: 'مصر',
  },
  sidebar: { shortcuts: 'عايز تعمل إيه؟', collections: 'القوايم' },
  search: {
    placeholder: 'ابحث عن مكان أو منطقة أو أكل', cancel: 'إلغاء', clear: 'امسح البحث', remove: 'امسح',
    hints: ['جرب “سوشي في الزمالك”', 'جرب “مفتوح دلوقتي”', 'جرب “coffee”', 'جرب “أطفال”', 'جرب “روف توب”', 'جرب “قبل المغرب”'],
    zero: { rightNow: 'دلوقتي', openLate: 'فاتح لآخر الليل', workFrom: 'قهوة تشتغل منها', surprise: 'فاجئني', recent: 'آخر حاجات دورت عليها', trendingIn: 'التريند في {place}', oneSearch: '{n} بحث', searches: '{n} بحث', youOpened: 'فتحتهم قبل كده' },
    results: { go: 'روح', places: 'أماكن', areas: 'مناطق', intentIn: '{intent} في {place}', intentOpenNow: '{intent} مفتوح دلوقتي', openNow: 'مفتوح دلوقتي', seeEverything: 'شوف كل حاجة عن “{q}”', nothing: 'لسه مفيش حاجة عن “{q}”' },
  },
  home: {
    takeMe: {
      aria: 'خرجني', question: 'خرجني فين؟', timeNow: 'الساعة دلوقتي', cantPick: 'محتار؟', surprise: 'فاجئني', rightNow: 'دلوقتي',
      leadOpen: '{n} مفتوح دلوقتي في {place}', leadPlaces: '{n} مكان في {place}', all: 'الكل', kinds: '{n} نوع', yourPick: 'اختيارك', shuffleAgain: 'جرب تاني',
      everythingSheet: 'كل حاجة تتعمل',
    },
    nearYou: 'قريب منك', nearestFirst: 'الأقرب الأول', nearestFirstIn: 'الأقرب الأول في {place}',
    earned: 'اتكسب على {brand}', earnedAll: 'الـ {n} كلهم', teamCollections: 'قوايم من {brand}', social: 'سوشيال {brand}',
    loveHint: 'دوس مرتين على أي حاجة بتحبها. اضغط ثانيتين عشان تشاركها',
  },
  trending: {
    title: 'التريند', in: 'في {place}', hereNow: '{n} هنا دلوقتي', market: 'التريند في {market}', marketRail: 'السوق', seeAllExperiences: 'شوف كل التجارب',
    windows: { live: 'لايف دلوقتي', '24h': 'آخر 24 ساعة', '7d': 'آخر 7 أيام', '30d': 'آخر 30 يوم' },
  },
  stats: {
    views30: 'مشاهدة في آخر 30 يوم', loves: 'شخص بيحبه', saves30: 'حفظ في آخر 30 يوم', shares30: 'مشاركة في آخر 30 يوم',
    goTotal: 'شخص داس خرجني! هنا', opened30: 'شخص فتحه في آخر 30 يوم', goBefore: 'شخص داس خرجني! هنا قبلك',
    viewsGroup: 'مشاهدة في آخر 30 يوم',
  },
  go5: { label: 'خرجني!', aria: 'خرجني! وديني هناك', mapsSheet: 'أنهي خريطة؟', maps: ['Google Maps', 'Apple Maps', 'Waze'] },
  share: { sheet: 'شارك', apps: ['WhatsApp', 'Facebook', 'Messenger'], copyLink: 'انسخ اللينك' },
  open: {
    open: 'مفتوح', closed: 'مقفول', openNow: 'مفتوح دلوقتي', closedNow: 'مقفول دلوقتي', left: 'فاضل {dur}', opensIn: 'يفتح بعد {dur}',
    openAria: 'مفتوح دلوقتي، فتح {from}، يقفل {until}، {left}', closedAria: 'مقفول دلوقتي، يفتح {until}، {left}',
    allDay: 'مفتوح 24 ساعة، كل يوم', allDayShort: 'مفتوح 24 ساعة', unknown: 'المواعيد مش موجودة', tellUs: 'تعرف المواعيد؟ قولنا',
  },
  place: {
    loveHint: 'دوس مرتين عشان تحبه', shareHint: 'دوس مرتين وسيب صباعك عشان تشارك', hours: 'مواعيد العمل', closedDay: 'مقفول', amenities: 'المتاح هنا', amenitiesOf: 'المتاح في {name}',
    contact: 'أكتر عن المكان', instagram: 'إنستجرام', website: 'الموقع', theWebsite: 'الموقع', addressCopied: 'اتنسخ العنوان',
    similar: 'أماكن شبهه', services: 'خدمات {name}', call: 'اتصال', callNow: 'اتصل دلوقتي', calling: 'بنتصل…',
    promoted: 'إعلان: المكان ده بيدفع عشان يظهر أكتر.', promotedMore: 'إعلان: المكان ده بيدفع عشان يظهر أكتر. ولازم برضه يكون مناسب للي بتدور عليه.',
    correctionAsk: 'فيه حاجة مش مظبوطة؟', correctionCta: 'اقترح تصحيح',
    more: { addToCollection: 'ضيفه لقايمة', newCollection: 'قايمة جديدة', copyLink: 'انسخ اللينك' },
    swap: { what: 'إيه في {area}؟', where: '{cat} فين؟' },
  },
  badges: {
    mostViewed: 'رقم {rank} في المشاهدات في {city}', theCity: 'المدينة', pricing: 'الأسعار موجودة', priceMatch: 'إحنا راجعنا الأسعار', visited: 'فريقنا زاره',
    meaning: {
      most_viewed: 'أكتر مكان الناس فتحته في مدينته في آخر 30 يوم.',
      pricing: 'فيه قايمة أسعار تقدر تقراها قبل ما تروح.',
      price_match: 'فريقنا قارن الأسعار المكتوبة بالأسعار الحقيقية.',
      visited: 'حد من خرجني راح هناك واتأكد بنفسه.',
    },
  },
  overview: {
    title: 'على {brand}', viewed: 'شخص شافه في آخر 30 يوم', days30: '30 يوم', allTime: 'من الأول',
    rows: { views: 'مشاهدات', likes: 'إعجابات', saves: 'حفظ', shares: 'مشاركات', go: 'خرجني' },
    steady: 'ثابت', busier: 'زحمة أكتر بـ {pct}%', quieter: 'أهدى بـ {pct}%', thanLastWeek: 'الأسبوع ده عن اللي قبله', busiest: 'الأزحم',
    help: 'حرك صباعك على الخط عشان تشوف أي يوم. الأزحم: {day}، {n} مشاهدة', aria: 'المشاهدات كل يوم في آخر 30 يوم. الأزحم {day} بـ {n} مشاهدة.', tip: '{n} مشاهدة',
  },
  explore: {
    everything: 'كل حاجة', earned: 'اتكسب على {brand}', in: 'في', results: '{n} مكان', empty: 'لسه مفيش أماكن لـ {what} {when} في {place}',
    when: { any: 'أي وقت', now: 'مفتوح دلوقتي', tonight: 'بالليل', weekend: 'الويك إند ده' },
    sort: { popular: 'الأشهر', near: 'الأقرب', open: 'المفتوح الأول' },
  },
  filters: { title: 'فلاتر', when: 'إمتى', category: 'النوع', price: 'السعر للفرد', mustHave: 'لازم يكون فيه', clear: 'امسح', show: 'اعرض {n} مكان' },
  market: {
    title: 'السوق', all: 'الكل', verifiedOnly: 'المتأكد من هويتهم بس', verified: 'الهوية متأكدة', notVerified: 'الهوية مش متأكدة', trips: '{n} رحلة', seatsLeft: 'فاضل {n} مكان',
    perPerson: 'للفرد', hostKinds: { guide: 'مرشد', individual: 'فرد', office: 'شركة سياحة' },
    host: 'صاحب الرحلة', hostLine: '{kind}، {n} رحلة على {brand}', checkedId: 'إحنا اتأكدنا من هوية صاحب الرحلة.', checkedIdLicence: 'إحنا اتأكدنا من هوية صاحب الرحلة ورخصة السياحة.',
    notChecked: 'لسه ما اتأكدناش من صاحب الرحلة. اتقابلوا في مكان عام وما تدفعش قبل ما تشوف الرحلة.', included: 'متضمن',
    messageHost: 'كلم صاحب الرحلة', openingWhatsApp: 'بنفتح WhatsApp', reportTrip: 'بلغ عن الرحلة دي', whatWrong: 'إيه المشكلة؟',
    reasons: ['المواعيد غلط', 'المكان غلط', 'قفل خلاص', 'الصور غلط', 'حاجة تانية'], reported: 'شكرا. فريقنا هيبص عليها',
  },
  saved: {
    places: 'أماكن', collections: 'قوايم', emptyTitle: 'لسه ما حفظتش حاجة', emptyBody: 'دوس على علامة الحفظ في أي مكان وهتلاقيه مستنيك هنا.',
    fromTeam: 'محفوظ من {brand}', yours: 'بتوعك', newCollection: 'قايمة جديدة', privateUntilShared: 'خاصة لحد ما تشاركها', added: 'اتحفظ', removed: 'اتشال من المحفوظ',
  },
  collections: {
    private: 'خاصة', public: 'عامة', byTeam: 'من {brand}', places: '{n} مكان', save: 'احفظ القايمة', saved: 'محفوظة', saveAria: 'احفظ {title}',
    gone: 'القايمة دي خاصة أو اتمسحت', emptyTitle: 'لسه مفيش حاجة هنا', emptyBody: 'افتح أي مكان، دوس {more} وضيفه لـ {title}.',
    newSheet: 'قايمة جديدة', namePlaceholder: 'سميها، زي خروجة رومانسية', nameAria: 'اسم القايمة', defaultTitle: 'قايمة جديدة',
    whoCanSee: 'مين يقدر يشوفها', onlyMe: 'أنا بس', anyone: 'أي حد معاه اللينك', createdPublic: 'اتعملت {title}، عامة', createdPrivate: 'اتعملت {title}، خاصة',
    savedToast: 'القايمة اتحفظت. هتلاقيها في المحفوظ', removedToast: 'اتشالت من المحفوظ', publicToast: 'عامة. أي حد معاه اللينك يقدر يشوفها', privateToast: 'خاصة. إنت بس اللي تقدر تشوفها',
    shareSheet: 'شارك القايمة دي', sharePrivate: '{title} خاصة. خليها عامة عشان أي حد معاه اللينك يقدر يفتحها. وتقدر ترجعها خاصة في أي وقت.',
    makePublicShare: 'خليها عامة وشاركها', addedTo: 'اتضاف لـ {title}', removedFrom: 'اتشال من {title}',
  },
  settings: {
    title: 'الإعدادات', preferences: 'التفضيلات', appearance: 'الشكل', light: 'فاتح', dark: 'غامق', auto: 'تلقائي', language: 'اللغة', english: 'English', arabic: 'العربية',
    notify: { near: 'أماكن جديدة قريبة مني', saved: 'جديد الأماكن اللي حفظتها', weekend: 'اقتراحات الويك إند يوم الخميس' },
    help: 'المساعدة', report: 'بلغ عن مشكلة',
  },
  report: {
    title: 'بلغ عن مشكلة', whatHappened: 'إيه اللي حصل؟',
    issues: { bug: 'حاجة بايظة', wrong: 'معلومة غلط', slow: 'بطيء أو مش بيحمل', idea: 'فكرة', other: 'حاجة تانية' },
    tellMore: 'احكيلنا أكتر', detail: 'عملت إيه وشفت إيه', screenshot: 'ضيف سكرين شوت', device: 'هنبعت نوع جهازك ونسخة التطبيق عشان نلاقي المشكلة.',
  },
  correction: {
    title: 'اقترح تصحيح', whatsWrong: 'إيه اللي مش مظبوط؟', rightAnswer: 'الصح',
    issues: { hours: 'مواعيد العمل', location: 'المكان', phone: 'رقم التليفون', closed: 'قفل خلاص', photos: 'الصور', prices: 'الأسعار أو المنيو', name: 'الاسم أو النوع', other: 'حاجة تانية' },
    fields: {
      hours: { label: 'المواعيد الصح', placeholder: 'مثلا: كل يوم من 10 ص لـ 1 بالليل، والجمعة من 1 الضهر' },
      location: { label: 'هو فين بالظبط', placeholder: 'حط لينك Google Maps أو اكتب العنوان' },
      phone: { label: 'الرقم الصح', placeholder: '01x xxxx xxxx' },
      closed: { label: 'من إمتى؟', recent: 'من قريب', months: 'من شهور', unsure: 'مش متأكد' },
      photos: { label: 'إيه المشكلة في الصور؟', placeholder: 'قديمة، مكان تاني، مش شكله الحقيقي…' },
      prices: { label: 'الأسعار الصح', placeholder: 'الصنف وسعره، كل واحد في سطر' },
      name: { label: 'الاسم أو النوع الصح', placeholder: 'اكتبه زي ما الناس بتعرفه' },
      other: { label: 'قولنا إيه الغلط', placeholder: 'جملة واحدة كفاية' },
    },
    howKnow: 'عرفت منين؟', visit: 'كنت هناك', staff: 'بشتغل هناك', online: 'من النت', proof: 'ضيف صورة كدليل', pickPhoto: 'اختار صورة',
    pickFirst: 'اختار الأول إيه اللي مش مظبوط', doneTitle: 'شكرا. فريقنا هيراجعها', doneBody: 'بنراجع كل تصحيح خلال 48 ساعة ونظبط المكان للكل.',
    backToPlace: 'ارجع للمكان',
  },
  owner: {
    title: 'نتايجك', period: '{name}، آخر 30 يوم', reached: 'شخص وصلهم', seen: 'مرة اتشاف', taps: 'ضغطة', actions: 'تفاعل',
    whatPeopleDid: 'الناس عملت إيه', directions: 'طلبوا الاتجاهات', called: 'اتصلوا', savedIt: 'حفظوه', sharedIt: 'شاركوه', costPerAction: 'كل تفاعل كلفك حوالي {n} جنيه.',
    inOneLine: 'في سطر واحد', whereAppeared: 'شوف ظهرت فين', homeFeed: 'فيد الرئيسية', storiesRow: 'صف الستوريز', exploreIn: 'استكشف، {intent}',
    weekly: 'ملخص الأسبوع', weeklyWhatsApp: 'ابعتهولي كل حد على WhatsApp', weeklyAria: 'ملخص الأسبوع على WhatsApp',
  },
};
