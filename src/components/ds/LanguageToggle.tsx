"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/LocaleProvider";

/**
 * Floating language switch (Arabic ⇄ English). Flips the app locale, which the
 * LocaleProvider mirrors onto <html lang/dir> for full RTL/LTR support.
 * Positioned inline-end so it follows the reading direction.
 */
export function LanguageToggle() {
  const { toggleLocale, dict } = useI18n();
  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label="Switch language"
      data-trace-id="language-toggle"
      className="fixed bottom-20 z-50 flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm shadow-md"
      style={{
        insetInlineEnd: 16,
        background: "var(--white)",
        borderColor: "var(--gray-300)",
        color: "var(--gray-900)",
      }}
    >
      <Languages size={16} aria-hidden="true" />
      <span>{dict.common.switchLang}</span>
    </button>
  );
}
