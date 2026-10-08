"use client";
/**
 * HomeScreen — the home discovery scenario (US-VISITOR-CIT-001).
 *
 * Container/presenter split (see src/app/_home/): useHomeDiscovery() owns all state and
 * actions; Home is a single responsive shell. It replaced a HomeMobile/HomeDesktop pair
 * that both rendered with CSS hiding one — that shipped two React trees, mounted every
 * card twice, and let the two layouts drift apart.
 */
import { useCities } from '@/lib/api/hooks/use-cities';
import { Home } from "./Home";

export default function HomeScreen({ secondary, cityCounts }: { secondary: React.ReactNode; cityCounts: Record<string, React.ReactNode> }) {
  const { data: cities } = useCities();
  const d = { activeCities: (cities ?? []).filter((city) => city.status !== 'draft'), toast: null, dismissToast: () => {} };
  return <Home d={d} secondary={secondary} cityCounts={cityCounts} />;
}
