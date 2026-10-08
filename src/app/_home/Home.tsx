"use client";
/**
 * Home — ONE responsive shell for the home discovery scenario (US-VISITOR-CIT-001).
 *
 * Replaces the former HomeMobile/HomeDesktop pair. There is a single document flow at
 * every width; the differences that are genuinely layout (category row wraps vs scrolls,
 * place rails vs grid, hero padding) are expressed as CSS media queries, not as two React
 * trees. Consequences of the merge, on purpose:
 *   - mobile is page-scroll, not a 100dvh app shell with an inner scroller
 *   - the region Sheet is gone; the region grid is always present at every width
 *   - SiteHeader and SiteFooter show at every width; there is no bottom tab bar
 * All state/actions still come from useHomeDiscovery(). Icons are bundled (lucide-react).
 */
import * as React from "react";
import { HomeHero } from "./HomeHero";
import { PlaceCard } from "@/components/ds/PlaceCard";
import { CARD_RAIL_SIZES } from '@/lib/place-photo';
import { Toast } from "@/components/ds/Toast";
import { SiteHeader } from "@/components/ds/SiteHeader";
import { SiteFooter } from "@/components/ds/SiteFooter";
import { CityGrid } from "@/components/explorer/CityGrid";
import type { HomeDiscovery } from "./useHomeDiscovery";
import { useI18n } from "@/i18n/LocaleProvider";
import { HomeAds } from "./HomeAds";

const MAXW = 1120;

function RegionGrid({ d, cityCounts }: { d: Pick<HomeDiscovery, 'activeCities'>; cityCounts?: Record<string, React.ReactNode> }) {
  const { t } = useI18n();
  if (d.activeCities.length === 0) return null;
  return (
    <section id="khg-regions" className="khg-anim-in" style={{ margin: "clamp(24px, 5vw, 40px) 0 8px", scrollMarginTop: 80 }}>
      <h2 className="khg-section-title">{t("home.exploreRegion")}</h2>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 18px", fontSize: "var(--text-base)" }}>
        {t("home.exploreRegionSub")}
      </p>
      {/* The same CityGrid the explorer renders. The home used to draw its own pill-shaped
          card — same data, different component, so city photos and place counts appeared in
          one place and not the other, and the two drifted apart on every change. */}
      <CityGrid cities={d.activeCities} countSlots={cityCounts} />
    </section>
  );
}

export function HomeRails({ d }: { d: HomeDiscovery }) {
  const { t } = useI18n();
  const hasPlaces = d.rails.length > 0 || Boolean(d.featured || d.topPlaces);
  const [emptyPublished, setEmptyPublished] = React.useState(false);
  if (!hasPlaces && !emptyPublished) setEmptyPublished(true);
  const showEmpty = d.rails.length === 0 && (!hasPlaces || emptyPublished);
  return (
    <>
        <HomeAds d={d} />

        {!showEmpty ? (
          d.rails.map((rail) => (
            <section key={rail.title} className="khg-anim-in-2" style={{ margin: "clamp(24px, 5vw, 36px) 0" }}>
              <h2 className="khg-section-title">{rail.title}</h2>
              <div className="khg-home-rail no-scrollbar">
                {rail.places.map((p) => (
                  <div key={p.id} style={{ cursor: "pointer", width: "100%" }}>
                    {/* No `rating` prop: there is no review system yet, so places.rating is
                        always 0 and rendering it published a score nobody gave. */}
                    <PlaceCard
                      href={p.citySlug && p.slug ? `/explorer/${p.citySlug}/${p.slug}` : undefined}
                      size="md"
                      image={p.image}
                      imageSizes={CARD_RAIL_SIZES}
                      title={p.title}
                      area={p.area}
                      badge={p.badge}
                      priceRange={p.priceVerified ? p.priceRange : undefined}
                      hasMenu={p.hasMenu}
                      priceVerified={p.priceVerified}
                      visitedByUs={p.visitedByUs}
                      metrics={p.metrics}
                      favorite={false}
                      onToggleFavorite={() => d.onSavePlace(p.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))
        ) : (
          <section
            style={{
              margin: "clamp(24px, 5vw, 40px) 0 56px",
              padding: "40px 24px",
              textAlign: "center",
              border: "1px dashed var(--gray-300)",
              borderRadius: "var(--radius-xl)",
              background: "var(--gray-50)",
            }}
          >
            <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px" }}>
              {t("home.emptyTitle")}
            </p>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "var(--text-base)" }}>{t("home.emptySub")}</p>
          </section>
        )}
    </>
  );
}

export function Home({ d, secondary, cityCounts }: { d: Pick<HomeDiscovery, 'activeCities' | 'toast' | 'dismissToast'>; secondary: React.ReactNode; cityCounts: Record<string, React.ReactNode> }) {
  return <div style={{ minHeight: '100dvh', background: 'var(--surface-app)', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>
    <SiteHeader active="home" />
    <HomeHero cities={d.activeCities} />
    <div style={{ maxWidth: MAXW, margin: '0 auto', width: '100%', padding: '0 clamp(16px, 4vw, 32px)', flex: 1, ['--rail-gutter' as string]: 'clamp(16px, 4vw, 32px)' }}>
      <RegionGrid d={d} cityCounts={cityCounts} />
      {secondary}
    </div>
    <SiteFooter />
    {d.toast && <Toast message={d.toast.message} tone={d.toast.tone} onDismiss={d.dismissToast} />}
  </div>;
}
