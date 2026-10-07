"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { useI18n } from "@/i18n/LocaleProvider";
import { apiRequest } from "@/lib/api/client";
import { normalizeMenu } from "@/lib/api/normalize-menu";
import { formatMenuPrice } from "@/lib/price-bands";
import styles from "./PlaceMenuSection.module.css";

export function PlaceMenuSection({ slug, hasMenu }: { slug: string; hasMenu: boolean }) {
  const { t, locale } = useI18n();
  const [mounted, setMounted] = React.useState(false);
  const headingId = React.useId();
  React.useEffect(() => { setMounted(true); }, []);
  const { data: menu, isError } = useQuery({
    queryKey: ["places", "menu", slug],
    queryFn: async ({ signal }) => normalizeMenu(await apiRequest<unknown>("GET", `/v1/places/${encodeURIComponent(slug)}/menu`, { signal })),
    enabled: mounted && hasMenu && Boolean(slug),
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (!hasMenu || isError || !menu?.sections.length || menu.slug !== slug) return null;

  const name = (nameAr: string | null, nameEn: string | null) => locale === "en" ? nameEn || nameAr : nameAr;
  return (
    <section aria-labelledby={headingId} dir={locale === "ar" ? "rtl" : "ltr"}>
      <h2 id={headingId} className="pd-section-title">{t("place.menu")}</h2>
      <div className={styles.sections}>
        {menu.sections.map((section) => (
          <div key={section.id ?? "unsectioned"}>
            {section.id !== null && <h3 className={styles.sectionName}>{name(section.nameAr, section.nameEn)}</h3>}
            <ul className={styles.items}>
              {section.items.map((item) => {
                const imageUrl = item.image?.small ?? item.image?.thumb ?? item.image?.medium ?? item.image?.url;
                return (
                <li key={item.id} className={`${styles.item} ${item.available ? "" : styles.unavailable}`}>
                  <span className={styles.image}>
                    {imageUrl ? (
                      <img src={imageUrl} alt="" width={64} height={64} loading="lazy" decoding="async" />
                    ) : <ImageOff size={22} aria-hidden="true" />}
                  </span>
                  <span className={styles.description}>
                    <span className={styles.name}>{name(item.nameAr, item.nameEn)}</span>
                    {!item.available && <span className={styles.status}>{t("place.unavailable")}</span>}
                  </span>
                  <span className={styles.price}>{formatMenuPrice(item.price, locale)}</span>
                </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
