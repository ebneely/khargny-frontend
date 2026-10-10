"use client";

import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Share2 } from "lucide-react";
import { useI18n } from "@/i18n/LocaleProvider";
import { sharePlace, type ShareResult } from "@/lib/share-place";
import { motionProperties } from "@/lib/motion";
import { usePressFeedback } from "@/lib/use-press-feedback";
import { Toast } from "./Toast";
import styles from "./ShareButton.module.css";

export function ShareButton({
  name,
  category,
  area,
  href,
  placeId,
  rail = false,
  card = false,
  className = "",
}: {
  name: string;
  category?: string;
  area?: string;
  href?: string;
  placeId?: string;
  rail?: boolean;
  card?: boolean;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const feedback = usePressFeedback();
  const [pending, setPending] = useState(false);
  const [press, setPress] = useState(0);
  const [result, setResult] = useState<ShareResult | null>(null);
  return (
    <>
      <button
        {...feedback}
        type="button"
        data-share-button
        data-share-card={card || undefined}
        aria-label={t("place.shareLabel", { name })}
        aria-busy={pending || undefined}
        disabled={pending || !href}
        className={`${styles.button}${card ? ` ${styles.card}` : ""}${rail ? ` ${styles.rail}` : ""} ${className}`}
        style={motionProperties() as CSSProperties}
        onClick={async (event) => {
          feedback.onClick();
          event.preventDefault();
          event.stopPropagation();
          if (!href || pending) return;
          setPress((previous) => previous + 1);
          setPending(true);
          setResult(null);
          const outcome = await sharePlace({
            name,
            category,
            area,
            path: href,
            locale,
            placeId,
          });
          setResult(outcome);
          setPending(false);
        }}
      >
        <Share2
          key={press}
          size={20}
          aria-hidden="true"
          className={`${styles.icon}${press ? ` ${styles.press}` : ""}`}
          data-share-motion={press ? "press" : "rest"}
        />
        {rail && <span>{t("explorer.share")}</span>}
      </button>
      {(result === "copied" || result === "failed") &&
        createPortal(
          <Toast
            key={press}
            message={t(
              result === "copied" ? "common.linkCopied" : "common.shareFailed",
            )}
            tone={result === "copied" ? "success" : "error"}
            onDismiss={() => setResult(null)}
          />,
          window.document.body,
        )}
    </>
  );
}
