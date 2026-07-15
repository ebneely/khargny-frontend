"use client";
/**
 * HomeScreen — the home discovery scenario (US-VISITOR-CIT-001).
 *
 * Container/presenter split (see src/app/_home/): useHomeDiscovery() owns all state
 * and actions; HomeMobile and HomeDesktop are distinct presentational shells. Both are
 * rendered; CSS (.khg-only-mobile / .khg-only-desktop, breakpoint 1024px) shows exactly
 * one — SSR-safe, no hydration mismatch, no layout shift, and desktop is its own design
 * rather than the mobile column stretched.
 */
import { useHomeDiscovery } from "./_home/useHomeDiscovery";
import { HomeMobile } from "./_home/HomeMobile";
import { HomeDesktop } from "./_home/HomeDesktop";

export default function HomeScreen() {
  const d = useHomeDiscovery();
  return (
    <>
      <div className="khg-only-mobile">
        <HomeMobile d={d} />
      </div>
      <div className="khg-only-desktop">
        <HomeDesktop d={d} />
      </div>
    </>
  );
}
