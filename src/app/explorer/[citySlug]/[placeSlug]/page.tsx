"use client";
/**
 * Place detail — `/explorer/{citySlug}/{placeSlug}`.
 * Restyled against the Khargny Design System (TASK-0008).
 * See `UI_UX/explorer/structure/explorer-detail/wireframe.md` for the layout spec.
 *
 * The `{placeSlug}` dynamic segment is resolved by the backend (slug-aware endpoint
 * `GET /v1/places/{placeSlug}`) — see the §33 cell named in
 * `UI_UX/explorer/page-tree.md`. The hours/amenities/tags gap is a known carry-forward
 * (see `UI_UX/explorer/drift.md`).
 */
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Share, Navigation, Heart, Check } from "lucide-react";
import Link from "next/link";
import { ImageGallery } from "@/components/explorer/ImageGallery";
import { HoursTable } from "@/components/explorer/HoursTable";
import { SimilarPlaces } from "@/components/explorer/SimilarPlaces";
import { LoadingSkeleton } from "@/components/explorer/LoadingSkeleton";
import { ErrorState } from "@/components/explorer/ErrorState";
import { NotFoundState } from "@/components/explorer/NotFoundState";
import { usePlace, useSimilarPlaces } from "@/lib/api/hooks/use-places";
import { useCities } from "@/lib/api/hooks/use-cities";
import { useSaveToggle } from "@/lib/api/hooks/use-saved-places";
import { useI18n } from "@/i18n/LocaleProvider";

function PlaceDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const citySlug = params.citySlug as string;
  const placeSlug = params.placeSlug as string;

  const { data: place, isLoading, isError, error, refetch } = usePlace(placeSlug);
  const { data: similar } = useSimilarPlaces(place?.id ?? null);
  const { data: cities } = useCities();

  const currentCity = cities?.find((c) => c.slug === citySlug);

  // Heart is wired to the saved-places backend (TASK-0009).
  // No login required — guest cookie auth (khargny_guest_id, HttpOnly, set by backend
  // middleware on first request). Backend POST /v1/saved-places is idempotent on
  // (guestId, placeId); the heart toggle is therefore safe to re-tap.
  const { saved: placeSaved, toggle: toggleSaved, isPending: isSavingPending } = useSaveToggle(
    place?.id ?? null,
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--surface-app)" }}>
        <LoadingSkeleton variant="detail" />
      </div>
    );
  }

  if (isError) {
    if (error && "status" in error && (error as { status: number }).status === 404) {
      return (
        <div style={{ minHeight: "100vh", background: "var(--surface-app)" }}>
          <NotFoundState
            backHref={`/explorer/${citySlug}`}
            backLabel={`Back to ${currentCity?.name || "places"}`}
          />
        </div>
      );
    }
    return (
      <div style={{ minHeight: "100vh", background: "var(--surface-app)" }}>
        <ErrorState message="Failed to load place" onRetry={() => refetch()} />
      </div>
    );
  }

  if (!place) return null;

  const priceSymbols = place.priceRange ? "₹".repeat(Math.min(place.priceRange, 5)) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface-app)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Hero image */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          background: "var(--gradient-sunset-radial)",
        }}
      >
        <div style={{ position: "absolute", top: 14, left: 14 }}>
          <button
            type="button"
            aria-label={t("explorer.back")}
            onClick={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--white)",
              border: "1px solid var(--border-default)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={18} color="var(--gray-900)" />
          </button>
        </div>
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            display: "flex",
            gap: 8,
          }}
        >
          <button
            type="button"
            aria-label={t("explorer.share")}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--white)",
              border: "1px solid var(--border-default)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Share size={16} color="var(--gray-900)" />
          </button>
          <button
            type="button"
            aria-label={placeSaved ? `Remove ${place.name} from your plan` : `Add ${place.name} to your plan`}
            aria-pressed={placeSaved}
            onClick={toggleSaved}
            disabled={isSavingPending}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--white)",
              border: "1px solid var(--border-default)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isSavingPending ? "default" : "pointer",
              transition: "var(--motion-color)",
            }}
          >
            <Heart
              size={18}
              color={placeSaved ? "var(--brand-600)" : "var(--gray-500)"}
              fill={placeSaved ? "var(--brand-600)" : "none"}
            />
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "18px 18px 100px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-3xl)",
              fontWeight: 600,
              lineHeight: 1.3,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {place.name}
          </h1>
          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-tertiary)",
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {Number(place.rating) > 0 && (
              <>
                <Star size={14} fill="var(--brand-600)" color="var(--brand-600)" />
                {Number(place.rating).toFixed(1)} ·{" "}
              </>
            )}
            {place.address ?? "Egypt"}
            {priceSymbols && (
              <>
                {" · "}
                <span style={{ color: "var(--text-tertiary)" }}>{priceSymbols}</span>
              </>
            )}
          </div>
        </div>

        {/* Gallery */}
        <ImageGallery
          images={(place as any).images?.map((img: any) => ({ url: img.url, alt: img.alt })) || []}
        />

        {/* Description */}
        {place.description && (
          <section>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                fontWeight: 600,
                lineHeight: 1.3,
                color: "var(--text-primary)",
                margin: "0 0 var(--space-2)",
              }}
            >
              About
            </h2>
            <p
              style={{
                fontSize: "var(--text-md)",
                lineHeight: 1.65,
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              {place.description}
            </p>
          </section>
        )}

        {/* Opening Hours */}
        <section>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              fontWeight: 600,
              lineHeight: 1.3,
              color: "var(--text-primary)",
              margin: "0 0 var(--space-3)",
            }}
          >
            Opening hours
          </h2>
          <HoursTable hours={[]} />
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
              marginTop: "var(--space-1)",
            }}
          >
            Hours data not available from API yet
          </p>
        </section>

        {/* What's included — design-kit pattern; rendered only if the place has features */}
        {(place as any).features && (place as any).features.length > 0 && (
          <section>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                fontWeight: 600,
                lineHeight: 1.3,
                color: "var(--text-primary)",
                margin: "0 0 var(--space-3)",
              }}
            >
              What&apos;s included
            </h2>
            {(place as any).features.map((f: string) => (
              <div
                key={f}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: "var(--text-base)",
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                <Check size={16} color="var(--success)" /> {f}
              </div>
            ))}
          </section>
        )}

        {/* Similar Places */}
        {similar && similar.length > 0 && (
          <SimilarPlaces places={similar} citySlug={citySlug} />
        )}
      </div>

      {/* Sticky action bar — discovery product: no price/payment, just save + directions */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--white)",
          borderTop: "1px solid var(--border-default)",
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
          maxWidth: 800,
          margin: "0 auto",
          zIndex: 10,
        }}
      >
        <button
          type="button"
          aria-label={t("explorer.directions")}
          onClick={() => {
            if (place.lat && place.lng) {
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`,
                "_blank",
                "noopener,noreferrer",
              );
            }
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--white)",
            border: "1px solid var(--border-default)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Navigation size={18} color="var(--gray-900)" />
        </button>
        <Link
          href={`/explorer/${citySlug}/${placeSlug}#add-to-plan`}
          style={{
            flex: 1,
            height: 52,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--brand-600)",
            color: "var(--white)",
            border: "1px solid transparent",
            borderRadius: "var(--radius-xl)",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "var(--shadow-sm)",
            transition: "var(--motion-color), var(--motion-shadow)",
          }}
        >
          Add to my plan
        </Link>
      </div>
    </div>
  );
}

export default PlaceDetailPage;
