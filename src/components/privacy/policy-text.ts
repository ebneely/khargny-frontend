// Privacy policy text, English and Arabic. Draft for owner review (2026-11-14).
// Says only WHAT we collect and why in general terms; never how places are ranked or ads work.
export type PolicyLocale = "en" | "ar";
export type PolicySection = { h: string; p?: string[]; ul?: string[] };
export type PolicyText = { title: string; updated: string; back: string; draft: string; sections: PolicySection[] };

const EMAIL = "5argny.eg@gmail.com";

export const POLICY: Record<PolicyLocale, PolicyText> = {
  en: {
    title: "Privacy policy",
    updated: "Last updated: 14 November 2026",
    back: "Back to home",
    draft: "Draft for owner review",
    sections: [
      { h: "Who we are", p: [`5argny ("Khargny", "we") is an outing guide for Egypt, on the website www.5argny.com and in our mobile app. You do not need an account to use it. Contact: ${EMAIL}.`] },
      { h: "What we collect", p: ["We collect only what we need to show you relevant places nearby, measure what is popular, and improve 5argny."], ul: [
        "A random ID for your app install or your browser (a cookie called khargny_guest_id, kept up to 1 year). On our servers it is stored only as a scrambled code (a hash). It is not your name and not your phone's advertising ID.",
        "What you do in 5argny: pages, places and cities you open, searches you type and the results you tap, and when you save, like, share or tap directions. Plus the language and whether you used the app or the website.",
        "Approximate location, only if you allow it or tap a feature like Near me. Your phone knows your exact position, but we receive only a rounded position (about 1 km), with the city and area.",
        "What you send us on purpose: the text of a correction or problem report, and up to 4 photos or short videos you attach. We remove the location data from photos and videos.",
        "Basic technical details with a problem report (app version, device type, screen size) and, on the website, error reports.",
        "Things that stay on your device only: theme, language, recent searches, places you opened recently.",
      ] },
      { h: "What we do not collect", ul: ["Your name, email, phone number or password (we have no customer accounts).", "Your contacts, camera or microphone.", "Your exact location on our servers.", "Your phone's advertising ID."] },
      { h: "Why we use it", ul: ["To show you relevant places nearby and in your city.", "To measure what is popular, with counts and totals.", "To fix wrong information and bugs you report.", "To keep the service secure and working.", "To improve 5argny."] },
      { h: "How long we keep it", ul: ["App and website activity linked to a scrambled ID: up to 400 days, then deleted. After that only totals without any ID remain.", "Approximate location: up to 400 days.", "Corrections, reports and their photos or videos: kept while we need them to fix the problem, then deleted. You can ask us to delete them sooner.", "The browser cookie: up to 1 year, or until you clear it."] },
      { h: "We do not sell your data", p: ["We do not sell your data, we do not share it with advertisers or data brokers, and we do not track you across other companies' apps or websites."] },
      { h: "Who helps us run 5argny", p: ["These companies process data for us, only to provide the service:"], ul: ["Our hosting and server providers (including Vercel for the website).", "Sentry, which receives error reports from the website.", "Expo, which delivers app updates.", "Google Maps and Apple Maps: when you tap Directions they open in their own app, under their own privacy policy. We do not send them your location."] },
      { h: "Your choices", ul: ["Location is optional. Turn it off in your phone or browser settings and everything still works; you just will not see distances.", "Your browser's Do Not Track and Global Privacy Control signals are respected on the website: no activity is sent.", "Clear the cookie, or uninstall the app, to get a new random ID.", "You can ask to see, correct or delete your data, or object to how we use it, by email (below)."] },
      { h: "Delete your data or contact us", p: [`Email ${EMAIL}. We answer within 30 days. To find your records, include what you sent us (for example the time and text of a report). Activity data is stored under a scrambled ID, so we can only find it if you can give us your app's or browser's ID; we are working on a simpler way.`] },
      { h: "Children", p: ["5argny is not aimed at children under 13 and we do not knowingly collect their data. If you think a child sent us data, email us and we will delete it."] },
      { h: "Egyptian law", p: ["We process personal data under Egypt's Personal Data Protection Law No. 151 of 2020. Under it you have the right to know what we hold, to access and correct it, to withdraw consent, to object, and to ask for deletion. Data is processed on servers that may be outside Egypt, always with the safeguards the law requires."] },
      { h: "Security", p: ["All traffic uses HTTPS. Photos and videos you send are stored privately and visible only to our team. No system is perfectly secure."] },
      { h: "Changes", p: ["When we change this policy we update the date above. For big changes we will tell you in the app or on the website."] },
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث: 14 نوفمبر 2026",
    back: "الرجوع للرئيسية",
    draft: "مسودة لمراجعة المالك",
    sections: [
      { h: "إحنا مين", p: [`خرجني (5argny) دليل خروجات في مصر، على موقع www.5argny.com وفي تطبيق الموبايل. مش لازم تعمل حساب عشان تستخدمه. للتواصل: ${EMAIL}.`] },
      { h: "بنجمع إيه", p: ["بنجمع بس اللي محتاجينه عشان نعرض لك أماكن مناسبة قريبة منك، ونقيس إيه اللي الناس بتحبه، ونحسّن خرجني."], ul: [
        "رقم عشوائي لتثبيت التطبيق أو للمتصفح (كوكي اسمه khargny_guest_id بيفضل لحد سنة). على سيرفراتنا بيتخزن بس في شكل كود مشفّر (hash). مش اسمك ومش معرّف الإعلانات بتاع موبايلك.",
        "اللي بتعمله جوه خرجني: الصفحات والأماكن والمدن اللي بتفتحها، وكلمات البحث والنتائج اللي بتدوس عليها، ولما تحفظ أو تعمل إعجاب أو مشاركة أو تدوس اتجاهات. وكمان اللغة وهل استخدمت التطبيق ولا الموقع.",
        "موقعك التقريبي، بس لو سمحت بيه أو دوست على خاصية زي «قريب مني». موبايلك عارف مكانك بالظبط، لكن إحنا بنستلم مكان مقرَّب (حوالي كيلومتر) مع المدينة والمنطقة.",
        "اللي بتبعته لنا بإرادتك: نص التصحيح أو بلاغ المشكلة، وحتى 4 صور أو فيديوهات قصيرة بتضيفها. بنشيل بيانات الموقع من الصور والفيديوهات.",
        "تفاصيل تقنية بسيطة مع بلاغ المشكلة (إصدار التطبيق ونوع الجهاز وحجم الشاشة)، وعلى الموقع تقارير الأخطاء.",
        "حاجات بتفضل على جهازك بس: الشكل (فاتح/داكن) واللغة وآخر عمليات بحث وآخر أماكن فتحتها.",
      ] },
      { h: "اللي مبنجمعوش", ul: ["اسمك أو إيميلك أو رقم تليفونك أو كلمة سر (مفيش حسابات للعملاء).", "جهات الاتصال أو الكاميرا أو الميكروفون.", "موقعك الدقيق على سيرفراتنا.", "معرّف الإعلانات بتاع موبايلك."] },
      { h: "ليه بنستخدمه", ul: ["نعرض لك أماكن مناسبة قريبة منك وفي مدينتك.", "نقيس إيه اللي الناس بتحبه بأرقام وإجماليات.", "نصلّح المعلومات الغلط والمشاكل اللي بتبلّغ عنها.", "نحافظ على أمان الخدمة وإنها تشتغل.", "نحسّن خرجني."] },
      { h: "بنحتفظ بيه قد إيه", ul: ["نشاطك على التطبيق والموقع المرتبط بكود مشفّر: لحد 400 يوم وبعدها بيتمسح. بعد كده بيفضل بس إجماليات من غير أي معرّف.", "الموقع التقريبي: لحد 400 يوم.", "التصحيحات والبلاغات وصورها وفيديوهاتها: بنحتفظ بيها طول ما محتاجينها نصلّح المشكلة وبعدين بتتمسح. تقدر تطلب مسحها بدري.", "كوكي المتصفح: لحد سنة أو لحد ما تمسحه."] },
      { h: "مبنبيعش بياناتك", p: ["مبنبيعش بياناتك، ومبنشاركهاش مع معلنين أو سماسرة بيانات، ومبنتتبعكش عبر تطبيقات أو مواقع شركات تانية."] },
      { h: "مين بيساعدنا نشغّل خرجني", p: ["الشركات دي بتعالج بيانات لحسابنا، بس عشان تقدّم الخدمة:"], ul: ["مزوّدو الاستضافة والسيرفرات (منهم Vercel للموقع).", "Sentry، بيستقبل تقارير الأخطاء من الموقع.", "Expo، بيوصّل تحديثات التطبيق.", "خرائط جوجل وخرائط أبل: لما تدوس اتجاهات بتفتح في تطبيقها هي وتحت سياسة الخصوصية بتاعتها. مبنبعتلهمش موقعك."] },
      { h: "اختياراتك", ul: ["الموقع اختياري. اقفله من إعدادات الموبايل أو المتصفح وكل حاجة هتشتغل، بس مش هتشوف المسافات.", "إشارتا «عدم التتبع» و Global Privacy Control في المتصفح بنحترمهم على الموقع: مفيش نشاط بيتبعت.", "امسح الكوكي أو احذف التطبيق عشان تاخد رقم عشوائي جديد.", "تقدر تطلب تشوف بياناتك أو تصححها أو تمسحها أو تعترض على استخدامها بإيميل (تحت)."] },
      { h: "امسح بياناتك أو كلّمنا", p: [`ابعت على ${EMAIL}. بنرد خلال 30 يوم. عشان نلاقي بياناتك اكتب لنا اللي بعتّه (مثلاً وقت ونص البلاغ). نشاطك متخزن بكود مشفّر، فمش هنقدر نلاقيه إلا لو قدرت تدّينا رقم التطبيق أو المتصفح. بنشتغل على طريقة أسهل.`] },
      { h: "الأطفال", p: ["خرجني مش موجّه للأطفال تحت 13 سنة ومبنجمعش بياناتهم عن قصد. لو شايف إن طفل بعت لنا بيانات، ابعت لنا إيميل وهنمسحها."] },
      { h: "القانون المصري", p: ["بنعالج البيانات الشخصية طبقاً لقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020. وهو بيدّيك الحق إنك تعرف إحنا معانا إيه، وتطّلع عليه وتصححه، وتسحب موافقتك، وتعترض، وتطلب المسح. ممكن البيانات تتعالج على سيرفرات خارج مصر، ودايماً بالضمانات اللي القانون بيطلبها."] },
      { h: "الأمان", p: ["كل الاتصالات بـ HTTPS. الصور والفيديوهات اللي بتبعتها بتتخزن بشكل خاص ومبيشوفهاش غير فريقنا. مفيش نظام آمن 100٪."] },
      { h: "التغييرات", p: ["لما بنغيّر السياسة بنحدّث التاريخ فوق. ولو التغيير كبير هنقولك في التطبيق أو على الموقع."] },
    ],
  },
};
