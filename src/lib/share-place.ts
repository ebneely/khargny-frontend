import type { Locale } from "@/i18n/dictionaries";
import { urlFor } from "./site-url";
import { trackPlaceAction } from "./analytics/track";

type SharePlace = {
  name: string;
  category?: string;
  area?: string;
  path: string;
  locale: Locale;
  placeId?: string;
};
export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function sharePlace(place: SharePlace): Promise<ShareResult> {
  const path = place.path.replace(/^\/(?:ar|en)(?=\/|$)/, "");
  const url = urlFor(path, place.locale);
  const text = [place.name, place.category, place.area]
    .filter(Boolean)
    .join(" · ");
  let native = false;
  try {
    if (typeof navigator === "undefined") return "failed";
    let result: ShareResult;
    if (navigator.share) {
      native = true;
      await navigator.share({ title: place.name, text, url });
      result = "shared";
    } else {
      await navigator.clipboard.writeText(url);
      result = "copied";
    }
    trackPlaceAction("share", place.placeId);
    return result;
  } catch (error) {
    return native && (error as { name?: string })?.name === "AbortError"
      ? "cancelled"
      : "failed";
  }
}
