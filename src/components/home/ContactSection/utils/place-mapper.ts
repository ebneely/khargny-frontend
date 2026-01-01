/* eslint-disable @typescript-eslint/no-explicit-any */
import { Outing } from "@/types";

/**
 * Maps Google Places API response to the Outing type for compatibility with components
 */
export function mapPlaceDetailsToOuting(placeDetails: any): Outing {
  // Ensure placeDetails exists
  if (!placeDetails) {
    console.error("placeDetails is undefined or null");
    return createDefaultOuting();
  }

  // Extract images from photos array - backend now provides full photo URLs
  const images =
    placeDetails?.photos
      ?.map((photo: any) => {
        // Backend provides photo_url with API key already included
        if (photo?.photo_url) {
          return photo.photo_url;
        }
        // Fallback to constructing URL if photo_url not provided (shouldn't happen with new backend)
        if (photo?.photo_reference) {
          return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=`;
        }
        return null;
      })
      .filter(Boolean) || [];

  // Get primary image or fallback
  const primaryImage =
    images[0] ||
    "https://img.heroui.chat/image/places?w=800&h=600&u=restaurant-default";

  // Map types to the structure expected by components
  const mappedTypes =
    placeDetails.types?.map((type: string) => {
      let icon = "";

      // Map common types to icons
      switch (type) {
        case "cafe":
          icon = "lucide:coffee";
          break;
        case "restaurant":
          icon = "lucide:utensils";
          break;
        case "food":
          icon = "lucide:pizza";
          break;
        case "store":
          icon = "lucide:shopping-bag";
          break;
        case "point_of_interest":
          icon = "lucide:map-pin";
          break;
        case "establishment":
          icon = "lucide:building";
          break;
        default:
          icon = "lucide:tag";
      }

      // Format type name for display (convert snake_case to Title Case)
      const formattedName = type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return {
        name: formattedName,
        icon,
      };
    }) || [];

  // Map reviews to expected structure
  const mappedReviews =
    placeDetails.reviews?.map((review: any) => ({
      author: review.author_name || "Anonymous",
      rating: review.rating || 0,
      text: review.text || "",
      time:
        review.relative_time_description ||
        new Date(review.time * 1000).toLocaleDateString(),
      profilePhoto:
        review.profile_photo_url ||
        "https://img.heroui.chat/image/avatar?w=100&h=100&u=reviewer",
    })) || [];

  // Extract location parts
  const addressParts = (
    placeDetails.vicinity ||
    placeDetails.formatted_address ||
    ""
  )
    .split(",")
    .map((part: string) => part.trim());

  const location = addressParts.pop() || "Alexandria";
  const area = addressParts.pop() || "Al Mesa";

  // Format periods data for hours tab
  const periods = placeDetails.opening_hours?.periods?.map((period: any) => ({
    open: {
      date: getDayName(period.open?.day),
      time: formatTime(period.open?.time),
    },
    close: {
      date: getDayName(period.close?.day),
      time: formatTime(period.close?.time),
    },
  }));

  // Map price level to EGP
  const priceMap: Record<number, number> = {
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  };
  const price = priceMap[placeDetails.price_level || 2];

  // Create description from available data
  let description = "";
  if (placeDetails.editorial_summary?.overview) {
    description = placeDetails.editorial_summary.overview;
  } else if (mappedReviews.length > 0) {
    // Use first review as description if available
    description =
      mappedReviews[0].text.slice(0, 150) +
      (mappedReviews[0].text.length > 150 ? "..." : "");
  } else {
    // Create generic description based on place type and features
    const placeType =
      placeDetails.types?.[0] === "cafe"
        ? "café"
        : placeDetails.types?.[0] === "restaurant"
          ? "restaurant"
          : "place";

    const features = [];
    if (placeDetails.serves_breakfast) features.push("breakfast");
    if (placeDetails.serves_lunch) features.push("lunch");
    if (placeDetails.serves_dinner) features.push("dinner");
    if (placeDetails.serves_brunch) features.push("brunch");

    const featuresText =
      features.length > 0 ? `serving ${features.join(", ")}` : "";

    const ratingText = placeDetails.rating
      ? `with a ${placeDetails.rating}/5 rating`
      : "";

    description =
      `A popular ${placeType} in ${area} ${featuresText} ${ratingText}.`.trim();
  }

  return {
    title: placeDetails.name || "Place",
    image: primaryImage,
    images: images,
    rating: placeDetails.rating || 0,
    reviewCount: placeDetails.user_ratings_total || 0,
    user_ratings_total: placeDetails.user_ratings_total || 0,
    price: price.toString(),
    price_level: placeDetails.price_level || 0,
    area,
    location,
    category: mappedTypes[0]?.name || "Place",
    description,
    open_now:
      placeDetails.opening_hours?.open_now ||
      placeDetails.current_opening_hours?.open_now ||
      false,
    vicinity: placeDetails.vicinity || placeDetails.formatted_address,
    address: placeDetails.formatted_address || placeDetails.vicinity,
    types: mappedTypes,
    mapLink: placeDetails.url || "",
    periods,
    weekday_text:
      placeDetails.opening_hours?.weekday_text ||
      placeDetails.current_opening_hours?.weekday_text ||
      [],
    formatted_phone_number: placeDetails.formatted_phone_number || "",
    international_phone_number: placeDetails.international_phone_number || "",
    website: placeDetails.website || "",
    url: placeDetails.url || "",
    wheelchair_accessible_entrance:
      placeDetails.wheelchair_accessible_entrance || false,
    delivery: placeDetails.delivery || false,
    dine_in: placeDetails.dine_in || false,
    takeout: placeDetails.takeout || false,
    curbside_pickup: placeDetails.curbside_pickup || false,
    reviews: mappedReviews,
    placeId: placeDetails.placeId,
  };
}

// Helper to convert day number to name
function getDayName(day: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[day] || "";
}

// Helper to format 24h time to 12h format
function formatTime(time: string): string {
  if (!time || time.length !== 4) return "";

  const hours = parseInt(time.slice(0, 2));
  const minutes = time.slice(2);

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes} ${period}`;
}

// Helper function to create a default outing when input data is invalid
function createDefaultOuting(): Outing {
  return {
    title: "Unknown Place",
    image:
      "https://img.heroui.chat/image/places?w=800&h=600&u=restaurant-default",
    images: [],
    rating: 0,
    reviewCount: 0,
    user_ratings_total: 0,
    price: "0",
    price_level: 0,
    area: "Unknown",
    location: "Unknown",
    category: "Place",
    description: "No details available for this place.",
    open_now: false,
    vicinity: "",
    address: "",
    types: [],
    mapLink: "",
    periods: [],
    weekday_text: [],
    reviews: [],
  };
}
