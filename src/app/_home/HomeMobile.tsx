"use client";
/**
 * HomeMobile — the mobile-first presentational shell for the home discovery scenario.
 * A full-height app column: header, compact search, category rail, horizontal place
 * rails, bottom nav, region Sheet. All state/actions come from useHomeDiscovery().
 */
import * as React from "react";
import { IconButton } from "@/components/ds/IconButton";
import { SearchBar } from "@/components/ds/SearchBar";
import { CategoryChip } from "@/components/ds/CategoryChip";
import { PlaceCard } from "@/components/ds/PlaceCard";
import { BottomNav } from "@/components/ds/BottomNav";
import { Sheet } from "@/components/ds/Sheet";
import { Toast } from "@/components/ds/Toast";
import type { HomeDiscovery } from "./useHomeDiscovery";

const lucide = (icon: string, size = 22) => (
  <img src={`https://unpkg.com/lucide-static@0.462.0/icons/${icon}.svg`} width={size} height={size} alt="" />
);

export function HomeMobile({ d }: { d: HomeDiscovery }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "var(--surface-app)",
        position: "relative",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 8px" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, lineHeight: 1.3, color: "var(--brand-700)" }}>
          Khargny
        </span>
        <IconButton ariaLabel="Language" icon={lucide("globe", 16)} />
      </div>

      <div style={{ padding: "0 16px 12px" }}>
        <SearchBar area="Anywhere in Egypt" onOpen={d.openFilters} />
      </div>

      <div style={{ display: "flex", gap: 4, padding: "0 12px 10px", overflowX: "auto" }}>
        {d.categories.map((c) => (
          <CategoryChip key={c.key} label={c.label} active={d.cat === c.key} onClick={() => d.setCat(c.key)} icon={lucide(c.icon)} />
        ))}
      </div>

      <main style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {d.rails.map((rail) => (
          <section key={rail.title} style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, lineHeight: 1.3, color: "var(--text-primary)", padding: "4px 16px 10px", margin: 0 }}>
              {rail.title}
            </h2>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 16px" }}>
              {rail.places.map((p) => (
                <PlaceCard key={p.title} size="sm" title={p.title} area={p.area} rating={p.rating} badge={p.badge} favorite={false} onToggleFavorite={() => d.onSavePlace(p.title)} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <BottomNav active="discover" />

      <Sheet open={d.filtersOpen} onClose={d.closeFilters} title="Where to?">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {d.regions.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => d.onRegionSelect(r.label)}
              style={{ textAlign: "start", padding: "14px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", background: "var(--white)", fontFamily: "var(--font-body)", fontSize: "var(--text-base)", color: "var(--text-primary)", cursor: "pointer", transition: "var(--motion-color), var(--motion-shadow)" }}
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
