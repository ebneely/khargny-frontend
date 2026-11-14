import { SITE_URL } from "./config";
import type { Locale } from "@/i18n/dictionaries";
import { pathIn } from "@5argny/core/rules/locale";

/** The absolute address of a page in a language: plain for English, under /ar for Arabic. */
export const urlFor = (path: string, locale: Locale): string => `${SITE_URL}${pathIn(path, locale)}`;
