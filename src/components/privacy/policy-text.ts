// Privacy policy text, English and Arabic (2026-11-14). Matches store-listing/privacy-2026-11-14/INVENTORY-2026-11-14b.md.
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
      { h: "Using 5argny means you agree", p: ["By using 5argny (the app or the website), you agree to the collection and use of your information as described in this policy. If you do not agree, please do not use 5argny."] },
      { h: "Who we are", p: [`5argny ("Khargny", "we") is an outing guide for Egypt, on the website www.5argny.com and in our mobile app. You do not need an account to use the guide. Contact: ${EMAIL}.`] },
      { h: "What we collect", p: ["We collect only what we need to show you relevant places nearby, count what is popular, and improve 5argny."], ul: [
        "A random ID for your app install or your browser (a cookie called khargny_guest_id, kept up to 1 year). For counting visits, our servers keep it only as a scrambled code (a hash). Your saved places and likes are kept under the ID itself, so they stay with you. It is not your name and not your phone's advertising ID.",
        "What you do in 5argny: pages, places and cities you open, places shown on your screen, searches you type and the results you tap, and when you save, like, share, tap directions or the 5argny button. Also which places and offers you view or tap, the language, and whether you used the app or the website.",
        "Approximate location, only after you allow location in your phone's or browser's permission prompt. Your phone knows your exact position, but we receive only a rounded position (about 1 km), and we work out the city and area from it.",
        "Photos and videos, only if you choose to attach them to a correction or a problem report, after you allow access in your phone's permission prompt. You can attach up to 4. We remove the location data from them.",
        "What you write in a correction or problem report, plus basic technical details with a problem report (app version, device type, screen size).",
        "On the website, error reports, and for a small share of visits and every visit that hits an error, a recording of the screen with all text hidden and images blocked.",
        "Trips on the website only: if you create a trips account, your name, email, phone number and password (stored scrambled), plus your bookings, messages and ratings. If you view, like or report a trip in the Marketplace, we keep that with your random ID.",
        "Things that stay on your device only: theme, language, favourites, recent searches, places you opened recently, and which tips you have seen.",
      ] },
      { h: "What we do not collect", ul: ["Your name, email, phone number or password if you only browse (the guide has no accounts).", "Your contacts or microphone.", "Your camera, unless you pick a photo or video yourself.", "Your exact location on our servers.", "Your phone's advertising ID."] },
      { h: "Why we use it", ul: ["To show you relevant places nearby and in your city.", "To count what is popular.", "To fix wrong information and bugs you report.", "To keep the service secure, stop abuse and keep it working.", "To improve 5argny."] },
      { h: "How long we keep it", ul: ["Activity linked to a scrambled ID, search words and approximate location: up to 400 days, then deleted. After that only totals without any ID remain.", "Counts of what was shown on screen: about 2 months.", "Saved places, likes, corrections, reports and their photos or videos: until you ask us to delete them or we no longer need them.", "Trips account data: until you ask us to delete it.", "The browser cookie: up to 1 year, or until you clear it.", "Limits that stop spam use your internet address for 24 hours and are then dropped."] },
      { h: "We do not sell your data", p: ["We do not sell your data, we do not share it with advertisers or data brokers, and we do not track you across other companies' apps or websites."] },
      { h: "Service providers and maps", p: ["We use trusted service providers to host and run 5argny. They process data only on our behalf and only to provide the service. We do not sell your data.", "Directions opens your maps app. That app has its own privacy policy and handles what you do there."] },
      { h: "Your choices", ul: ["Location and photos are optional. Say no in the permission prompt, or turn them off in your phone or browser settings, and everything else still works.", "Your browser's Do Not Track and Global Privacy Control signals are respected on the website: no activity is sent.", "Clear the cookie, or uninstall the app, to get a new random ID.", `You can ask to see, correct or delete your data by email to ${EMAIL}.`] },
      { h: "See, correct or delete your data", p: [`Email ${EMAIL}. We answer within 30 days. To find your records, include what you sent us (for example the time and text of a report). Visit activity is stored under a scrambled ID, so we can only find it if you give us your app's or browser's ID.`] },
      { h: "Children", p: ["5argny is for people aged 13 and over, and we do not knowingly collect data from younger children. Some places listed serve alcohol or tobacco and are meant for adults. If you think a child sent us data, email us and we will delete it."] },
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
      { h: "استخدامك لخرجني معناه إنك موافق", p: ["باستخدامك خرجني (التطبيق أو الموقع)، إنت بتوافق على جمع واستخدام معلوماتك زي ما هو مكتوب في السياسة دي. لو مش موافق، من فضلك متستخدمش خرجني."] },
      { h: "إحنا مين", p: [`خرجني (5argny) دليل خروجات في مصر، على موقع www.5argny.com وفي تطبيق الموبايل. مش لازم تعمل حساب عشان تستخدم الدليل. للتواصل: ${EMAIL}.`] },
      { h: "بنجمع إيه", p: ["بنجمع بس اللي محتاجينه عشان نعرض لك أماكن مناسبة قريبة منك، ونعدّ إيه اللي الناس بتحبه، ونحسّن خرجني."], ul: [
        "رقم عشوائي لتثبيت التطبيق أو للمتصفح (كوكي اسمه khargny_guest_id بيفضل لحد سنة). لعدّ الزيارات، سيرفراتنا بتحتفظ بيه في شكل كود مشفّر (hash) بس. أماكنك المحفوظة وإعجاباتك بتتخزن بالرقم نفسه عشان تفضل معاك. مش اسمك ومش معرّف الإعلانات بتاع موبايلك.",
        "اللي بتعمله جوه خرجني: الصفحات والأماكن والمدن اللي بتفتحها، والأماكن اللي ظهرت على شاشتك، وكلمات البحث والنتائج اللي بتدوس عليها، ولما تحفظ أو تعمل إعجاب أو مشاركة أو تدوس اتجاهات أو زرار خرجني. وكمان الأماكن والعروض اللي بتشوفها أو بتدوس عليها، واللغة، وهل استخدمت التطبيق ولا الموقع.",
        "موقعك التقريبي، بس بعد ما تسمح بالموقع في رسالة الإذن بتاعة موبايلك أو المتصفح. موبايلك عارف مكانك بالظبط، لكن إحنا بنستلم مكان مقرَّب (حوالي كيلومتر)، ونحدد منه المدينة والمنطقة.",
        "صور وفيديوهات، بس لو اخترت تضيفها لتصحيح أو بلاغ مشكلة، وبعد ما تسمح بالوصول في رسالة الإذن بتاعة موبايلك. تقدر تضيف لحد 4. بنشيل بيانات الموقع منها.",
        "اللي بتكتبه في التصحيح أو بلاغ المشكلة، وتفاصيل تقنية بسيطة مع بلاغ المشكلة (إصدار التطبيق ونوع الجهاز وحجم الشاشة).",
        "على الموقع: تقارير الأخطاء، ولنسبة صغيرة من الزيارات وكل زيارة فيها خطأ، تسجيل للشاشة بيخفي كل النصوص ويمنع الصور.",
        "الرحلات على الموقع بس: لو عملت حساب رحلات، بنحتفظ باسمك وإيميلك ورقم تليفونك وكلمة السر (متخزنة مشفّرة)، وحجوزاتك ورسايلك وتقييماتك. ولو شفت رحلة في السوق أو عملت لها إعجاب أو بلّغت عنها، بنحتفظ بده مع رقمك العشوائي.",
        "حاجات بتفضل على جهازك بس: الشكل (فاتح/داكن) واللغة والمفضلة وآخر عمليات بحث وآخر أماكن فتحتها والنصايح اللي شفتها.",
      ] },
      { h: "اللي مبنجمعوش", ul: ["اسمك أو إيميلك أو رقم تليفونك أو كلمة سر لو بتتصفح بس (الدليل مفيهوش حسابات).", "جهات الاتصال أو الميكروفون.", "الكاميرا، إلا لو اخترت صورة أو فيديو بنفسك.", "موقعك الدقيق على سيرفراتنا.", "معرّف الإعلانات بتاع موبايلك."] },
      { h: "ليه بنستخدمه", ul: ["نعرض لك أماكن مناسبة قريبة منك وفي مدينتك.", "نعدّ إيه اللي الناس بتحبه.", "نصلّح المعلومات الغلط والمشاكل اللي بتبلّغ عنها.", "نحافظ على أمان الخدمة ونمنع الإساءة ونخليها شغالة.", "نحسّن خرجني."] },
      { h: "بنحتفظ بيه قد إيه", ul: ["النشاط المرتبط بكود مشفّر وكلمات البحث والموقع التقريبي: لحد 400 يوم وبعدها بيتمسح. بعد كده بيفضل بس إجماليات من غير أي معرّف.", "أعداد اللي ظهر على الشاشة: حوالي شهرين.", "الأماكن المحفوظة والإعجابات والتصحيحات والبلاغات وصورها وفيديوهاتها: لحد ما تطلب مسحها أو ما نعدّش محتاجينها.", "بيانات حساب الرحلات: لحد ما تطلب مسحها.", "كوكي المتصفح: لحد سنة، أو لحد ما تمسحه.", "حدود منع الإزعاج بتستخدم عنوان الإنترنت بتاعك 24 ساعة وبعدها بتتمسح."] },
      { h: "مبنبيعش بياناتك", p: ["مبنبيعش بياناتك، ومبنشاركهاش مع معلنين أو سماسرة بيانات، ومبنتتبعكش عبر تطبيقات أو مواقع شركات تانية."] },
      { h: "مزوّدو الخدمة والخرائط", p: ["بنستخدم مزوّدي خدمة موثوقين لاستضافة خرجني وتشغيله. بيعالجوا البيانات لحسابنا بس وعشان يقدّموا الخدمة بس. مبنبيعش بياناتك.", "زرار الاتجاهات بيفتح تطبيق الخرائط عندك. التطبيق ده ليه سياسة خصوصية خاصة بيه وهو اللي بيتعامل مع اللي بتعمله فيه."] },
      { h: "اختياراتك", ul: ["الموقع والصور اختياريين. قول لأ في رسالة الإذن، أو اقفلهم من إعدادات الموبايل أو المتصفح، وباقي الخدمة هتفضل شغالة.", "إشارتا «عدم التتبع» و Global Privacy Control في المتصفح بنحترمهم على الموقع: مفيش نشاط بيتبعت.", "امسح الكوكي أو احذف التطبيق عشان تاخد رقم عشوائي جديد.", `تقدر تطلب تشوف بياناتك أو تصححها أو تمسحها بإيميل على ${EMAIL}.`] },
      { h: "اطّلع على بياناتك أو صححها أو امسحها", p: [`ابعت على ${EMAIL}. بنرد خلال 30 يوم. عشان نلاقي بياناتك اكتب لنا اللي بعتّه (مثلاً وقت ونص البلاغ). نشاط الزيارات متخزن بكود مشفّر، فمش هنقدر نلاقيه إلا لو دّيتنا رقم التطبيق أو المتصفح.`] },
      { h: "الأطفال", p: ["خرجني لمن هم 13 سنة فأكتر، ومبنجمعش بيانات أطفال أصغر عن قصد. بعض الأماكن في الدليل بتقدّم مشروبات كحولية أو تبغ وهي للكبار. لو شايف إن طفل بعت لنا بيانات، ابعت لنا إيميل وهنمسحها."] },
      { h: "القانون المصري", p: ["بنعالج البيانات الشخصية طبقاً لقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020. وهو بيدّيك الحق إنك تعرف إحنا معانا إيه، وتطّلع عليه وتصححه، وتسحب موافقتك، وتعترض، وتطلب المسح. ممكن البيانات تتعالج على سيرفرات برا مصر، دايماً بالضمانات اللي القانون بيطلبها."] },
      { h: "الأمان", p: ["كل الاتصالات بـ HTTPS. الصور والفيديوهات اللي بتبعتها بتتخزن بشكل خاص ومبيشوفهاش غير فريقنا. مفيش نظام آمن 100٪."] },
      { h: "التغييرات", p: ["لما بنغيّر السياسة بنحدّث التاريخ فوق. ولو التغيير كبير هنقولك في التطبيق أو على الموقع."] },
    ],
  },
};
