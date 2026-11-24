import type { Metadata } from 'next';
import {
  currentLocale,
  pageMetadata,
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
    ? 'استكشف مصر مدينة مدينة'
    : 'Explore Egypt by city';
  const description = isAr
    ? 'تصفح الأماكن حسب المدينة: القاهرة، الجيزة، الإسكندرية، الإسماعيلية، بورسعيد، الأقصر، أسوان، الغردقة ومطروح. مطاعم ومقاهي وشواطئ وفنادق ومعالم.'
    : 'Browse places by city — Cairo, Giza, Alexandria, Ismailia, Port Said, Luxor, Aswan, Hurghada and Matrouh. Restaurants, cafes, beaches, hotels and landmarks.';

  return pageMetadata({ path: '/explorer', locale, title, description });
}

export default function ExplorerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
