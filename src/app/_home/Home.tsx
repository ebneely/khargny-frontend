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
import { Search, ArrowRight, MapPin } from "lucide-react";
import { CategoryChip } from "@/components/ds/CategoryChip";
import { PlaceCard } from "@/components/ds/PlaceCard";
import { Toast } from "@/components/ds/Toast";
import { SiteHeader } from "@/components/ds/SiteHeader";
import { SiteFooter } from "@/components/ds/SiteFooter";
import { catIcon } from "@/lib/icon-catalog";
import type { HomeDiscovery } from "./useHomeDiscovery";
import { useI18n } from "@/i18n/LocaleProvider";

const MAXW = 1120;

function scrollToRegions() {
  document.getElementById("khg-regions")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Hero() {
  const { t } = useI18n();
  return (
    <section style={{ background: "var(--brand-50)", borderBottom: "1px solid var(--gray-200)" }}>
      <div
        style={{
          maxWidth: MAXW,
          margin: "0 auto",
          padding: "clamp(32px, 7vw, 72px) clamp(16px, 4vw, 32px) clamp(28px, 6vw, 64px)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 5vw, 3.5rem)",
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            margin: 0,
            textWrap: "balance",
          }}
        >
          {t("home.heroTitle")}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(var(--text-base), 2.5vw, var(--text-lg))",
            color: "var(--text-secondary)",
            margin: "clamp(10px, 2vw, 16px) auto 0",
            maxWidth: "44ch",
            lineHeight: 1.5,
          }}
        >
          {t("home.heroSubtitle")}
        </p>
        <button
          type="button"
          onClick={scrollToRegions}
          className="khg-herosearch"
          style={{
            marginTop: "clamp(20px, 4vw, 32px)",
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            width: "min(560px, 100%)",
            padding: "14px 18px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--gray-300)",
            background: "var(--white)",
            boxShadow: "var(--shadow-md)",
            cursor: "pointer",
            transition: "var(--motion-shadow), var(--motion-transform)",
            textAlign: "start",
          }}
        >
          <span style={{ display: "inline-flex", color: "var(--brand-600)", flexShrink: 0 }}>
            <Search size={20} aria-hidden="true" />
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-base)",
              color: "var(--text-secondary)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {t("home.whereTo")} &nbsp;·&nbsp; {t("home.anywhere")}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "var(--radius-full)",
              background: "var(--brand-600)",
              color: "var(--white)",
              flexShrink: 0,
            }}
          >
            <ArrowRight size={18} aria-hidden="true" />
          </span>
        </button>
      </div>
    </section>
  );
}

function RegionGrid({ d }: { d: HomeDiscovery }) {
  const { t } = useI18n();
  if (d.regionCities.length === 0) return null;
  return (
    <section id="khg-regions" className="khg-anim-in" style={{ margin: "clamp(24px, 5vw, 40px) 0 8px", scrollMarginTop: 80 }}>
      <h2 className="khg-section-title">{t("home.exploreRegion")}</h2>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 18px", fontSize: "var(--text-base)" }}>
        {t("home.exploreRegionSub")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
        {d.regionCities.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => d.onCitySelect(c.slug)}
            className="khg-region"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              textAlign: "start",
              padding: "clamp(16px, 3vw, 22px) 20px",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--gray-200)",
              background: "linear-gradient(135deg, var(--brand-50), var(--white))",
              cursor: "pointer",
              transition: "var(--motion-color), var(--motion-shadow), var(--motion-transform)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-full)",
                  background: "var(--brand-100)",
                  color: "var(--brand-700)",
                  flexShrink: 0,
                }}
              >
                <MapPin size={20} aria-hidden="true" />
              </span>
              <span style={{ display: "inline-flex", flexDirection: "column", minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-lg)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label}
                </span>
                {c.region && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{c.region}</span>}
              </span>
            </span>
            <span style={{ color: "var(--brand-600)", display: "inline-flex", flexShrink: 0 }}>
              <ArrowRight size={18} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Home({ d }: { d: HomeDiscovery }) {
  const { t } = useI18n();
  const hasPlaces = d.rails.length > 0;
  return (
    <div
      style={{ minHeight: "100dvh", background: "var(--surface-app)", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column" }}
    >
      <SiteHeader active="home" />
      <Hero />

      <div style={{ maxWidth: MAXW, margin: "0 auto", width: "100%", padding: "0 clamp(16px, 4vw, 32px)", flex: 1 }}>
        {d.categories.length > 0 && (
          <div className="khg-cat-row no-scrollbar">
            {d.categories.map((c) => (
              <CategoryChip key={c.key} label={c.label} active={d.cat === c.key} onClick={() => d.setCat(c.key)} icon={catIcon(c.icon, 22)} />
            ))}
          </div>
        )}

        {/* Regions — always present at every width, so home is never an empty page */}
        <RegionGrid d={d} />

        {hasPlaces ? (
          d.rails.map((rail) => (
            <section key={rail.title} className="khg-anim-in-2" style={{ margin: "clamp(24px, 5vw, 36px) 0" }}>
              <h2 className="khg-section-title">{rail.title}</h2>
              <div className="khg-home-rail no-scrollbar">
                {rail.places.map((p) => (
                  <div key={p.id} onClick={() => d.onOpenPlace(p)} style={{ cursor: "pointer", width: "100%" }}>
                    <PlaceCard
                      size="md"
                      title={p.title}
                      area={p.area}
                      rating={p.rating}
                      badge={p.badge}
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
      </div>

      <SiteFooter />

      {d.toast && <Toast message={d.toast.message} tone={d.toast.tone} onDismiss={d.dismissToast} />}
    </div>
  );
}
