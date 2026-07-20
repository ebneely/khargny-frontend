import * as React from "react";
import * as Lucide from "lucide-react";

/**
 * Renders an icon by the lucide NAME an admin picked in the dashboard.
 *
 * Lucide is the single icon library across all three surfaces — lucide-react here and in the
 * dashboard, lucide-react-native in the Expo app. Same names, same glyphs, all bundled at
 * build time, nothing fetched at runtime. So the icon on a category chip here is the same
 * drawing the app shows for that category.
 *
 * This used to be a hand-written map of 14 names (category-icon.tsx). Anything outside that
 * list — every amenity icon, and any category icon added to the dashboard catalog later —
 * silently fell back to a generic pin. Names are now resolved directly against lucide's
 * exports, so the catalog in khargny-dashboard/lib/icon-catalog.ts can grow without needing
 * a matching edit here.
 */

type IconProps = { size?: number; className?: string; "aria-hidden"?: boolean };

/** "shopping-bag" → ShoppingBag. Lucide exports PascalCase. */
function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function lucideByName(
  name: string | undefined | null,
): React.ComponentType<IconProps> | null {
  if (!name) return null;
  const Comp = (Lucide as unknown as Record<string, unknown>)[toPascalCase(name.trim())];
  // Lucide icons are forwardRef OBJECTS, not plain functions. Checking for 'function' here
  // rejected every icon and rendered the entire catalog as the MapPin fallback.
  const renderable =
    typeof Comp === "function" ||
    (typeof Comp === "object" && Comp !== null && "$$typeof" in Comp);
  return renderable ? (Comp as React.ComponentType<IconProps>) : null;
}

/**
 * Render any catalog icon. Falls back to a map pin so an unknown or legacy name degrades to
 * a sensible glyph instead of a blank space or a crash.
 */
export function icon(name: string | undefined | null, size = 22) {
  const C = lucideByName(name) ?? Lucide.MapPin;
  return <C size={size} aria-hidden={true} />;
}

/** Back-compat alias — category chips called this before amenities needed icons too. */
export const catIcon = icon;
