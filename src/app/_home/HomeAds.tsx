"use client";

import * as React from "react";
import { PlaceCard } from "@/components/ds/PlaceCard";
import { CARD_RAIL_SIZES } from "@/lib/place-photo";
import { useI18n } from "@/i18n/LocaleProvider";
import { createAdTracker, observeSponsoredImpression, type AdTracker } from "@/lib/ads/tracking";
import type { AdItem, AdPlacement } from "@/lib/ads/placements";
import type { HomeDiscovery } from "./useHomeDiscovery";

function TrackedCard({ item, citySlug, area, placement, bucket, tracker, onSave, position }: {
  item: AdItem;
  citySlug: string;
  area: string;
  placement: AdPlacement;
  bucket: number | null;
  tracker: AdTracker;
  onSave: () => void;
  position?: number;
}) {
  const { t, locale } = useI18n();
  const ref = React.useRef<HTMLDivElement>(null);
  const campaignId = item.sponsored ? item.campaignId : null;
  const qualified = React.useRef(false);
  React.useEffect(() => {
    qualified.current = false;
    if (!ref.current) return;
    return observeSponsoredImpression(ref.current, campaignId, placement, bucket, tracker, () => { qualified.current = true; });
  }, [campaignId, placement, bucket, tracker]);
  const tap = () => {
    if (campaignId && qualified.current) {
      tracker.track(campaignId, placement, "tap", bucket);
      tracker.flush(true);
    }
  };
  // A paid placement says so and nothing more. The label used to read "Position 3 ? Sponsored":
  // the separator was a character lost in an encoding, and the position is ours to know, not the
  // visitor's (the order of the list already shows it).
  const badge = item.sponsored ? t("home.sponsored") : "";
  return (
    <div
      ref={ref}
      onAuxClick={(event) => { if (event.button === 1 && (event.target as Element).closest("a")) tap(); }}
      style={{ minWidth: 0 }}
    >
      <PlaceCard
        href={`/explorer/${encodeURIComponent(citySlug)}/${encodeURIComponent(item.place.slug)}`}
        onTitleClick={tap}
        size="md"
        image={item.place.coverImage}
        imageSizes={CARD_RAIL_SIZES}
        title={locale === "ar" ? item.place.name : item.place.nameEn || item.place.name}
        area={area}
        badge={badge || undefined}
        badgeTone="sponsored"
        priceRange={item.place.priceVerified ? item.place.priceRange : undefined}
        hasMenu={item.place.hasMenu}
        priceVerified={item.place.priceVerified}
        visitedByUs={item.place.visitedByUs}
        metrics={{ saves: item.place.saveCount, directions: item.place.directionsCount, views: item.place.viewCount }}
        favorite={false}
        onToggleFavorite={onSave}
      />
    </div>
  );
}

export function HomeAds({ d }: { d: HomeDiscovery }) {
  const { t, locale } = useI18n();
  const [tracker] = React.useState(createAdTracker);
  React.useEffect(() => tracker.listen(), [tracker]);
  const cityById = React.useMemo(() => new Map(d.activeCities.map((city) => [city.id, city])), [d.activeCities]);
  const cityName = (cityId: string) => {
    const city = cityById.get(cityId);
    return city ? (locale === "ar" ? city.name : city.nameEn || city.name) : "";
  };
  return (
    <>
      {d.featured ? (
        <section aria-labelledby="home-featured-title" data-ad-placement="featured" className="khg-anim-in-2" style={{ margin: "clamp(24px, 5vw, 36px) 0" }}>
          <h2 id="home-featured-title" className="khg-section-title">{locale === "ar" ? d.featured.section.titleAr : d.featured.section.titleEn}</h2>
          <div className="khg-home-rail no-scrollbar">
            {d.featured.items.map((item) => (
              <TrackedCard key={`${item.place.id}:${item.campaignId ?? "organic"}`} item={item} citySlug={cityById.get(item.place.cityId)!.slug} area={cityName(item.place.cityId)} placement="featured" bucket={d.featured!.rotation.bucket} tracker={tracker} onSave={() => d.onSavePlace(item.place.id)} />
            ))}
          </div>
        </section>
      ) : null}

      {d.topPlaces || d.topCity ? (
        <section aria-labelledby={d.topPlaces ? "home-top10-title" : undefined} data-ad-placement="top10" className="khg-anim-in-2" style={{ margin: "clamp(24px, 5vw, 36px) 0" }}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            {d.topPlaces && <h2 id="home-top10-title" className="khg-section-title" style={{ marginBottom: 0 }}>{t("home.top10")}</h2>}
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>{t("home.top10City")}</span>
              <select
                value={d.topCity ?? ""}
                onChange={(event) => d.setTopCity(event.target.value || undefined)}
                aria-controls={d.topPlaces ? "home-top10-list" : undefined}
                className="max-w-48 rounded-full border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-600)]"
                style={{ borderColor: "var(--gray-300)", background: "var(--white)", color: "var(--text-primary)" }}
              >
                <option value="">{t("home.allEgypt")}</option>
                {d.activeCities.map((city) => <option key={city.id} value={city.slug}>{locale === "ar" ? city.name : city.nameEn || city.name}</option>)}
              </select>
            </label>
          </div>
          {d.topPlaces && <p className="mb-3 text-sm" style={{ color: "var(--text-secondary)" }} aria-live="polite">{t("home.showingList")} {d.topPlacesCity ? (locale === "ar" ? d.activeCities.find((city) => city.slug === d.topPlacesCity)?.name : d.activeCities.find((city) => city.slug === d.topPlacesCity)?.nameEn || d.activeCities.find((city) => city.slug === d.topPlacesCity)?.name) : t("home.allEgypt")}</p>}
          {d.topPlaces && <div id="home-top10-list" aria-busy={d.topPlacesLoading} className="khg-home-rail no-scrollbar">
            {d.topPlaces.items.map((item) => (
              <TrackedCard key={`${item.position}:${item.place.id}:${item.campaignId ?? "organic"}`} item={item} citySlug={cityById.get(item.place.cityId)!.slug} area={cityName(item.place.cityId)} placement="top10" bucket={d.topPlaces!.rotation.bucket} tracker={tracker} position={item.position} onSave={() => d.onSavePlace(item.place.id)} />
            ))}
          </div>}
        </section>
      ) : null}
    </>
  );
}
