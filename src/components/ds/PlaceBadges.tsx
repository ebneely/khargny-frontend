"use client";

import * as React from "react";
import { BadgeCheck, Tag } from "lucide-react";
import { useI18n } from "@/i18n/LocaleProvider";
import { priceBandLabel } from "@/lib/price-bands";
import styles from "./PlaceBadges.module.css";

type PlaceStatusFlags = {
  hasMenu?: boolean;
  priceVerified?: boolean;
  visitedByUs?: boolean;
};

type Props = PlaceStatusFlags & {
  priceRange?: number | null;
  priceClassName?: string;
  variant?: "chips" | "compact" | "price";
  mobileOnly?: boolean;
};

function VisitedMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/images/5argny-mark-48.png" srcSet="/images/5argny-mark-48.png 1x, /images/5argny-mark-96.png 2x" alt="" width={20} height={20} className={styles.mark} aria-hidden="true" />
  );
}

const STATUS_DEFINITIONS = [
  { id: "hasMenu", Icon: Tag, nameKey: "place.menu", explanationKey: "place.menuHint" },
  { id: "priceVerified", Icon: BadgeCheck, nameKey: "place.priceVerified", explanationKey: "place.priceVerifiedHint" },
  { id: "visitedByUs", Icon: VisitedMark, nameKey: "place.visitedByUs", explanationKey: "place.visitedByUsHint" },
] as const;

export function getPlaceStatuses(flags: PlaceStatusFlags, t: (key: string) => string) {
  return STATUS_DEFINITIONS.map(({ id, Icon, nameKey, explanationKey }) => {
    const available = flags[id] === true;
    return {
      id,
      Icon,
      name: t(nameKey),
      explanation: t(explanationKey),
      available,
      state: t(available ? "place.badgeAvailable" : "place.badgeNotYet"),
    };
  });
}

type PlaceStatus = ReturnType<typeof getPlaceStatuses>[number];

function StatusBadge({ status, compact = false, row = false }: { status: PlaceStatus; compact?: boolean; row?: boolean }) {
  const { Icon, name, state, available } = status;
  const label = `${name}: ${state}`;
  return (
    <span
      className={`${styles.badge} ${available ? styles.available : styles.notYet}${compact ? ` ${styles.compactBadge}` : ""}${row ? ` ${styles.statusRow}` : ""}`}
      data-place-status={status.id}
      data-state={available ? "available" : "not-yet"}
      role="img"
      aria-label={label}
      title={label}
    >
      <Icon size={16} aria-hidden="true" />
      {!compact && <span>{name}</span>}
      {row && <span className={styles.state}>{state}</span>}
    </span>
  );
}

export function PlaceBadges({ hasMenu, priceVerified, visitedByUs, priceRange, priceClassName, variant = "chips", mobileOnly = false }: Props) {
  const { t, locale } = useI18n();
  const priceLabel = priceBandLabel(priceRange, locale);
  const statuses = getPlaceStatuses({ hasMenu, priceVerified, visitedByUs }, t);

  return (
    <>
      {variant !== "price" && (
        <span className={`${styles.statuses}${variant === "compact" ? ` ${styles.compact}` : ""}${mobileOnly ? ` ${styles.mobileStatuses}` : ""}`} dir={locale === "ar" ? "rtl" : "ltr"}>
          {statuses.map((status) => <StatusBadge key={status.id} status={status} compact={variant === "compact"} />)}
        </span>
      )}
      {priceLabel && (
        <span className={styles.priceGroup}>
          <span className={priceClassName} dir={locale === "ar" ? "rtl" : "ltr"}>{priceLabel}</span>
        </span>
      )}
    </>
  );
}

export function PlaceStatuses(flags: PlaceStatusFlags) {
  const { t, locale } = useI18n();
  const headingId = React.useId();
  return (
    <section className={styles.statusBlock} data-place-statuses="true" aria-labelledby={headingId} dir={locale === "ar" ? "rtl" : "ltr"}>
      <h3 id={headingId} className={styles.statusHeading}>{t("place.badgesTitle")}</h3>
      <ul className={styles.statusList}>
        {getPlaceStatuses(flags, t).map((status) => <li key={status.id}><StatusBadge status={status} row /></li>)}
      </ul>
    </section>
  );
}

export function PlaceBadgeLegend() {
  const { t, locale } = useI18n();
  const headingId = React.useId();
  const statuses = getPlaceStatuses({ hasMenu: true, priceVerified: true, visitedByUs: true }, t);
  return (
    <section className={styles.guide} data-place-badge-legend="true" aria-labelledby={headingId} dir={locale === "ar" ? "rtl" : "ltr"}>
      <h2 id={headingId} className={styles.guideHeading}>{t("place.badgesLegendTitle")}</h2>
      <p className={styles.colorKey} data-place-badge-colors="true">
        <span><span className={`${styles.swatch} ${styles.greenDot}`} data-badge-color="green" aria-hidden="true" />{t("place.badgeGreenMeaning")}</span>
        <span><span className={`${styles.swatch} ${styles.greyDot}`} data-badge-color="grey" aria-hidden="true" />{t("place.badgeGreyMeaning")}</span>
      </p>
      <ul className={styles.legendList}>
        {statuses.map((status) => (
          <li key={status.id}>
            <span className={styles.guideName}><status.Icon size={16} aria-hidden="true" /><span>{status.name}</span></span>
            <p className={styles.legendExplanation}>{status.explanation}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
