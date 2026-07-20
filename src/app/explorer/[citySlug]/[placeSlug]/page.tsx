"use client";
/**
 * Place detail — `/explorer/{citySlug}/{placeSlug}`.
 *
 * ONE responsive layout, phone → desktop. No mobile/desktop component pair and no
 * `.khg-only-*` gating: the same markup reflows via breakpoints.
 *
 *   < 1024px : single column, compact fixed action bar at the bottom
 *   ≥ 1024px : content column + sticky action rail (no fixed bar — the rail holds it)
 *
 * Structure: constrained hero → identity (name / rating / price / status) → chips →
 * about → gallery → hours → similar. Actions live in the rail (desktop) or the bar
 * (mobile), never both.
 */
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Share, Navigation, Heart, Phone, Globe, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/ds/SiteHeader";
import { MediaShowcase, type ShowcaseItem } from "@/components/explorer/MediaShowcase";
import { HoursTable } from "@/components/explorer/HoursTable";
import { SimilarPlaces } from "@/components/explorer/SimilarPlaces";
import { LoadingSkeleton } from "@/components/explorer/LoadingSkeleton";
import { ErrorState } from "@/components/explorer/ErrorState";
import { NotFoundState } from "@/components/explorer/NotFoundState";
import { usePlace, useSimilarPlaces } from "@/lib/api/hooks/use-places";
import { useCities } from "@/lib/api/hooks/use-cities";
import { useSaveToggle } from "@/lib/api/hooks/use-saved-places";
import { useI18n } from "@/i18n/LocaleProvider";
import { icon } from "@/lib/icon-catalog";
import { API_BASE_URL } from "@/lib/config";
import type { PlaceHour } from "@/lib/api/types";
import type { HoursRow } from "@/components/explorer/HoursTable";

// Day labels indexed by dayOfWeek (0=Sunday … 6=Saturday — backend convention,
// Modules/place-hours PlaceHourItemDto). Displayed Saturday-first (Egypt week).
const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DISPLAY_ORDER = [6, 0, 1, 2, 3, 4, 5]; // Sat → Fri

// Price as words, not "level 3". Readers understand cheap/expensive instantly.
const PRICE_EN = ["Cheap", "Moderate", "Pricey", "Expensive"];
const PRICE_AR = ["رخيص", "متوسط", "مرتفع", "غالي"];

/** "HH:mm" (24h) → "9:00 AM". Returns the raw string if it can't parse. */
function formatTime(hhmm: string, locale: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  const min = m[2];
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (locale === "ar") return `${h12}:${min} ${h < 12 ? "ص" : "م"}`;
  return `${h12}:${min} ${h < 12 ? "AM" : "PM"}`;
}

/** Build the ordered, localized 7-day rows from the backend placeHours array. */
function buildHoursRows(
  placeHours: PlaceHour[] | undefined,
  locale: string,
  closedLabel: string,
): { rows: HoursRow[]; hasAnyOpen: boolean } {
  if (!placeHours?.length) return { rows: [], hasAnyOpen: false };
  const byDay = new Map(placeHours.map((h) => [h.dayOfWeek, h]));
  const labels = locale === "ar" ? DAY_LABELS_AR : DAY_LABELS_EN;
  let hasAnyOpen = false;
  const rows: HoursRow[] = DISPLAY_ORDER.map((dow) => {
    const h = byDay.get(dow);
    const open = h && !h.isClosed && h.openTime && h.closeTime;
    if (open) hasAnyOpen = true;
    return {
      day: labels[dow],
      open: open ? formatTime(h!.openTime!, locale) : "",
      close: open ? formatTime(h!.closeTime!, locale) : "",
      closed: !open,
      closedLabel,
    };
  });
  return { rows, hasAnyOpen };
}

function PlaceDetailPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const citySlug = params.citySlug as string;
  const placeSlug = params.placeSlug as string;

  const { data: place, isLoading, isError, error, refetch } = usePlace(placeSlug);
  const { data: similar } = useSimilarPlaces(place?.id ?? null);
  const { data: cities } = useCities();

  const currentCity = cities?.find((c) => c.slug === citySlug);

  // Heart is wired to the saved-places backend. No login — guest cookie auth
  // (khargny_guest_id); POST /v1/saved-places is idempotent, so re-tapping is safe.
  const { saved: placeSaved, toggle: toggleSaved, isPending: isSavingPending } =
    useSaveToggle(place?.id ?? null);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--surface-app)" }}>
        <SiteHeader active="explore" />
        <LoadingSkeleton variant="detail" />
      </div>
    );
  }

  if (isError) {
    const notFound = error && "status" in error && (error as { status: number }).status === 404;
    return (
      <div style={{ minHeight: "100vh", background: "var(--surface-app)" }}>
        <SiteHeader active="explore" />
        {notFound ? (
          <NotFoundState
            backHref={`/explorer/${citySlug}`}
            backLabel={t("explorer.backTo", { city: currentCity?.name || t("explorer.places") })}
          />
        ) : (
          <ErrorState message={t("explorer.loadFailedPlace")} onRetry={() => refetch()} />
        )}
      </div>
    );
  }

  if (!place) return null;

  const title = locale === "ar" ? place.name : place.nameEn || place.name;
  const description = (locale === "en" && (place as any).descriptionEn) || place.description;
  const rating = Number(place.rating);
  const hasRating = rating > 0;
  const priceIdx = place.priceRange ? Math.min(Math.max(place.priceRange, 1), 4) - 1 : null;
  const priceLabel = priceIdx === null ? null : (locale === "ar" ? PRICE_AR : PRICE_EN)[priceIdx];

  // "Cover" is one concept: the first image is the card thumbnail AND this hero.
  // The gallery shows only the rest, so the cover never appears twice.
  const allImages = ((place as any).images ?? []) as {
    url: string;
    alt?: string;
    urls?: { thumb?: string; small?: string; medium?: string; large?: string };
  }[];
  const cover = allImages[0];
  const coverUrl = cover ? cover.urls?.large || cover.urls?.medium || cover.url : null;
  const galleryImages = allImages.slice(1).map((img) => ({
    url: img.urls?.medium || img.urls?.small || img.url,
    alt: img.alt,
  }));

  // Videos live in the payload but were never rendered — this is the fix. The showcase gets
  // the gallery photos (cover excluded, it's the hero) followed by every video.
  const placeVideos = ((place as any).videos ?? []) as {
    url: string;
    posterUrl?: string | null;
    durationSeconds?: number | null;
  }[];
  const showcaseItems: ShowcaseItem[] = [
    ...galleryImages.map((img): ShowcaseItem => ({ type: "image", url: img.url, alt: img.alt })),
    ...placeVideos.map((v): ShowcaseItem => ({
      type: "video",
      url: v.url,
      poster: v.posterUrl ?? null,
      durationSeconds: v.durationSeconds ?? null,
    })),
  ];

  const amenities = ((place as any).amenities ?? []) as {
    id: string;
    name: string;
    nameEn: string | null;
    icon?: string | null;
  }[];
  const tags = ((place as any).tags ?? []) as { id: string; name: string; nameEn: string | null }[];
  const { rows: hoursRows, hasAnyOpen } = buildHoursRows(
    place.placeHours,
    locale,
    t("explorer.hoursClosed"),
  );

  const directionsUrl = place.mapsUrl
    ? place.mapsUrl
    : place.lat && place.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
      : null;

  // Record the tap, then let the link do its normal thing. Fire-and-forget and errors are
  // swallowed on purpose: a metrics write must never delay or block someone getting
  // directions, and sendBeacon survives the page being backgrounded on mobile.
  const onDirections = () => {
    if (!place?.id) return;
    const url = `${API_BASE_URL}/v1/places/${place.id}/directions`;
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(url);
      } else {
        void fetch(url, { method: "POST", keepalive: true }).catch(() => {});
      }
    } catch {
      /* metrics are best-effort */
    }
  };

  const onShare = async () => {
    const url = `${window.location.origin}/explorer/${citySlug}/${placeSlug}`;
    try {
      if (navigator.share) await navigator.share({ title, text: title, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* dismissed */
    }
  };

  const saveButton = (
    <button
      type="button"
      onClick={toggleSaved}
      disabled={isSavingPending}
      className="pd-btn pd-btn-primary"
      data-saved={placeSaved || undefined}
    >
      <Heart size={18} fill={placeSaved ? "currentColor" : "none"} />
      {placeSaved ? t("place.saved") : t("place.save")}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-app)" }}>
      <SiteHeader active="explore" />

      <style>{`
        /* ── Shell: safe gutters at every width, capped for readability ───────── */
        .pd-shell { width:100%; max-width:1200px; margin:0 auto; padding:16px 16px 96px; }
        @media (min-width:640px){ .pd-shell { padding:20px 24px 96px; } }
        @media (min-width:1024px){ .pd-shell { padding:24px 40px 64px; } }

        /* ── Hero: constrained so content stays above the fold ───────────────── */
        .pd-hero { position:relative; width:100%; height:clamp(220px, 38vw, 420px);
                   border-radius:var(--radius-xl); overflow:hidden;
                   background:var(--gradient-sunset-radial); }
        .pd-hero-controls { position:absolute; inset:12px 12px auto 12px;
                            display:flex; align-items:center; justify-content:space-between; }
        @media (min-width:640px){ .pd-hero-controls { inset:16px 16px auto 16px; } }

        /* ── Body grid: 1 col → content + sticky rail ────────────────────────── */
        .pd-grid { display:grid; grid-template-columns:1fr; gap:32px; margin-top:24px; }
        @media (min-width:1024px){
          .pd-grid { grid-template-columns:minmax(0,1fr) 340px; gap:48px; align-items:start; }
        }
        .pd-main { min-width:0; display:flex; flex-direction:column; gap:36px; }
        .pd-rail { display:none; }
        @media (min-width:1024px){
          .pd-rail { display:block; position:sticky; top:88px; }
        }

        /* ── Identity block ──────────────────────────────────────────────────── */
        .pd-title { font-family:var(--font-display); font-weight:600; line-height:1.15;
                    letter-spacing:-0.02em; color:var(--text-primary);
                    font-size:clamp(1.75rem, 1.2rem + 2vw, 2.75rem); margin:0;
                    text-wrap:balance; }
        .pd-meta { display:flex; flex-wrap:wrap; align-items:center; gap:8px 14px;
                   margin-top:10px; font-size:var(--text-sm); color:var(--text-secondary); }
        .pd-meta-item { display:inline-flex; align-items:center; gap:6px; }
        .pd-addr { display:flex; align-items:flex-start; gap:8px; margin-top:12px;
                   font-size:var(--text-md); line-height:1.5; color:var(--text-secondary);
                   max-width:65ch; }

        .pd-pill { display:inline-flex; align-items:center; gap:6px; border-radius:var(--radius-full);
                   padding:4px 10px; font-size:var(--text-xs); font-weight:600; }
        .pd-pill-open { background:var(--success-bg); color:var(--success); }
        .pd-pill-price { background:var(--brand-50); color:var(--brand-700); border:1px solid var(--brand-100); }

        /* ── Sections ────────────────────────────────────────────────────────── */
        .pd-section-title { font-family:var(--font-display); font-size:var(--text-xl);
                            font-weight:600; line-height:1.3; color:var(--text-primary);
                            margin:0 0 12px; }
        .pd-prose { font-size:var(--text-md); line-height:1.7; color:var(--text-secondary);
                    max-width:70ch; margin:0; text-wrap:pretty; }

        /* ── Chips (amenities + tags) ────────────────────────────────────────── */
        .pd-chips { display:flex; flex-wrap:wrap; gap:8px; }
        .pd-chip { display:inline-flex; align-items:center; gap:6px; padding:6px 12px;
                   border-radius:var(--radius-full); border:1px solid var(--border-default);
                   background:var(--white); font-size:var(--text-sm); color:var(--text-secondary); }

        /* ── Buttons: one vocabulary, all states ─────────────────────────────── */
        .pd-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px;
                  height:48px; padding:0 18px; border-radius:var(--radius-lg);
                  font-family:var(--font-display); font-size:var(--text-md); font-weight:600;
                  cursor:pointer; border:1px solid transparent; width:100%;
                  transition:background-color 180ms ease, color 180ms ease,
                             border-color 180ms ease, box-shadow 180ms ease; }
        .pd-btn:disabled { opacity:.6; cursor:default; }
        .pd-btn:focus-visible { outline:2px solid var(--brand-600); outline-offset:2px; }
        .pd-btn-primary { background:var(--brand-600); color:var(--white); }
        .pd-btn-primary:hover:not(:disabled) { background:var(--brand-700); }
        .pd-btn-primary[data-saved] { background:var(--white); color:var(--brand-600);
                                      border-color:var(--brand-600); }
        .pd-btn-secondary { background:var(--white); color:var(--text-primary);
                            border-color:var(--border-default); }
        .pd-btn-secondary:hover { border-color:var(--gray-400); }

        .pd-iconbtn { width:44px; height:44px; border-radius:50%; background:var(--white);
                      border:1px solid var(--border-default); display:inline-flex;
                      align-items:center; justify-content:center; cursor:pointer;
                      transition:background-color 180ms ease, box-shadow 180ms ease; }
        .pd-iconbtn:hover { box-shadow:var(--shadow-sm); }
        .pd-iconbtn:focus-visible { outline:2px solid var(--brand-600); outline-offset:2px; }

        /* ── Action rail (desktop) ───────────────────────────────────────────── */
        .pd-card { border:1px solid var(--border-default); border-radius:var(--radius-xl);
                   background:var(--white); padding:20px; }
        .pd-card + .pd-card { margin-top:16px; }
        .pd-actions { display:flex; flex-direction:column; gap:10px; }
        .pd-link-row { display:flex; align-items:center; gap:10px; padding:10px 0;
                       font-size:var(--text-sm); color:var(--text-secondary);
                       text-decoration:none; border-top:1px solid var(--border-default); }
        .pd-link-row:first-of-type { border-top:0; }
        .pd-link-row:hover { color:var(--brand-700); }

        /* ── Mobile action bar: same actions, only below the rail breakpoint ─── */
        .pd-bar { position:fixed; inset-inline:0; bottom:0; z-index:30;
                  background:var(--white); border-top:1px solid var(--border-default); }
        .pd-bar-inner { max-width:1200px; margin:0 auto; padding:12px 16px;
                        display:flex; align-items:center; gap:10px; }
        @media (min-width:640px){ .pd-bar-inner { padding:12px 24px; } }
        @media (min-width:1024px){ .pd-bar { display:none; } }
        .pd-bar .pd-btn { flex:1; }

        @media (prefers-reduced-motion: reduce){
          .pd-btn, .pd-iconbtn { transition:none; }
        }
      `}</style>

      <main className="pd-shell">
        {/* Hero */}
        <div
          className="pd-hero"
          style={coverUrl ? { background: `center/cover no-repeat url(${coverUrl})` } : undefined}
        >
          <div className="pd-hero-controls">
            <button type="button" aria-label={t("explorer.back")} onClick={() => router.back()} className="pd-iconbtn">
              <ArrowLeft size={18} color="var(--gray-900)" />
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" aria-label={t("explorer.share")} onClick={onShare} className="pd-iconbtn">
                <Share size={16} color="var(--gray-900)" />
              </button>
              <button
                type="button"
                aria-label={placeSaved ? `Remove ${title} from your plan` : `Add ${title} to your plan`}
                aria-pressed={placeSaved}
                onClick={toggleSaved}
                disabled={isSavingPending}
                className="pd-iconbtn"
              >
                <Heart
                  size={18}
                  color={placeSaved ? "var(--brand-600)" : "var(--gray-500)"}
                  fill={placeSaved ? "var(--brand-600)" : "none"}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="pd-grid">
          {/* ── Content ── */}
          <div className="pd-main">
            <header>
              <h1 className="pd-title">{title}</h1>
              <div className="pd-meta">
                {hasRating && (
                  <span className="pd-meta-item">
                    <Star size={15} fill="var(--brand-600)" color="var(--brand-600)" />
                    <strong style={{ color: "var(--text-primary)" }}>{rating.toFixed(1)}</strong>
                  </span>
                )}
                {priceLabel && <span className="pd-pill pd-pill-price">{priceLabel}</span>}
              </div>
              {place.address && (
                <p className="pd-addr">
                  <MapPin size={17} style={{ flexShrink: 0, marginTop: 2 }} color="var(--text-tertiary)" />
                  <span>{place.address}</span>
                </p>
              )}
            </header>

            {(amenities.length > 0 || tags.length > 0) && (
              <section>
                <h2 className="pd-section-title">{t("place.amenities")}</h2>
                <div className="pd-chips">
                  {/* The icon is the one the admin picked in the dashboard, drawn from the
                      shared lucide catalog — the same glyph the Expo app shows. Amenities
                      with no icon set simply render as text. */}
                  {amenities.map((a) => (
                    <span key={a.id} className="pd-chip">
                      {a.icon && icon(a.icon, 15)}
                      {locale === "ar" ? a.name : a.nameEn || a.name}
                    </span>
                  ))}
                  {tags.map((tg) => (
                    <span key={tg.id} className="pd-chip">
                      #{locale === "ar" ? tg.name : tg.nameEn || tg.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {description && (
              <section>
                <h2 className="pd-section-title">{t("explorer.about")}</h2>
                <p className="pd-prose">{description}</p>
              </section>
            )}

            {showcaseItems.length > 0 && (
              <section>
                <h2 className="pd-section-title">{t("place.gallery")}</h2>
                <MediaShowcase items={showcaseItems} />
              </section>
            )}

            <section>
              <h2 className="pd-section-title">{t("explorer.hoursTitle")}</h2>
              {hasAnyOpen ? (
                <HoursTable hours={hoursRows} />
              ) : (
                <p className="pd-prose" style={{ fontSize: "var(--text-sm)" }}>
                  {t("explorer.hoursNA")}
                </p>
              )}
            </section>

            {similar && similar.length > 0 && <SimilarPlaces places={similar} citySlug={citySlug} />}
          </div>

          {/* ── Action rail (desktop only; mobile uses the bar below) ── */}
          <aside className="pd-rail">
            <div className="pd-card">
              <div className="pd-actions">
                {saveButton}
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pd-btn pd-btn-secondary"
                    onClick={onDirections}
                  >
                    <Navigation size={18} />
                    {t("explorer.directions")}
                  </a>
                )}
              </div>
              {(place.phone || place.website) && (
                <div style={{ marginTop: 16 }}>
                  {place.phone && (
                    <a href={`tel:${place.phone}`} className="pd-link-row">
                      <Phone size={16} /> {place.phone}
                    </a>
                  )}
                  {place.website && (
                    <a href={place.website} target="_blank" rel="noopener noreferrer" className="pd-link-row">
                      <Globe size={16} /> {t("place.website")}
                    </a>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile action bar — hidden ≥1024 where the rail takes over */}
      <div className="pd-bar">
        <div className="pd-bar-inner">
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("explorer.directions")}
              className="pd-iconbtn"
              style={{ flexShrink: 0 }}
              onClick={onDirections}
            >
              <Navigation size={18} color="var(--gray-900)" />
            </a>
          )}
          {saveButton}
        </div>
      </div>
    </div>
  );
}

export default PlaceDetailPage;
