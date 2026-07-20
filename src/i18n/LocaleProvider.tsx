"use client";

import * as React from "react";
import {
  dictionaries,
  DEFAULT_LOCALE,
  LOCALE_DIR,
  type Dictionary,
  type Locale,
} from "./dictionaries";

const STORAGE_KEY = "khargny.locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

interface LocaleContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  // Translate a dot path, e.g. t("home.whereTo"); interpolates {vars}.
  t: (path: string, vars?: Record<string, string | number>) => string;
  dict: Dictionary;
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

function resolve(dict: Dictionary, path: string): string {
  const parts = path.split(".");
  let node: unknown = dict;
  for (const p of parts) {
    if (node && typeof node === "object" && p in (node as object)) {
      node = (node as Record<string, unknown>)[p];
    } else {
      return path; // missing key -> show the key so it's obvious in dev
    }
  }
  return typeof node === "string" ? node : path;
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  /**
   * The locale the SERVER already rendered with, read from the khargny.locale cookie in the
   * root layout. Seeding state with it means the first client render matches the server —
   * no ar→en (or en→ar) flip-flash on refresh, and <html lang/dir> is already correct.
   */
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  // Legacy migration only: a returning visitor who has localStorage but no cookie yet (the
  // cookie is new). Reconcile once so their choice sticks; the cookie is then authoritative
  // and this branch never runs again for them, so it can't cause the flash on later loads.
  React.useEffect(() => {
    if (initialLocale) return; // server already knew via cookie — nothing to reconcile
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "ar" || stored === "en") setLocaleState(stored);
  }, [initialLocale]);

  React.useEffect(() => {
    const el = document.documentElement;
    el.lang = locale;
    el.dir = LOCALE_DIR[locale];
  }, [locale]);

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage may be unavailable; the in-memory locale still applies */
    }
    // Write the cookie so the NEXT server render (a refresh, a hard nav) paints this locale
    // from the first byte. SameSite=Lax is fine — this is a display preference, not a secret.
    document.cookie = `${STORAGE_KEY}=${l}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }, []);

  const value = React.useMemo<LocaleContextValue>(() => {
    const dict = dictionaries[locale];
    return {
      locale,
      dir: LOCALE_DIR[locale],
      setLocale,
      toggleLocale: () => setLocale(locale === "ar" ? "en" : "ar"),
      dict,
      t: (path, vars) => {
        let out = resolve(dict, path);
        if (vars) {
          for (const [k, v] of Object.entries(vars)) {
            out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return out;
      },
    };
  }, [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useI18n(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useI18n must be used within a LocaleProvider");
  }
  return ctx;
}
