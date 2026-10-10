import { SITE_URL } from "./config";
import type { Locale } from "@/i18n/dictionaries";

export function urlFor(path: string, locale: Locale): string {
  const pathname = path.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, "");
  const clean = pathname ? `/${pathname}` : "";
  return `${SITE_URL}/${locale}${clean}/`;
}
