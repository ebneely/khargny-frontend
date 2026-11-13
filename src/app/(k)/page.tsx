import { getHomeData } from '@/components/k/home-data';
import { HomeView } from '@/components/k/home';

// Home (spec 002 T021), server-rendered for search: every row is built from the real API and handed to the client view.
export default async function HomePage() {
  return <HomeView data={await getHomeData()} />;
}
