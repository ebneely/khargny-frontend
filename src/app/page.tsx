"use client";
/**
 * HomeScreen — full rebuild against `design/builds/Khargny Design System/ui_kits/marketing-home/HomeScreen.jsx`.
 * See `UI_UX/home/structure/home-marketing/wireframe.md` for the layout spec and
 * `UI_UX/home/structure/home-marketing/functional.md` for the state model.
 *
 * Renders:
 *  - HomeHeader (wordmark + language IconButton)
 *  - SearchBar (compact mode; opens the "Where to?" Sheet)
 *  - CategoryChip rail (5 chips: beach / historic / nature / desert / dining)
 *  - 2 PlaceCard rails ("Popular near Cairo", "Weekend getaways") with placeholder data
 *  - BottomNav (Discover tab active)
 *  - Where-to Sheet (region picker, routes to /explorer/{citySlug})
 *  - Toast (reserved for TASK-0009 — PlaceCard heart save feedback)
 *
 * TASK-0007 / SPRINT-2.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@/components/ds/IconButton";
import { SearchBar } from "@/components/ds/SearchBar";
import { CategoryChip } from "@/components/ds/CategoryChip";
import { PlaceCard } from "@/components/ds/PlaceCard";
import { BottomNav } from "@/components/ds/BottomNav";
import { Sheet } from "@/components/ds/Sheet";
import { Toast } from "@/components/ds/Toast";
import { REGIONS, getRegionToCitySlug, type RegionName } from "@/lib/regions";

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "beach", label: "Beach", icon: "waves" },
  { key: "historic", label: "Historic", icon: "landmark" },
  { key: "nature", label: "Nature", icon: "trees" },
  { key: "desert", label: "Desert", icon: "mountain" },
  { key: "dining", label: "Dining", icon: "utensils" },
];

const RAILS = [
  {
    title: "Popular near Cairo",
    places: [
      { title: "Wadi Degla Protectorate", area: "Maadi, Cairo", rating: "4.9", badge: "Guest favorite" },
      { title: "Al-Azhar Park", area: "Islamic Cairo", rating: "4.8" },
      { title: "Zamalek Nile Corniche", area: "Zamalek, Cairo", rating: "4.7" },
    ],
  },
  {
    title: "Weekend getaways",
    places: [
      { title: "Siwa Oasis Camp", area: "Siwa", rating: "4.9", badge: "Curated" },
      { title: "Ain Sokhna Beach House", area: "Ain Sokhna", rating: "4.6" },
      { title: "Fayoum Lakeside", area: "Fayoum", rating: "4.8" },
    ],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [cat, setCat] = React.useState("beach");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; tone: "success" | "error" } | null>(null);

  const onRegionSelect = (label: RegionName) => {
    setFiltersOpen(false);
    const slug = getRegionToCitySlug(label);
    router.push(`/explorer/${slug}`);
  };

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
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 8px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            fontWeight: 600,
            lineHeight: 1.3,
            color: "var(--brand-700)",
          }}
        >
          Khargny
        </span>
        <IconButton
          ariaLabel="Language"
          icon={
            <img
              src="https://unpkg.com/lucide-static@0.462.0/icons/globe.svg"
              width={16}
              height={16}
              alt=""
            />
          }
        />
      </div>

      {/* Search */}
      <div style={{ padding: "0 16px 12px" }}>
        <SearchBar area="Anywhere in Egypt" onOpen={() => setFiltersOpen(true)} />
      </div>

      {/* Category rail */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "0 12px 10px",
          overflowX: "auto",
        }}
      >
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c.key}
            label={c.label}
            active={cat === c.key}
            onClick={() => setCat(c.key)}
            icon={
              <img
                src={`https://unpkg.com/lucide-static@0.462.0/icons/${c.icon}.svg`}
                width={22}
                height={22}
                alt=""
              />
            }
          />
        ))}
      </div>

      {/* Rails */}
      <main style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {RAILS.map((rail) => (
          <section key={rail.title} style={{ marginBottom: 20 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                fontWeight: 600,
                lineHeight: 1.3,
                color: "var(--text-primary)",
                padding: "4px 16px 10px",
                margin: 0,
              }}
            >
              {rail.title}
            </h2>
            <div
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                padding: "0 16px",
              }}
            >
              {rail.places.map((p) => (
                <PlaceCard
                  key={p.title}
                  size="sm"
                  title={p.title}
                  area={p.area}
                  rating={p.rating}
                  badge={p.badge}
                  favorite={false}
                  // Heart tap is a no-op on the homepage this pass — TASK-0009 wires
                  // it to the saved-places backend (POST/DELETE /v1/saved-places).
                  onToggleFavorite={() =>
                    setToast({ message: `Added ${p.title} to your plan`, tone: "success" })
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <BottomNav active="discover" />

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Where to?">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {REGIONS.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => onRegionSelect(r.label)}
              style={{
                textAlign: "start",
                padding: "14px 16px",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--gray-200)",
                background: "var(--white)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "var(--motion-color), var(--motion-shadow)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Sheet>

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}
