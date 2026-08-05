"use client";
/**
 * CityGrid — city cards for the explorer. Each card is a Link to /explorer/{slug} with a warm
 * gradient header (MapPin + city initial), the localized city name, and a place-count pill.
 * Localized: shows the Arabic or English city name by locale; count word via the dictionary.
 */
import * as React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useCityPlaces } from "@/lib/api/hooks/use-cities";
import { useI18n } from "@/i18n/LocaleProvider";
import type { City } from "@/lib/api/types";

type CityGridProps = { cities: City[] };

function CountPill({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { data, isLoading } = useCityPlaces(slug);
  if (isLoading) {
    return (
      <span aria-hidden className="khg-city-count" style={{ display: "inline-block", width: 56, height: 22, borderRadius: 999, background: "var(--gray-100)" }} />
    );
  }
  const n = data?.items?.length ?? 0;
  return (
    <span
      data-trace-id={`city-card-count-${slug}`}
      className="khg-city-count"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: "var(--text-xs)",
        fontWeight: 500,
        color: "var(--brand-700)",
        background: "var(--brand-50)",
        border: "1px solid var(--brand-100)",
        borderRadius: 999,
        padding: "3px 10px",
        // The count must never be the thing that gives way — it is the card's only datum.
        whiteSpace: "nowrap",
      }}
    >
      {t("explorer.placeCount", { count: n })}
    </span>
  );
}

export function CityGrid({ cities }: CityGridProps) {
  const { t, locale } = useI18n();

  if (cities.length === 0) {
    return (
      <div role="status" aria-live="polite" style={{ padding: "var(--space-12) var(--space-4)", textAlign: "center", fontFamily: "var(--font-body)" }}>
        <p style={{ fontSize: "var(--text-base)", lineHeight: 1.5, color: "var(--text-tertiary)", margin: 0 }}>
          {t("explorer.noCities")}
        </p>
      </div>
    );
  }

  return (
    <div className="khg-city-grid">
      {cities.map((city) => {
        const name = locale === "ar" ? city.name : city.nameEn || city.name;
        const initial = (name || "?").trim().charAt(0);
        return (
          <Link
            key={city.id}
            href={`/explorer/${city.slug}`}
            className="khg-city-card"
            data-trace-id={`city-card-${city.slug}`}
          >
            <div
              className="khg-city-thumb"
              style={
                city.imageUrl
                  ? { background: `center/cover no-repeat url(${city.imageUrl})` }
                  : undefined
              }
            >
              {!city.imageUrl && <span className="khg-city-initial">{initial}</span>}
              <MapPin size={18} className="khg-city-pin" aria-hidden />
            </div>
            <div className="khg-city-body">
              <h3 className="khg-city-name" title={name}>{name}</h3>
              <CountPill slug={city.slug} />
            </div>
          </Link>
        );
      })}
      <style>{`
        .khg-city-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--space-4); }
        @media (min-width:1024px){ .khg-city-grid { grid-template-columns:repeat(3,1fr); } }
        .khg-city-card {
          display:flex; flex-direction:column; overflow:hidden;
          border-radius:var(--radius-xl); background:var(--white);
          border:1px solid var(--border-default); text-decoration:none;
          font-family:var(--font-body);
          transition:var(--motion-shadow), var(--motion-transform);
        }
        .khg-city-card:hover { box-shadow:var(--shadow-md); transform:translateY(-3px); }
        .khg-city-thumb {
          /* A landscape photo well (16:10), not a thin 96px strip, so the city photo reads
             as a photo. background-size:cover fills it without distortion. */
          position:relative; aspect-ratio:16 / 10; width:100%;
          background:linear-gradient(135deg, var(--brand-500), var(--brand-700));
          background-size:cover; background-position:center;
          display:flex; align-items:center; justify-content:center;
        }
        .khg-city-initial {
          font-family:var(--font-display); font-size:2.4rem; font-weight:700;
          color:var(--white); opacity:.9; line-height:1;
        }
        .khg-city-pin { position:absolute; inset-block-end:10px; inset-inline-end:12px; color:rgba(255,255,255,.85); }
        /* The name yields, the count never does. Without min-width:0 a flex child refuses to
           shrink below its content, so a long city name pushed the pill out of alignment
           instead of truncating. A fixed body height also keeps the name baselines level
           across a row, which is what makes the grid read as a set. */
        .khg-city-body {
          display:flex; align-items:center; justify-content:space-between;
          gap:10px; padding:14px 16px; min-height:58px;
        }
        .khg-city-name {
          font-family:var(--font-display); font-size:var(--text-lg); font-weight:600;
          line-height:1.3; color:var(--text-primary); margin:0;
          min-width:0; flex:1 1 auto;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .khg-city-count { flex:0 0 auto; }
        /* Below ~380px the pill and a truncated name both become unreadable, so stack them
           and let the name have the full width. */
        @media (max-width:379px) {
          .khg-city-body { flex-direction:column; align-items:flex-start; gap:6px; min-height:0; }
          .khg-city-name { white-space:normal; overflow-wrap:anywhere; }
        }
      `}</style>
    </div>
  );
}
