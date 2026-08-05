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
        fontWeight: 600,
        color: "var(--brand-700)",
        // Solid, not translucent: the pill sits on a photograph now, and a tinted panel
        // over an unknown image is a contrast gamble.
        background: "var(--white)",
        borderRadius: 999,
        padding: "4px 10px",
        boxShadow: "0 2px 8px -2px rgba(36, 28, 22, 0.45)",
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
              {/* The count rides on the photo so the name below gets the full card width.
                  Sharing one row, the two competed and the name lost. */}
              <CountPill slug={city.slug} />
            </div>
            <div className="khg-city-body">
              <h3 className="khg-city-name">{name}</h3>
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
        /* The count sits on the photo, so the name owns the full width of the row and reads
           in full. Sharing the row meant "Alexandria" and "Port Said" both truncated to
           three letters and an ellipsis — the pill won a fight it should never have been in. */
        .khg-city-count {
          position:absolute; inset-block-end:10px; inset-inline-start:12px;
        }
        .khg-city-body { padding:14px 16px; }
        .khg-city-name {
          font-family:var(--font-display); font-size:var(--text-lg); font-weight:600;
          line-height:1.3; color:var(--text-primary); margin:0;
          /* Two lines is enough for every governorate name in both languages, and holding
             the height steady keeps the cards in a row aligned. */
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
          overflow:hidden; overflow-wrap:anywhere;
          min-height:calc(2 * 1.3em);
        }
      `}</style>
    </div>
  );
}
