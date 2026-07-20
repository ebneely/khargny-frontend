"use client";
/**
 * Explorer home — `/explorer` (city picker).
 * Restyled against the Khargny Design System (TASK-0008).
 * See `UI_UX/explorer/structure/explorer-home/wireframe.md` for the layout spec.
 */
import * as React from "react";
import { useState } from "react";
import { SiteHeader } from "@/components/ds/SiteHeader";
import { CityGrid } from "@/components/explorer/CityGrid";
import { SearchBar } from "@/components/explorer/SearchBar";
import { LoadingSkeleton } from "@/components/explorer/LoadingSkeleton";
import { ErrorState } from "@/components/explorer/ErrorState";
import { useCities } from "@/lib/api/hooks/use-cities";
import { useI18n } from "@/i18n/LocaleProvider";

export default function ExplorerPage() {
  const { t } = useI18n();
  const { data: cities, isLoading, isError, refetch } = useCities();
  const [search, setSearch] = useState("");

  const filtered = cities?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.nameEn?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface-app)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* One header at every width. This page used to swap in a mobile-only ExplorerHeader
          that was just a logo — SiteHeader is responsive and carries real navigation. */}
      <SiteHeader active="explore" />

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-4)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "var(--space-10)" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-4xl)",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "var(--text-primary)",
              margin: "0 0 var(--space-2)",
            }}
          >
            {t("explorer.title")}
          </h1>
          <p
            style={{
              fontSize: "var(--text-lg)",
              color: "var(--text-tertiary)",
              margin: 0,
            }}
          >
            {t("explorer.subtitle")}
          </p>
        </div>

        <div
          style={{
            maxWidth: 480,
            margin: "0 auto var(--space-8)",
          }}
        >
          <SearchBar value={search} onChange={setSearch} placeholder={t("explorer.pickCity")} />
        </div>

        {isLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "var(--space-4)",
              padding: "0 var(--space-4)",
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 128,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--gray-100)",
                  animation: "khargny-pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
            <style>{`@keyframes khargny-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
          </div>
        ) : isError ? (
          <ErrorState message={t("errors.loadFailed")} onRetry={() => refetch()} />
        ) : (
          <>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                fontWeight: 600,
                lineHeight: 1.3,
                color: "var(--text-primary)",
                padding: "0 var(--space-4)",
                margin: "0 0 var(--space-4)",
              }}
            >
              {t("explorer.pickCity")}
            </h2>
            <CityGrid cities={filtered || []} />
          </>
        )}
      </main>
    </div>
  );
}
