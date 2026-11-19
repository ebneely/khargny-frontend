// 27 Egyptian governorates, one landmark icon each (port of ui-unify/proto/governorates.js). Line style matches lucide:
// 24 grid, stroke 1.75, round caps, no fill (svg.gov in web.css).
export const GOVERNORATES: Record<string, { en: string; ar: string; sign: string; d: string }> = {
  cairo:        { en: 'Cairo',          ar: 'القاهرة',       sign: 'Cairo Tower',            d: 'M12 2.5v2M10.4 4.5h3.2l-.5 3h-2.2zM11 7.5 10 20.5M13 7.5l1 13M8 20.5h8M10.5 12h3M10.3 15.5h3.4' },
  giza:         { en: 'Giza',           ar: 'الجيزة',        sign: 'The pyramids',           d: 'M2 19.5h20M3 19.5 9.5 7.5l6.5 12M13.4 14.7 16.5 9.5l5 10M9.5 7.5l1.6 4.5' },
  alexandria:   { en: 'Alexandria',     ar: 'الإسكندرية',    sign: 'Qaitbay Citadel',        d: 'M3.5 20.5h17M4.5 20.5V12h3v-2h2.5V7h4v3h2.5v2h3v8.5M10.5 20.5v-3.5a1.5 1.5 0 0 1 3 0v3.5M12 7V4' },
  port_said:    { en: 'Port Said',      ar: 'بورسعيد',       sign: 'The lighthouse',         d: 'M10 20.5 11 7.5h2l1 13M8.5 20.5h7M10.3 5h3.4l.4 2.5h-4.2zM12 2.5V5M16 5l2.5-1.2M16 7.5l2.5 1.2M8 5 5.5 3.8M8 7.5 5.5 8.7' },
  ismailia:     { en: 'Ismailia',       ar: 'الإسماعيلية',   sign: 'The crocodile of Lake Timsah',     d: 'M2.5 13.5c1.8 0 3.2-.5 4.3-1.7l.9-1.2h2.2l.9 1.3h4.6c1.5 0 3-.9 4.4-2.8l1.2.2c-.3 2.6-1 4.5-2.4 5.9-1.7 1.7-4.2 2.2-7.6 2.2H7.5c-2.2 0-3.8-.8-5-2.5zM6 18.5v2M11 18.5v2M16 18.5v2M7.8 12.3h.01' },
  suez:         { en: 'Suez',           ar: 'السويس',        sign: 'A ship in the canal',    d: 'M3 15h18l-2.6 3.8H5.6zM6 15v-3.5h9V15M8.5 11.5V8.5h3.5v3M17 15v-2M2.5 21.2c1.6-1 3.2-1 4.8 0s3.2 1 4.7 0 3.2-1 4.8 0 3.1 1 4.7 0' },
  red_sea:      { en: 'Red Sea',        ar: 'البحر الأحمر',  sign: 'Reef fish',              d: 'M2.5 12c3-4.6 9-5.4 13-1.4 1.5-1.6 3.2-2.6 5.5-3-1.1 2.3-1.1 4.5 0 6.8-2.3-.4-4-1.4-5.5-3-4 4-10 3.2-13-1.4zM7.5 11.2h.01M12 8.6c.8 1.9.8 4.9 0 6.8' },
  south_sinai:  { en: 'South Sinai',    ar: 'جنوب سيناء',    sign: 'Mount Sinai at sunrise', d: 'M2 20h20M2.5 20 9.5 8.5l4 6 2-2.8 6 8.3M7.6 11.6l1.9 1.1 1.7-1.1M17 7.5a2 2 0 1 0-.01 0' },
  north_sinai:  { en: 'North Sinai',    ar: 'شمال سيناء',    sign: 'Palms and dunes of Arish', d: 'M2 21h20M2 17.5c3-2.7 6-2.7 9 0 3 2.6 6.5 2.2 11-1M17 14.5V6.5M17 6.5c-1-1.6-2.6-2.2-4.6-2M17 6.5c1-1.6 2.6-2.2 4.6-2M17 6.5c-.3-1.6-1.1-2.8-2.4-3.6' },
  matrouh:      { en: 'Matrouh',        ar: 'مطروح',         sign: 'A beach umbrella',       d: 'M4 10a8 8 0 0 1 16 0zM12 10v9M12 2v2M2.5 21c1.6-1 3.2-1 4.8 0s3.2 1 4.7 0 3.2-1 4.8 0 3.1 1 4.7 0' },
  new_valley:   { en: 'New Valley',     ar: 'الوادي الجديد', sign: 'White Desert rock',      d: 'M6 9.5C6 7 8.7 5.5 12 5.5s6 1.5 6 4-2.7 3-6 3-6-.5-6-3zM10.5 12.5 10 17.5h4l-.5-5M2 20c3-1.8 6.3-2.5 10-2.5s7 .7 10 2.5' },
  luxor:        { en: 'Luxor',          ar: 'الأقصر',        sign: 'The obelisk of Luxor Temple',      d: 'M12 2.5l1.6 4-.9 14h-2.8l-.9-14zM10.4 6.5h3.2M6.5 20.5h11M3 20.5h1.5M19.5 20.5H21' },
  aswan:        { en: 'Aswan',          ar: 'أسوان',         sign: 'A felucca on the Nile',  d: 'M12 2.5V17M12 2.5 5 15h7M12 5.5 17.5 15H12M3.5 17.5h17l-2 3h-13z' },
  qena:         { en: 'Qena',           ar: 'قنا',           sign: 'Dendera temple',         d: 'M3 20.5h18M4.5 20.5 6 6.5h4l.6 14M13.4 20.5 14 6.5h4l1.5 14M3.5 6.5h17M10.6 10h2.8M10.6 13.5h2.8' },
  sohag:        { en: 'Sohag',          ar: 'سوهاج',         sign: 'The ankh of Abydos',     d: 'M12 10.5C9.8 10.5 8.5 8.5 8.5 6.5S9.8 2.5 12 2.5s3.5 2 3.5 4-1.3 4-3.5 4zM7 11h10M12 10.5v11' },
  assiut:       { en: 'Assiut',         ar: 'أسيوط',         sign: 'The Virgin Mary monastery',     d: 'M3 20.5h18M5 20.5V11h14v9.5M12 2.5v5.5M9.8 4.7h4.4M10 20.5v-3.5a2 2 0 0 1 4 0v3.5' },
  minya:        { en: 'Minya',          ar: 'المنيا',        sign: 'The Aten of Amarna',     d: 'M6 11a6 6 0 0 1 12 0zM4 11h16M8 14l-1.6 4.5M12 14v5.5M16 14l1.6 4.5M10 14l-.8 5M14 14l.8 5' },
  beni_suef:    { en: 'Beni Suef',      ar: 'بني سويف',      sign: 'The Meidum pyramid',     d: 'M3 20.5h18M6.5 20.5l2-7h7l2 7M9.2 13.5l1-5h3.6l1 5M10.6 8.5l.5-3h1.8l.5 3' },
  faiyum:       { en: 'Faiyum',         ar: 'الفيوم',        sign: 'The waterwheels',        d: 'M5 11.5a7 7 0 1 0 14 0 7 7 0 1 0-14 0M12 4.5v14M5 11.5h14M7 6.5l10 10M17 6.5l-10 10M2 21.5h20' },
  damietta:     { en: 'Damietta',       ar: 'دمياط',         sign: 'Damietta furniture',     d: 'M7 3.5h10v8H7zM5.5 11.5h13v3h-13zM7 14.5v6M17 14.5v6M9.5 6.5h5' },
  dakahlia:     { en: 'Dakahlia',       ar: 'الدقهلية',      sign: 'The Nile bridge at Mansoura', d: 'M2 15.5c3-6 17-6 20 0M2 15.5h20M6 15.5v-3M10 15.5v-4.4M14 15.5v-4.4M18 15.5v-3M2.5 20.5c1.6-1 3.2-1 4.8 0s3.2 1 4.7 0 3.2-1 4.8 0 3.1 1 4.7 0' },
  sharqia:      { en: 'Sharqia',        ar: 'الشرقية',       sign: 'An Arabian horse',       d: 'M8 20.5c.2-3.6 1.2-6.2 3.2-8.2L7.2 11c-1-.4-1.3-1.6-.6-2.4L9.4 5.3c1.6-1.7 4.1-2.1 6.1-1.1L17 2.7l.5 2.6c2 2.1 2.5 5.1 1.4 8.6l-1.4 6.6M12.8 7.6h.01M9.5 5.4 8 3.5' },
  qalyubia:     { en: 'Qalyubia',       ar: 'القليوبية',     sign: 'Banha honey',      d: 'M8.5 6.5h7v3h-7zM7.5 9.5h9v9a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2zM12 12.4c-1 1.4-1.6 2.3-1.6 3a1.6 1.6 0 0 0 3.2 0c0-.7-.6-1.6-1.6-3zM15 6.5l2-3.5' },
  kafr_el_sheikh: { en: 'Kafr El Sheikh', ar: 'كفر الشيخ',   sign: 'Rice of the Delta',      d: 'M12 21V9M12 9c0-3 1-5 3-6.5M12 13c-2-.5-3.5-2-4-4.5 2 .3 3.5 1.8 4 4.5zM12 17c2-.5 3.5-2 4-4.5-2 .3-3.5 1.8-4 4.5zM12 9.5c-1.6-.4-2.7-1.6-3-3.5 1.6.3 2.7 1.5 3 3.5z' },
  gharbia:      { en: 'Gharbia',        ar: 'الغربية',       sign: 'The mosque of Tanta',    d: 'M3.5 20.5h17M5 20.5V13h10v7.5M5 13c0-3.5 2.2-5.5 5-6.5 2.8 1 5 3 5 6.5M10 6.5V4.5M18.5 20.5V8.5M17.4 8.5h2.2l-1.1-3.2zM9 20.5v-3a1 1 0 0 1 2 0v3' },
  monufia:      { en: 'Monufia',        ar: 'المنوفية',      sign: 'A cotton boll',          d: 'M9.5 9a2.5 2.5 0 1 1 5 0M7.5 12.5a2.5 2.5 0 1 1 2.5-3.6M16.5 12.5a2.5 2.5 0 1 0-2.5-3.6M7.5 12.5a2.5 2.5 0 0 0 4.5 1.5 2.5 2.5 0 0 0 4.5-1.5M12 14v7M9 17.5l3 1.5 3-1.5' },
  beheira:      { en: 'Beheira',        ar: 'البحيرة',       sign: 'The Rosetta Stone',      d: 'M6 21V7.5L9 4h7l2 2.6V21zM9 9h6M9 12h6M9 15h4M9 18h5' },
};

const ALIASES: Record<string, string> = { cairo_governorate: 'cairo', fayoum: 'faiyum', kafrelsheikh: 'kafr_el_sheikh', menofia: 'monufia', menoufia: 'monufia', beni_sweif: 'beni_suef', el_wadi_el_gedid: 'new_valley', mersa_matruh: 'matrouh', marsa_matrouh: 'matrouh' };

/** A city's English name or slug ('Red Sea', 'red-sea', 'Port Said') -> its governorate key, or null. */
export function govKey(name: unknown): string | null {
  const n = String(name ?? '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
  return GOVERNORATES[n] ? n : ALIASES[n] ?? null;
}
