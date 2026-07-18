"use client";
/**
 * HomeDesktop — the distinct desktop presentational shell for the home discovery
 * scenario. NOT the mobile column stretched: a sticky top nav (no bottom-nav), a
 * warm hero with a large search affordance, a centered max-width content column, and
 * place sections rendered as wrapping GRIDS instead of horizontal rails. All state
 * and actions come from useHomeDiscovery(), shared with HomeMobile.
 */
import * as React from "react";
import { IconButton } from "@/components/ds/IconButton";
import { CategoryChip } from "@/components/ds/CategoryChip";
import { PlaceCard } from "@/components/ds/PlaceCard";
import { Sheet } from "@/components/ds/Sheet";
import { Toast } from "@/components/ds/Toast";
import type { HomeDiscovery } from "./useHomeDiscovery";
import { useI18n } from "@/i18n/LocaleProvider";

const lucide = (icon: string, size = 20) => (
  <img src={`https://unpkg.com/lucide-static@0.462.0/icons/${icon}.svg`} width={size} height={size} alt="" />
);

const MAXW = 1120;

function TopNav({ onLang }: { onLang: () => void }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "color-mix(in srgb, var(--surface-app) 88%, transparent)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--gray-200)",
      }}
    >
      <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", gap: 32 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--brand-700)", letterSpacing: "-0.01em" }}>
          Khargny
        </span>
        <nav style={{ display: "flex", gap: 4, marginInlineStart: 8 }}>
          {[
            { href: "/explorer", label: "Explore" },
            { href: "/plan", label: "Your plan" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius-full)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                fontWeight: 500,
                color: "var(--text-secondary)",
                textDecoration: "none",
                transition: "var(--motion-color)",
              }}
              className="khg-navlink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div style={{ marginInlineStart: "auto" }}>
          <IconButton ariaLabel="Language" icon={lucide("globe", 16)} onClick={onLang} />
        </div>
      </div>
    </header>
  );
}

function Hero({ onSearch }: { onSearch: () => void }) {
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
          Find your next outing in Egypt
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-lg)", color: "var(--text-secondary)", margin: "16px auto 0", maxWidth: "44ch", lineHeight: 1.5 }}>
          Curated places worth the trip — beaches, ruins, oases and tables. No bookings, just where to go next.
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
          <span style={{ display: "inline-flex", color: "var(--brand-600)" }}>{lucide("search", 20)}</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-base)", color: "var(--text-secondary)", flex: 1 }}>
            Where to? &nbsp;·&nbsp; Anywhere in Egypt
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
            <img src="https://unpkg.com/lucide-static@0.462.0/icons/arrow-right.svg" width={18} height={18} alt="" style={{ filter: "invert(1)" }} />
          </span>
        </button>
      </div>
    </section>
  );
}

export function HomeDesktop({ d }: { d: HomeDiscovery }) {
  const { t } = useI18n();
  return (
    <div style={{ minHeight: "100dvh", background: "var(--surface-app)", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column" }}>
      <TopNav onLang={() => {}} />
      <Hero onSearch={d.openFilters} />

      <div style={{ maxWidth: MAXW, margin: "0 auto", width: "100%", padding: "0 32px" }}>
        {/* Category row — centered, no scroll needed at this width */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", padding: "28px 0 8px" }}>
          {d.categories.map((c) => (
            <CategoryChip key={c.key} label={c.label} active={d.cat === c.key} onClick={() => d.setCat(c.key)} icon={lucide(c.icon, 22)} />
          ))}
        </div>

        {/* Place sections — wrapping grids of md cards */}
        {d.rails.map((rail) => (
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
        ))}
      </div>

      <footer style={{ marginTop: "auto", borderTop: "1px solid var(--gray-200)", background: "var(--gray-50)" }}>
        <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "28px 32px", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--brand-700)" }}>Khargny</span>
          <span>{t("home.subtitle")}</span>
        </div>
      </footer>

      <Sheet open={d.filtersOpen} onClose={d.closeFilters} title={t("home.whereTo")}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {d.regions.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => d.onRegionSelect(r.label)}
              className="khg-region"
              style={{ textAlign: "start", padding: "16px 18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", background: "var(--white)", fontFamily: "var(--font-body)", fontSize: "var(--text-base)", color: "var(--text-primary)", cursor: "pointer", transition: "var(--motion-color), var(--motion-shadow)" }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Sheet>

      {d.toast && <Toast message={d.toast.message} tone={d.toast.tone} onDismiss={d.dismissToast} />}
    </div>
  );
}
