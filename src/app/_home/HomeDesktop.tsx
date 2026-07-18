"use client";
/**
 * HomeDesktop — the desktop shell for the home discovery scenario. A shared SiteHeader
 * (logo=home, Home/Explore/Your plan, one wired language switch), a warm hero, the
 * category row, an always-present "Explore by region" grid (so the page is never empty
 * even before any place is published), and place grids when the backend has places.
 * All state/actions come from useHomeDiscovery(); icons are bundled (lucide-react).
 */
import * as React from "react";
import {
  Search,
  ArrowRight,
  Waves,
  Landmark,
  Trees,
  Mountain,
  Utensils,
  Coffee,
  ShoppingBag,
  MapPin,
} from "lucide-react";
import { CategoryChip } from "@/components/ds/CategoryChip";
import { PlaceCard } from "@/components/ds/PlaceCard";
import { Toast } from "@/components/ds/Toast";
import { SiteHeader } from "@/components/ds/SiteHeader";
import type { HomeDiscovery } from "./useHomeDiscovery";
import { useI18n } from "@/i18n/LocaleProvider";

const MAXW = 1120;

const CAT_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  waves: Waves,
  landmark: Landmark,
  trees: Trees,
  mountain: Mountain,
  utensils: Utensils,
  coffee: Coffee,
  "shopping-bag": ShoppingBag,
  "map-pin": MapPin,
};
function catIcon(name: string, size = 22) {
  const C = CAT_ICON[name] || MapPin;
  return <C size={size} />;
}

function Hero({ onSearch }: { onSearch: () => void }) {
  const { t } = useI18n();
  return (
    <section style={{ background: "var(--brand-50)", borderBottom: "1px solid var(--gray-200)" }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "72px 32px 64px", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.25rem, 4vw, 3.5rem)",
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
        <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-lg)", color: "var(--text-secondary)", margin: "16px auto 0", maxWidth: "44ch", lineHeight: 1.5 }}>
          {t("home.heroSubtitle")}
        </p>
        <button
          type="button"
          onClick={onSearch}
          className="khg-herosearch"
          style={{
            marginTop: 32,
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            width: "min(560px, 100%)",
            padding: "16px 20px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--gray-300)",
            background: "var(--white)",
            boxShadow: "var(--shadow-md)",
            cursor: "pointer",
            transition: "var(--motion-shadow), var(--motion-transform)",
            textAlign: "start",
          }}
        >
          <span style={{ display: "inline-flex", color: "var(--brand-600)" }}>
            <Search size={20} aria-hidden="true" />
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-base)", color: "var(--text-secondary)", flex: 1 }}>
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
  return (
    <section id="khg-regions" style={{ margin: "40px 0 8px", scrollMarginTop: 80 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-3xl)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 6px" }}>
        {t("home.exploreRegion")}
      </h2>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 18px", fontSize: "var(--text-base)" }}>
        {t("home.exploreRegionSub")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {d.regions.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => d.onRegionSelect(r.label)}
            className="khg-region"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              textAlign: "start",
              padding: "22px 20px",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--gray-200)",
              background: "linear-gradient(135deg, var(--brand-50), var(--white))",
              cursor: "pointer",
              transition: "var(--motion-color), var(--motion-shadow), var(--motion-transform)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "var(--radius-full)", background: "var(--brand-100)", color: "var(--brand-700)", flexShrink: 0 }}>
                <MapPin size={20} aria-hidden="true" />
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)" }}>
                {r.label}
              </span>
            </span>
            <span style={{ color: "var(--brand-600)", display: "inline-flex" }}>
              <ArrowRight size={18} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function HomeDesktop({ d }: { d: HomeDiscovery }) {
  const { t } = useI18n();
  const hasPlaces = d.rails.length > 0;
  return (
    <div style={{ minHeight: "100dvh", background: "var(--surface-app)", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column" }}>
      <SiteHeader active="home" />
      <Hero
        onSearch={() =>
          document
            .getElementById("khg-regions")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      <div style={{ maxWidth: MAXW, margin: "0 auto", width: "100%", padding: "0 32px" }}>
        {/* Category row */}
        {d.categories.length > 0 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", padding: "28px 0 4px" }}>
            {d.categories.map((c) => (
              <CategoryChip key={c.key} label={c.label} active={d.cat === c.key} onClick={() => d.setCat(c.key)} icon={catIcon(c.icon, 22)} />
            ))}
          </div>
        )}

        {/* Regions — always present, so the home is never an empty page */}
        <RegionGrid d={d} />

        {/* Place grids when the backend has places */}
        {hasPlaces
          ? d.rails.map((rail) => (
              <section key={rail.title} style={{ margin: "36px 0" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-3xl)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 18px" }}>
                  {rail.title}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20, justifyItems: "start" }}>
                  {rail.places.map((p) => (
                    <PlaceCard key={p.id} size="md" title={p.title} area={p.area} rating={p.rating} badge={p.badge} favorite={false} onToggleFavorite={() => d.onSavePlace(p.id)} />
                  ))}
                </div>
              </section>
            ))
          : (
            <section style={{ margin: "40px 0 56px", padding: "40px 24px", textAlign: "center", border: "1px dashed var(--gray-300)", borderRadius: "var(--radius-xl)", background: "var(--gray-50)" }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px" }}>
                {t("home.emptyTitle")}
              </p>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "var(--text-base)" }}>
                {t("home.emptySub")}
              </p>
            </section>
          )}
      </div>

      <footer style={{ marginTop: "auto", borderTop: "1px solid var(--gray-200)", background: "var(--gray-50)" }}>
        <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "28px 32px", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--brand-700)" }}>Khargny</span>
          <span>{t("home.subtitle")}</span>
        </div>
      </footer>

      {d.toast && <Toast message={d.toast.message} tone={d.toast.tone} onDismiss={d.dismissToast} />}
    </div>
  );
}
