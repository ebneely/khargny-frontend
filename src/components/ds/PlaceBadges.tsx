"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { BadgeCheck, Footprints, Utensils } from "lucide-react";
import { useI18n } from "@/i18n/LocaleProvider";
import { priceBandLabel } from "@/lib/price-bands";
import styles from "./PlaceBadges.module.css";

type Props = {
  hasMenu?: boolean;
  priceVerified?: boolean;
  visitedByUs?: boolean;
  priceRange?: number | null;
  priceClassName?: string;
};

export function PlaceBadges({ hasMenu = false, priceVerified = false, visitedByUs = false, priceRange, priceClassName }: Props) {
  const { t, locale } = useI18n();
  const [open, setOpen] = React.useState(false);
  const explanationId = React.useId();
  const priceLabel = priceBandLabel(priceRange, locale);

  return (
    <>
      {hasMenu && <span className={styles.badge}><Utensils size={14} aria-hidden="true" />{t("place.menu")}</span>}
      {(priceLabel || priceVerified) && (
        <span className={styles.priceGroup}>
          {priceLabel && <span className={priceClassName} dir={locale === "ar" ? "rtl" : "ltr"}>{priceLabel}</span>}
          {priceVerified && (
            <Popover.Root open={open} onOpenChange={setOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className={`${styles.badge} ${styles.verified}`}
                  aria-label={t("place.priceVerified")}
                  aria-describedby={open ? explanationId : undefined}
                  title={t("place.priceVerifiedHint")}
                  onClick={(event) => event.stopPropagation()}
                  onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }}
                  onPointerLeave={(event) => { if (event.pointerType === "mouse") setOpen(false); }}
                >
                  <BadgeCheck size={14} aria-hidden="true" />{t("place.priceVerified")}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  aria-label={t("place.priceVerified")}
                  className={styles.explanation}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  sideOffset={6}
                  collisionPadding={12}
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  onCloseAutoFocus={(event) => event.preventDefault()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <span id={explanationId}>{t("place.priceVerifiedHint")}</span>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          )}
        </span>
      )}
      {visitedByUs && <span className={styles.badge}><Footprints size={14} aria-hidden="true" />{t("place.visitedByUs")}</span>}
    </>
  );
}
