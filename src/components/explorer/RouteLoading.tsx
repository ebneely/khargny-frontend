"use client";
/**
 * RouteLoading — what a visitor sees the instant they tap a city or a place.
 *
 * The explorer routes resolve their data on the server before they answer (the redirect for an
 * old address and the 404 for an unknown one are decided there). Without a loading boundary
 * the router waits for that answer before it shows anything, so a tap on a card looked ignored
 * for as long as the server took. With this, the tap lands at once on a page-shaped
 * placeholder under the real header, and the content replaces it when it arrives.
 *
 * One component serves every explorer segment: it reads the address being loaded and draws
 * the shape of that page (a place, or a list of places).
 */
import * as React from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/ds/SiteHeader";
import { useI18n } from "@/i18n/LocaleProvider";

const block = (style: React.CSSProperties): React.CSSProperties => ({
  background: "var(--gray-100)",
  borderRadius: "var(--radius-md)",
  animation: "khargny-pulse 1.5s ease-in-out infinite",
  ...style,
});

function PlaceShape() {
  return (
    <>
      <div style={block({ aspectRatio: "16 / 9", maxHeight: 520, width: "100%", borderRadius: "var(--radius-2xl)" })} />
      <div style={block({ height: 40, width: "min(60%, 420px)", marginTop: "var(--space-6)" })} />
      <div style={block({ height: 18, width: "min(45%, 320px)", marginTop: "var(--space-3)" })} />
      <div style={block({ height: 120, width: "100%", marginTop: "var(--space-8)" })} />
    </>
  );
}

function ListShape() {
  return (
    <>
      <div style={block({ height: 36, width: "min(40%, 240px)" })} />
      <div style={block({ height: 16, width: 120, marginTop: "var(--space-2)" })} />
      <div style={block({ height: 44, width: "100%", marginTop: "var(--space-6)", borderRadius: "var(--radius-full)" })} />
      <div className="khg-place-grid" style={{ marginTop: "var(--space-6)" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <div style={block({ aspectRatio: "1 / 1", width: "100%", borderRadius: "var(--radius-xl)" })} />
            <div style={block({ height: 16, width: "70%" })} />
            <div style={block({ height: 12, width: "45%" })} />
          </div>
        ))}
      </div>
    </>
  );
}

export function RouteLoading() {
  const { t } = useI18n();
  const pathname = usePathname() ?? "";
  // /explorer/<city>/<place>, with or without the language prefix.
  const parts = pathname.split("/").filter(Boolean);
  const from = parts.indexOf("explorer");
  const isPlace = from >= 0 && parts.length - from - 1 >= 2;

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-app)", fontFamily: "var(--font-body)" }}>
      <SiteHeader active="explore" />
      <main
        role="status"
        aria-busy="true"
        aria-label={t("common.loading")}
        data-route-loading={isPlace ? "place" : "list"}
        style={{ maxWidth: 1120, margin: "0 auto", width: "100%", padding: "var(--space-6) clamp(16px, 4vw, 32px)" }}
      >
        {isPlace ? <PlaceShape /> : <ListShape />}
        <style>{`
          @keyframes khargny-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @media (prefers-reduced-motion: reduce) { [data-route-loading] * { animation: none !important; } }
        `}</style>
      </main>
    </div>
  );
}
