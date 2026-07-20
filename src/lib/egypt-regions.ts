/**
 * Egypt's administrative model, as this product uses it:
 *
 *   CITY   = one of the 27 governorates (Cairo, Giza, South Sinai, Red Sea …)
 *   REGION = a district or area inside it (Nasr City, Zamalek, Naama Bay, Smouha)
 *
 * Region is the level a visitor thinks in — nobody searches for "a cafe in Cairo", they
 * search for "a cafe in Zamalek" — while the city is the governorate it belongs to.
 *
 * Egypt has 27 governorates, not 28: Luxor became the 29th in 2009, then Helwan and 6th of
 * October were dissolved back into Cairo and Giza in 2011. All 27 are represented here and
 * every one has at least one region, so no part of the country is unreachable.
 *
 * `governorate` is the city and the grouping key. `town` is the settlement an area sits in
 * (Naama Bay is in the town of Sharm El Sheikh, in the South Sinai governorate) — shown as
 * context, not used for grouping.
 */

export interface EgyptRegion {
  /** Stored value — English name of the district/area. */
  value: string;
  /** Arabic name, so an Arabic-first editor can find it. */
  nameAr: string;
  /** The settlement this area sits in — context only, e.g. 'Sharm El Sheikh'. */
  town: string;
  /** The governorate = the CITY in this product's model. The picker groups by this. */
  governorate: string;
  /** Extra search terms: alternate spellings, landmarks. */
  keywords?: string[];
}

export const EGYPT_REGIONS: EgyptRegion[] = [
  // ══ CAIRO ═════════════════════════════════════════════════════════════════════════════
  { value: 'Downtown', nameAr: 'وسط البلد', town: 'Cairo', governorate: 'Cairo', keywords: ['wust el balad', 'tahrir', 'city centre'] },
  { value: 'Zamalek', nameAr: 'الزمالك', town: 'Cairo', governorate: 'Cairo', keywords: ['gezira', 'island'] },
  { value: 'Garden City', nameAr: 'جاردن سيتي', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Maadi', nameAr: 'المعادي', town: 'Cairo', governorate: 'Cairo', keywords: ['degla', 'old maadi'] },
  { value: 'New Maadi', nameAr: 'المعادي الجديدة', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Zahraa El Maadi', nameAr: 'زهراء المعادي', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Nasr City', nameAr: 'مدينة نصر', town: 'Cairo', governorate: 'Cairo', keywords: ['madinet nasr', 'abbas el akkad', 'makram ebeid'] },
  { value: 'Heliopolis', nameAr: 'مصر الجديدة', town: 'Cairo', governorate: 'Cairo', keywords: ['masr el gedida', 'korba', 'roxy', 'baron'] },
  { value: 'Almaza', nameAr: 'ألماظة', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Sheraton Heliopolis', nameAr: 'شيراتون المطار', town: 'Cairo', governorate: 'Cairo', keywords: ['sheraton', 'airport'] },
  { value: 'Ard El Golf', nameAr: 'أرض الجولف', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Nozha', nameAr: 'النزهة', town: 'Cairo', governorate: 'Cairo' },
  { value: 'New Cairo', nameAr: 'القاهرة الجديدة', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Fifth Settlement', nameAr: 'التجمع الخامس', town: 'Cairo', governorate: 'Cairo', keywords: ['tagamoa khames', 'tagamo3', 'katameya heights'] },
  { value: 'First Settlement', nameAr: 'التجمع الأول', town: 'Cairo', governorate: 'Cairo', keywords: ['tagamoa awal'] },
  { value: 'Rehab City', nameAr: 'مدينة الرحاب', town: 'Cairo', governorate: 'Cairo', keywords: ['el rehab'] },
  { value: 'Madinaty', nameAr: 'مدينتي', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Shorouk', nameAr: 'الشروق', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Obour', nameAr: 'العبور', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Badr City', nameAr: 'مدينة بدر', town: 'Cairo', governorate: 'Cairo' },
  { value: 'New Administrative Capital', nameAr: 'العاصمة الإدارية الجديدة', town: 'Cairo', governorate: 'Cairo', keywords: ['capital', 'asema edareya'] },
  { value: 'Mokattam', nameAr: 'المقطم', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Manial', nameAr: 'المنيل', town: 'Cairo', governorate: 'Cairo', keywords: ['roda', 'manyal'] },
  { value: 'Sayeda Zeinab', nameAr: 'السيدة زينب', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Old Cairo', nameAr: 'مصر القديمة', town: 'Cairo', governorate: 'Cairo', keywords: ['masr el qadima', 'coptic cairo'] },
  { value: 'Islamic Cairo', nameAr: 'القاهرة الإسلامية', town: 'Cairo', governorate: 'Cairo', keywords: ['khan el khalili', 'hussein', 'moez'] },
  { value: 'Abdeen', nameAr: 'عابدين', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Azbakeya', nameAr: 'الأزبكية', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Darb El Ahmar', nameAr: 'الدرب الأحمر', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Gamaleya', nameAr: 'الجمالية', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Boulaq', nameAr: 'بولاق', town: 'Cairo', governorate: 'Cairo', keywords: ['abu el ela'] },
  { value: 'Abbassia', nameAr: 'العباسية', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Ghamra', nameAr: 'غمرة', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Ain Shams', nameAr: 'عين شمس', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Matareya', nameAr: 'المطرية', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Marg', nameAr: 'المرج', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Salam City', nameAr: 'مدينة السلام', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Shubra', nameAr: 'شبرا', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Rod El Farag', nameAr: 'روض الفرج', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Sahel', nameAr: 'الساحل', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Zeitoun', nameAr: 'الزيتون', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Hadayek El Kobba', nameAr: 'حدائق القبة', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Waili', nameAr: 'الوايلي', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Zawya El Hamra', nameAr: 'الزاوية الحمراء', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Sharabiya', nameAr: 'الشرابية', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Amiriya', nameAr: 'الأميرية', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Manshiyat Naser', nameAr: 'منشية ناصر', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Khalifa', nameAr: 'الخليفة', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Basatin', nameAr: 'البساتين', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Dar El Salam', nameAr: 'دار السلام', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Helwan', nameAr: 'حلوان', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Maasara', nameAr: 'المعصرة', town: 'Cairo', governorate: 'Cairo' },
  { value: 'Tora', nameAr: 'طرة', town: 'Cairo', governorate: 'Cairo' },
  { value: 'El Tebbin', nameAr: 'التبين', town: 'Cairo', governorate: 'Cairo' },
  { value: '15th of May City', nameAr: 'مدينة ١٥ مايو', town: 'Cairo', governorate: 'Cairo' },

  // ══ GIZA ══════════════════════════════════════════════════════════════════════════════
  { value: 'Dokki', nameAr: 'الدقي', town: 'Giza', governorate: 'Giza' },
  { value: 'Mohandessin', nameAr: 'المهندسين', town: 'Giza', governorate: 'Giza', keywords: ['gameat el dowal', 'arab league'] },
  { value: 'Agouza', nameAr: 'العجوزة', town: 'Giza', governorate: 'Giza' },
  { value: 'Haram', nameAr: 'الهرم', town: 'Giza', governorate: 'Giza', keywords: ['pyramids', 'faisal'] },
  { value: 'Faisal', nameAr: 'فيصل', town: 'Giza', governorate: 'Giza' },
  { value: 'Nazlet El Semman', nameAr: 'نزلة السمان', town: 'Giza', governorate: 'Giza', keywords: ['pyramids', 'sphinx'] },
  { value: 'Hadayek El Ahram', nameAr: 'حدائق الأهرام', town: 'Giza', governorate: 'Giza' },
  { value: 'Giza Square', nameAr: 'ميدان الجيزة', town: 'Giza', governorate: 'Giza' },
  { value: 'Mounib', nameAr: 'المنيب', town: 'Giza', governorate: 'Giza' },
  { value: 'Omraniya', nameAr: 'العمرانية', town: 'Giza', governorate: 'Giza' },
  { value: 'Bulaq El Dakrour', nameAr: 'بولاق الدكرور', town: 'Giza', governorate: 'Giza' },
  { value: 'Imbaba', nameAr: 'إمبابة', town: 'Giza', governorate: 'Giza', keywords: ['kit kat'] },
  { value: 'Kit Kat', nameAr: 'الكيت كات', town: 'Giza', governorate: 'Giza' },
  { value: 'Warraq', nameAr: 'الوراق', town: 'Giza', governorate: 'Giza' },
  { value: 'Talbia', nameAr: 'الطالبية', town: 'Giza', governorate: 'Giza' },
  { value: '6th of October City', nameAr: 'مدينة ٦ أكتوبر', town: '6th of October', governorate: 'Giza', keywords: ['october', 'juhayna square'] },
  { value: 'Sheikh Zayed', nameAr: 'الشيخ زايد', town: '6th of October', governorate: 'Giza', keywords: ['zayed', 'arkan', 'beverly hills'] },
  { value: 'Hadayek October', nameAr: 'حدائق أكتوبر', town: '6th of October', governorate: 'Giza' },
  { value: 'Smart Village', nameAr: 'القرية الذكية', town: '6th of October', governorate: 'Giza' },
  { value: 'Media Production City', nameAr: 'مدينة الإنتاج الإعلامي', town: '6th of October', governorate: 'Giza' },
  { value: 'Kerdasa', nameAr: 'كرداسة', town: 'Giza', governorate: 'Giza' },
  { value: 'Saqqara', nameAr: 'سقارة', town: 'Giza', governorate: 'Giza', keywords: ['step pyramid'] },
  { value: 'Dahshur', nameAr: 'دهشور', town: 'Giza', governorate: 'Giza' },
  { value: 'El Badrashin', nameAr: 'البدرشين', town: 'Giza', governorate: 'Giza', keywords: ['memphis'] },
  { value: 'El Ayyat', nameAr: 'العياط', town: 'Giza', governorate: 'Giza' },
  { value: 'Abu El Numrus', nameAr: 'أبو النمرس', town: 'Giza', governorate: 'Giza' },

  // ══ ALEXANDRIA ════════════════════════════════════════════════════════════════════════
  { value: 'Smouha', nameAr: 'سموحة', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Sidi Gaber', nameAr: 'سيدي جابر', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Roushdy', nameAr: 'رشدي', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Stanley', nameAr: 'ستانلي', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'San Stefano', nameAr: 'سان ستيفانو', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Gleem', nameAr: 'جليم', town: 'Alexandria', governorate: 'Alexandria', keywords: ['glim'] },
  { value: 'Louran', nameAr: 'لوران', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Sporting', nameAr: 'سبورتنج', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Cleopatra', nameAr: 'كليوباترا', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Ibrahimiya', nameAr: 'الإبراهيمية', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Camp Caesar', nameAr: 'كامب شيزار', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Shatby', nameAr: 'الشاطبي', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Raml Station', nameAr: 'محطة الرمل', town: 'Alexandria', governorate: 'Alexandria', keywords: ['mahatet el raml', 'downtown'] },
  { value: 'Mansheya', nameAr: 'المنشية', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Anfoushi', nameAr: 'الأنفوشي', town: 'Alexandria', governorate: 'Alexandria', keywords: ['bahary'] },
  { value: 'Bahary', nameAr: 'بحري', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'El Gomrok', nameAr: 'الجمرك', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Karmouz', nameAr: 'كرموز', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Moharram Bey', nameAr: 'محرم بك', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Kafr Abdo', nameAr: 'كفر عبده', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Zizinia', nameAr: 'زيزينيا', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Saba Pasha', nameAr: 'سابا باشا', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Bulkely', nameAr: 'بولكلي', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Fleming', nameAr: 'فلمنج', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Victoria', nameAr: 'فيكتوريا', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Sidi Bishr', nameAr: 'سيدي بشر', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Miami', nameAr: 'ميامي', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Asafra', nameAr: 'العصافرة', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Mandara', nameAr: 'المندرة', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Montaza', nameAr: 'المنتزه', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Maamoura', nameAr: 'المعمورة', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Abu Qir', nameAr: 'أبو قير', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Agami', nameAr: 'العجمي', town: 'Alexandria', governorate: 'Alexandria', keywords: ['bitash', 'hannoville'] },
  { value: 'Bitash', nameAr: 'البيطاش', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Hannoville', nameAr: 'هانوفيل', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Dekheila', nameAr: 'الدخيلة', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Wardian', nameAr: 'الورديان', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Amreya', nameAr: 'العامرية', town: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Borg El Arab', nameAr: 'برج العرب', town: 'Borg El Arab', governorate: 'Alexandria' },
  { value: 'New Borg El Arab', nameAr: 'برج العرب الجديدة', town: 'Borg El Arab', governorate: 'Alexandria' },
  { value: 'Sidi Kerir', nameAr: 'سيدي كرير', town: 'Alexandria', governorate: 'Alexandria' },

  // ══ SHARM EL SHEIKH & SOUTH SINAI ═════════════════════════════════════════════════════
  { value: 'Naama Bay', nameAr: 'خليج نعمة', town: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Hadaba', nameAr: 'الهضبة', town: 'Sharm El Sheikh', governorate: 'South Sinai', keywords: ['umm el sid', 'om el seid'] },
  { value: 'Sharm El Maya', nameAr: 'شرم المية', town: 'Sharm El Sheikh', governorate: 'South Sinai', keywords: ['old market'] },
  { value: 'Old Market', nameAr: 'السوق القديم', town: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Nabq Bay', nameAr: 'خليج نبق', town: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: "Shark's Bay", nameAr: 'خليج القرش', town: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Ras Nasrani', nameAr: 'رأس نصراني', town: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Montazah Sharm', nameAr: 'المنتزه', town: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Hay El Nour', nameAr: 'حي النور', town: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Rowaysat', nameAr: 'الرويسات', town: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Soho Square', nameAr: 'سوهو سكوير', town: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Assalah', nameAr: 'العسلة', town: 'Dahab', governorate: 'South Sinai', keywords: ['masbat', 'mashraba'] },
  { value: 'Masbat', nameAr: 'المسبط', town: 'Dahab', governorate: 'South Sinai' },
  { value: 'Mashraba', nameAr: 'المشربة', town: 'Dahab', governorate: 'South Sinai' },
  { value: 'Lighthouse', nameAr: 'اللايت هاوس', town: 'Dahab', governorate: 'South Sinai' },
  { value: 'Blue Hole', nameAr: 'البلو هول', town: 'Dahab', governorate: 'South Sinai' },
  { value: 'Laguna', nameAr: 'اللاجونا', town: 'Dahab', governorate: 'South Sinai' },
  { value: 'Nuweiba', nameAr: 'نويبع', town: 'Nuweiba', governorate: 'South Sinai', keywords: ['ras shitan', 'tarabin'] },
  { value: 'Taba', nameAr: 'طابا', town: 'Taba', governorate: 'South Sinai' },
  { value: 'Saint Catherine', nameAr: 'سانت كاترين', town: 'Saint Catherine', governorate: 'South Sinai', keywords: ['mount sinai'] },
  { value: 'El Tor', nameAr: 'الطور', town: 'El Tor', governorate: 'South Sinai' },
  { value: 'Ras Sudr', nameAr: 'رأس سدر', town: 'Ras Sudr', governorate: 'South Sinai' },

  // ══ HURGHADA & RED SEA ════════════════════════════════════════════════════════════════
  { value: 'Dahar', nameAr: 'الدهار', town: 'Hurghada', governorate: 'Red Sea', keywords: ['old town'] },
  { value: 'Sakkala', nameAr: 'السقالة', town: 'Hurghada', governorate: 'Red Sea', keywords: ['saqqala', 'marina'] },
  { value: 'Sheraton Road', nameAr: 'شارع شيراتون', town: 'Hurghada', governorate: 'Red Sea' },
  { value: 'El Mamsha', nameAr: 'الممشى', town: 'Hurghada', governorate: 'Red Sea', keywords: ['promenade', 'tourist walkway'] },
  { value: 'El Ahyaa', nameAr: 'الأحياء', town: 'Hurghada', governorate: 'Red Sea' },
  { value: 'El Kawther', nameAr: 'الكوثر', town: 'Hurghada', governorate: 'Red Sea' },
  { value: 'Village Road', nameAr: 'طريق الفيلدج', town: 'Hurghada', governorate: 'Red Sea' },
  { value: 'Magawish', nameAr: 'مجاويش', town: 'Hurghada', governorate: 'Red Sea' },
  { value: 'Sahl Hasheesh', nameAr: 'سهل حشيش', town: 'Hurghada', governorate: 'Red Sea' },
  { value: 'Makadi Bay', nameAr: 'خليج مكادي', town: 'Hurghada', governorate: 'Red Sea' },
  { value: 'Soma Bay', nameAr: 'سوما باي', town: 'Safaga', governorate: 'Red Sea' },
  { value: 'Safaga', nameAr: 'سفاجا', town: 'Safaga', governorate: 'Red Sea' },
  { value: 'El Gouna Downtown', nameAr: 'داون تاون الجونة', town: 'El Gouna', governorate: 'Red Sea' },
  { value: 'Abu Tig Marina', nameAr: 'مارينا أبو تيج', town: 'El Gouna', governorate: 'Red Sea' },
  { value: 'Mangroovy Beach', nameAr: 'مانجروفي', town: 'El Gouna', governorate: 'Red Sea' },
  { value: 'Tawila', nameAr: 'الطويلة', town: 'El Gouna', governorate: 'Red Sea' },
  { value: 'Marsa Alam', nameAr: 'مرسى علم', town: 'Marsa Alam', governorate: 'Red Sea' },
  { value: 'Port Ghalib', nameAr: 'بورت غالب', town: 'Marsa Alam', governorate: 'Red Sea' },
  { value: 'El Quseir', nameAr: 'القصير', town: 'El Quseir', governorate: 'Red Sea' },
  { value: 'Ras Ghareb', nameAr: 'رأس غارب', town: 'Ras Ghareb', governorate: 'Red Sea' },

  // ══ NORTH COAST & MATROUH ═════════════════════════════════════════════════════════════
  { value: 'Marsa Matrouh City', nameAr: 'مدينة مرسى مطروح', town: 'Marsa Matrouh', governorate: 'Matrouh', keywords: ['cleopatra beach'] },
  { value: 'Sidi Abdel Rahman', nameAr: 'سيدي عبد الرحمن', town: 'North Coast', governorate: 'Matrouh', keywords: ['sahel'] },
  { value: 'Almaza Bay', nameAr: 'ألماظة باي', town: 'North Coast', governorate: 'Matrouh' },
  { value: 'Marina El Alamein', nameAr: 'مارينا العلمين', town: 'North Coast', governorate: 'Matrouh', keywords: ['marina'] },
  { value: 'New Alamein', nameAr: 'العلمين الجديدة', town: 'North Coast', governorate: 'Matrouh' },
  { value: 'Ras El Hekma', nameAr: 'رأس الحكمة', town: 'North Coast', governorate: 'Matrouh' },
  { value: 'Fouka Bay', nameAr: 'فوكا باي', town: 'North Coast', governorate: 'Matrouh' },
  { value: 'Sidi Heneish', nameAr: 'سيدي حنيش', town: 'North Coast', governorate: 'Matrouh' },
  { value: 'El Dabaa', nameAr: 'الضبعة', town: 'North Coast', governorate: 'Matrouh' },
  { value: 'Siwa Oasis', nameAr: 'واحة سيوة', town: 'Siwa', governorate: 'Matrouh', keywords: ['shali', 'cleopatra spring'] },
  { value: 'Salloum', nameAr: 'السلوم', town: 'Salloum', governorate: 'Matrouh' },

  // ══ LUXOR ═════════════════════════════════════════════════════════════════════════════
  { value: 'Luxor East Bank', nameAr: 'البر الشرقي', town: 'Luxor', governorate: 'Luxor', keywords: ['corniche', 'luxor temple'] },
  { value: 'Luxor West Bank', nameAr: 'البر الغربي', town: 'Luxor', governorate: 'Luxor', keywords: ['valley of the kings', 'qurna'] },
  { value: 'Karnak', nameAr: 'الكرنك', town: 'Luxor', governorate: 'Luxor' },
  { value: 'New Luxor', nameAr: 'الأقصر الجديدة', town: 'Luxor', governorate: 'Luxor' },
  { value: 'Armant', nameAr: 'أرمنت', town: 'Armant', governorate: 'Luxor' },
  { value: 'Esna', nameAr: 'إسنا', town: 'Esna', governorate: 'Luxor' },

  // ══ ASWAN ═════════════════════════════════════════════════════════════════════════════
  { value: 'Aswan Corniche', nameAr: 'كورنيش أسوان', town: 'Aswan', governorate: 'Aswan' },
  { value: 'Elephantine Island', nameAr: 'جزيرة إلفنتين', town: 'Aswan', governorate: 'Aswan' },
  { value: 'Gharb Soheil', nameAr: 'غرب سهيل', town: 'Aswan', governorate: 'Aswan', keywords: ['nubian village'] },
  { value: 'New Aswan', nameAr: 'أسوان الجديدة', town: 'Aswan', governorate: 'Aswan' },
  { value: 'Kom Ombo', nameAr: 'كوم أمبو', town: 'Kom Ombo', governorate: 'Aswan' },
  { value: 'Edfu', nameAr: 'إدفو', town: 'Edfu', governorate: 'Aswan' },
  { value: 'Abu Simbel', nameAr: 'أبو سمبل', town: 'Abu Simbel', governorate: 'Aswan' },

  // ══ CANAL CITIES ══════════════════════════════════════════════════════════════════════
  { value: 'Port Fouad', nameAr: 'بورفؤاد', town: 'Port Said', governorate: 'Port Said' },
  { value: 'El Sharq District', nameAr: 'حي الشرق', town: 'Port Said', governorate: 'Port Said' },
  { value: 'El Arab District', nameAr: 'حي العرب', town: 'Port Said', governorate: 'Port Said' },
  { value: 'El Manakh', nameAr: 'حي المناخ', town: 'Port Said', governorate: 'Port Said' },
  { value: 'El Dawahy', nameAr: 'حي الضواحي', town: 'Port Said', governorate: 'Port Said' },
  { value: 'Ismailia City Centre', nameAr: 'وسط الإسماعيلية', town: 'Ismailia', governorate: 'Ismailia' },
  { value: 'Numra Sitta', nameAr: 'نمرة ٦', town: 'Ismailia', governorate: 'Ismailia' },
  { value: 'Temsah', nameAr: 'التمساح', town: 'Ismailia', governorate: 'Ismailia', keywords: ['lake timsah'] },
  { value: 'Fayed', nameAr: 'فايد', town: 'Fayed', governorate: 'Ismailia' },
  { value: 'Port Tewfik', nameAr: 'بورتوفيق', town: 'Suez', governorate: 'Suez' },
  { value: 'El Arbaeen', nameAr: 'الأربعين', town: 'Suez', governorate: 'Suez' },
  { value: 'Ain Sokhna', nameAr: 'العين السخنة', town: 'Ain Sokhna', governorate: 'Suez' },

  // ══ DELTA ═════════════════════════════════════════════════════════════════════════════
  { value: 'Mansoura City Centre', nameAr: 'وسط المنصورة', town: 'Mansoura', governorate: 'Dakahlia', keywords: ['toriel', 'gedila'] },
  { value: 'New Mansoura', nameAr: 'المنصورة الجديدة', town: 'Mansoura', governorate: 'Dakahlia' },
  { value: 'Talkha', nameAr: 'طلخا', town: 'Talkha', governorate: 'Dakahlia' },
  { value: 'Gamasa', nameAr: 'جمصة', town: 'Gamasa', governorate: 'Dakahlia' },
  { value: 'Mit Ghamr', nameAr: 'ميت غمر', town: 'Mit Ghamr', governorate: 'Dakahlia' },
  { value: 'Tanta City Centre', nameAr: 'وسط طنطا', town: 'Tanta', governorate: 'Gharbia' },
  { value: 'El Mahalla El Kubra', nameAr: 'المحلة الكبرى', town: 'El Mahalla', governorate: 'Gharbia' },
  { value: 'Kafr El Zayat', nameAr: 'كفر الزيات', town: 'Kafr El Zayat', governorate: 'Gharbia' },
  { value: 'Zagazig', nameAr: 'الزقازيق', town: 'Zagazig', governorate: 'Sharqia' },
  { value: '10th of Ramadan', nameAr: 'العاشر من رمضان', town: '10th of Ramadan', governorate: 'Sharqia' },
  { value: 'Belbeis', nameAr: 'بلبيس', town: 'Belbeis', governorate: 'Sharqia' },
  { value: 'Banha', nameAr: 'بنها', town: 'Banha', governorate: 'Qalyubia' },
  { value: 'Shubra El Kheima', nameAr: 'شبرا الخيمة', town: 'Shubra El Kheima', governorate: 'Qalyubia' },
  { value: 'Qanater El Khayreya', nameAr: 'القناطر الخيرية', town: 'Qalyub', governorate: 'Qalyubia' },
  { value: 'Shibin El Kom', nameAr: 'شبين الكوم', town: 'Shibin El Kom', governorate: 'Monufia' },
  { value: 'Sadat City', nameAr: 'مدينة السادات', town: 'Sadat City', governorate: 'Monufia' },
  { value: 'Damanhur', nameAr: 'دمنهور', town: 'Damanhur', governorate: 'Beheira' },
  { value: 'Rashid', nameAr: 'رشيد', town: 'Rashid', governorate: 'Beheira', keywords: ['rosetta'] },
  { value: 'Kafr El Dawar', nameAr: 'كفر الدوار', town: 'Kafr El Dawar', governorate: 'Beheira' },
  { value: 'Wadi El Natrun', nameAr: 'وادي النطرون', town: 'Wadi El Natrun', governorate: 'Beheira' },
  { value: 'Kafr El Sheikh City', nameAr: 'مدينة كفر الشيخ', town: 'Kafr El Sheikh', governorate: 'Kafr El Sheikh' },
  { value: 'Baltim', nameAr: 'بلطيم', town: 'Baltim', governorate: 'Kafr El Sheikh' },
  { value: 'Desouk', nameAr: 'دسوق', town: 'Desouk', governorate: 'Kafr El Sheikh' },
  { value: 'Ras El Bar', nameAr: 'رأس البر', town: 'Ras El Bar', governorate: 'Damietta' },
  { value: 'New Damietta', nameAr: 'دمياط الجديدة', town: 'Damietta', governorate: 'Damietta' },
  { value: 'Ezbet El Borg', nameAr: 'عزبة البرج', town: 'Damietta', governorate: 'Damietta' },

  // ══ UPPER EGYPT ═══════════════════════════════════════════════════════════════════════
  { value: 'Fayoum City', nameAr: 'مدينة الفيوم', town: 'Fayoum', governorate: 'Fayoum' },
  { value: 'Tunis Village', nameAr: 'قرية تونس', town: 'Fayoum', governorate: 'Fayoum', keywords: ['pottery'] },
  { value: 'Lake Qarun', nameAr: 'بحيرة قارون', town: 'Fayoum', governorate: 'Fayoum' },
  { value: 'Wadi El Rayan', nameAr: 'وادي الريان', town: 'Fayoum', governorate: 'Fayoum', keywords: ['waterfalls'] },
  { value: 'Beni Suef City', nameAr: 'مدينة بني سويف', town: 'Beni Suef', governorate: 'Beni Suef' },
  { value: 'New Beni Suef', nameAr: 'بني سويف الجديدة', town: 'Beni Suef', governorate: 'Beni Suef' },
  { value: 'Minya City', nameAr: 'مدينة المنيا', town: 'Minya', governorate: 'Minya' },
  { value: 'New Minya', nameAr: 'المنيا الجديدة', town: 'Minya', governorate: 'Minya' },
  { value: 'Mallawi', nameAr: 'ملوي', town: 'Mallawi', governorate: 'Minya' },
  { value: 'Tuna El Gebel', nameAr: 'تونا الجبل', town: 'Mallawi', governorate: 'Minya' },
  { value: 'Assiut City', nameAr: 'مدينة أسيوط', town: 'Assiut', governorate: 'Assiut' },
  { value: 'New Assiut', nameAr: 'أسيوط الجديدة', town: 'Assiut', governorate: 'Assiut' },
  { value: 'Dairut', nameAr: 'ديروط', town: 'Dairut', governorate: 'Assiut' },
  { value: 'Sohag City', nameAr: 'مدينة سوهاج', town: 'Sohag', governorate: 'Sohag' },
  { value: 'New Sohag', nameAr: 'سوهاج الجديدة', town: 'Sohag', governorate: 'Sohag' },
  { value: 'Akhmim', nameAr: 'أخميم', town: 'Akhmim', governorate: 'Sohag' },
  { value: 'El Balyana', nameAr: 'البلينا', town: 'El Balyana', governorate: 'Sohag', keywords: ['abydos'] },
  { value: 'Qena City', nameAr: 'مدينة قنا', town: 'Qena', governorate: 'Qena' },
  { value: 'Dendera', nameAr: 'دندرة', town: 'Qena', governorate: 'Qena' },
  { value: 'Nag Hammadi', nameAr: 'نجع حمادي', town: 'Nag Hammadi', governorate: 'Qena' },
  { value: 'Qus', nameAr: 'قوص', town: 'Qus', governorate: 'Qena' },

  // ══ NEW VALLEY & NORTH SINAI ══════════════════════════════════════════════════════════
  { value: 'Kharga', nameAr: 'الخارجة', town: 'Kharga', governorate: 'New Valley' },
  { value: 'Dakhla', nameAr: 'الداخلة', town: 'Dakhla', governorate: 'New Valley', keywords: ['mut'] },
  { value: 'Farafra', nameAr: 'الفرافرة', town: 'Farafra', governorate: 'New Valley', keywords: ['white desert'] },
  { value: 'Arish', nameAr: 'العريش', town: 'Arish', governorate: 'North Sinai' },
  { value: 'Bir El Abd', nameAr: 'بئر العبد', town: 'Bir El Abd', governorate: 'North Sinai' },
];

/**
 * The 27 governorates = the cities. Ordered by how much of the product lives in each, so the
 * picker opens on Cairo/Giza/Alexandria rather than alphabetical Alexandria/Assiut/Aswan.
 */
export const EGYPT_CITIES: { value: string; nameAr: string }[] = [
  { value: 'Cairo', nameAr: 'القاهرة' },
  { value: 'Giza', nameAr: 'الجيزة' },
  { value: 'Alexandria', nameAr: 'الإسكندرية' },
  { value: 'South Sinai', nameAr: 'جنوب سيناء' },
  { value: 'Red Sea', nameAr: 'البحر الأحمر' },
  { value: 'Matrouh', nameAr: 'مطروح' },
  { value: 'Luxor', nameAr: 'الأقصر' },
  { value: 'Aswan', nameAr: 'أسوان' },
  { value: 'Qalyubia', nameAr: 'القليوبية' },
  { value: 'Port Said', nameAr: 'بورسعيد' },
  { value: 'Ismailia', nameAr: 'الإسماعيلية' },
  { value: 'Suez', nameAr: 'السويس' },
  { value: 'Dakahlia', nameAr: 'الدقهلية' },
  { value: 'Gharbia', nameAr: 'الغربية' },
  { value: 'Sharqia', nameAr: 'الشرقية' },
  { value: 'Monufia', nameAr: 'المنوفية' },
  { value: 'Beheira', nameAr: 'البحيرة' },
  { value: 'Kafr El Sheikh', nameAr: 'كفر الشيخ' },
  { value: 'Damietta', nameAr: 'دمياط' },
  { value: 'Fayoum', nameAr: 'الفيوم' },
  { value: 'Beni Suef', nameAr: 'بني سويف' },
  { value: 'Minya', nameAr: 'المنيا' },
  { value: 'Assiut', nameAr: 'أسيوط' },
  { value: 'Sohag', nameAr: 'سوهاج' },
  { value: 'Qena', nameAr: 'قنا' },
  { value: 'New Valley', nameAr: 'الوادي الجديد' },
  { value: 'North Sinai', nameAr: 'شمال سيناء' },
];

export const CITY_VALUES = EGYPT_CITIES.map((c) => c.value);

export function findCity(value: string | null | undefined) {
  if (!value) return undefined;
  const needle = value.trim().toLowerCase();
  return EGYPT_CITIES.find(
    (c) => c.value.toLowerCase() === needle || c.nameAr === value.trim(),
  );
}

/** Every region in a given governorate/city. */
export function regionsForCity(city: string): EgyptRegion[] {
  const needle = city.trim().toLowerCase();
  return EGYPT_REGIONS.filter((r) => r.governorate.toLowerCase() === needle);
}

export const REGION_VALUES = EGYPT_REGIONS.map((r) => r.value);

export function findRegion(value: string | null | undefined) {
  if (!value) return undefined;
  const needle = value.trim().toLowerCase();
  return EGYPT_REGIONS.find(
    (r) => r.value.toLowerCase() === needle || r.nameAr === value.trim(),
  );
}

/**
 * The label for a stored region value, in the reader's language.
 *
 * `places.region` stores the ENGLISH name as a stable key (it is effectively an enum), so
 * the Arabic label is not in the database — it is looked up here. Anything not in the
 * catalog (a legacy or hand-typed value) falls back to the stored string rather than
 * rendering blank.
 */
export function regionLabel(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  const found = findRegion(value);
  if (!found) return value;
  return locale === "ar" ? found.nameAr || found.value : found.value;
}

/** Same rule for a governorate/city value. */
export function cityLabel(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  const found = findCity(value);
  if (!found) return value;
  return locale === "ar" ? found.nameAr || found.value : found.value;
}
