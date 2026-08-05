import type { Metadata } from 'next';
import {
  alternatesFor,
  currentLocale,
  ogAlternateLocale,
  ogLocale,
  urlFor,
} from '@/lib/seo';

/**
 * Server wrapper for the (client) explorer index, which cannot export metadata itself.
 * Without it this page inherited the root layout's canonical of "/" and told search engines
 * it was the home page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const isAr = locale === 'ar';

  const title = isAr
    ? 'استكشف مدن مصر — أماكن مختارة في كل محافظة'
    : 'Explore Egypt by city — curated places in every governorate';
  const description = isAr
    ? 'تصفح الأماكن حسب المدينة: القاهرة، الجيزة، الإسكندرية، الإسماعيلية، بورسعيد، الأقصر، أسوان، الغردقة ومطروح. مطاعم ومقاهي وشواطئ وفنادق ومعالم.'
    : 'Browse places by city — Cairo, Giza, Alexandria, Ismailia, Port Said, Luxor, Aswan, Hurghada and Matrouh. Restaurants, cafes, beaches, hotels and landmarks.';

  return {
    title,
    description,
    alternates: alternatesFor('/explorer', locale),
    openGraph: {
      type: 'website',
      title,
      description,
      url: urlFor('/explorer', locale),
      locale: ogLocale(locale),
      alternateLocale: ogAlternateLocale(locale),
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function ExplorerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
