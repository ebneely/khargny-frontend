import * as React from "react";
import {
  Waves, Landmark, Trees, Mountain, Utensils, Coffee, ShoppingBag,
  Building2, Camera, Palmtree, Ship, Tent, Music, MapPin,
} from "lucide-react";

// Renders a category's icon from the lucide NAME the admin chose in the dashboard.
// Must cover every value in khargny-dashboard/lib/category-icons.ts (single source of truth).
const CAT_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  waves: Waves,
  landmark: Landmark,
  trees: Trees,
  mountain: Mountain,
  utensils: Utensils,
  coffee: Coffee,
  "shopping-bag": ShoppingBag,
  "building-2": Building2,
  camera: Camera,
  palmtree: Palmtree,
  ship: Ship,
  tent: Tent,
  music: Music,
  "map-pin": MapPin,
};

export function catIcon(name: string | undefined | null, size = 22) {
  const C = (name && CAT_ICON[name]) || MapPin;
  return <C size={size} />;
}
