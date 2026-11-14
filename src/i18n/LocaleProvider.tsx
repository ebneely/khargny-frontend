"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  dictionaries,
  DEFAULT_LOCALE,
  LOCALE_DIR,
  type Dictionary,
  type Locale,
} from "./dictionaries";
import { bare, langPrefix } from "@5argny/core/rules/locale";

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
   * The locale the SERVER already rendered with, read from the URL in the root layout. Seeding state with it means
   * the first client render matches the server, and <html lang/dir> is already correct.
   */
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  React.useEffect(() => {
    const el = document.documentElement;
    el.lang = locale;
    el.dir = LOCALE_DIR[locale];
  }, [locale]);

  const router = useRouter();

  const setLocale = React.useCallback(
    (l: Locale) => {
      setLocaleState(l);
      // The language is the URL (plain = English, /ar = Arabic), so switching it is a navigation. Read the path off
      // `window.location` rather than `usePathname()`: the /ar segment is consumed by a middleware rewrite, so the
      // hook can report the stripped path while the address bar still shows the prefix.
      const { pathname, search, hash } = window.location;
      router.push(`${langPrefix(l)}${bare(pathname)}${search}${hash}`);
    },
    [router],
  );

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
