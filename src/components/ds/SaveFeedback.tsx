"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import { saveStore } from "@/lib/saves";
import { Toast } from "./Toast";

export function SaveFeedback() {
  const { t, locale } = useI18n();
  const version = useSyncExternalStore(
    saveStore.subscribe,
    saveStore.snapshot,
    () => 0,
  );
  const feedback = version ? saveStore.feedback() : null;
  if (!feedback) return null;
  const agreement =
    feedback.seconds === 0
      ? "zero"
      : new Intl.PluralRules(locale).select(feedback.seconds);
  const delay = t(`place.likeRetryDelay.${agreement}`, {
    seconds: feedback.seconds,
  });
  const key =
    feedback.kind === "rate"
      ? "place.saveRateLimit"
      : feedback.kind === "busy"
        ? "place.saveBusy"
        : "place.saveUnavailable";
  return (
    <Toast
      key={feedback.sequence}
      message={t(key, { delay })}
      tone="error"
      onDismiss={saveStore.dismiss}
    />
  );
}
