"use client";
/**
 * HomeScreen — the home discovery scenario (US-VISITOR-CIT-001).
 *
 * Container/presenter split (see src/app/_home/): useHomeDiscovery() owns all state and
 * actions; Home is a single responsive shell. It replaced a HomeMobile/HomeDesktop pair
 * that both rendered with CSS hiding one — that shipped two React trees, mounted every
 * card twice, and let the two layouts drift apart.
 */
import { useHomeDiscovery } from "./_home/useHomeDiscovery";
import { Home } from "./_home/Home";

export default function HomeScreen() {
  const d = useHomeDiscovery();
  return <Home d={d} />;
}
