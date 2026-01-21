import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/apollo-client";
import { GET_DYNAMIC_CATEGORIES } from "@/graphql/queries";

interface DynamicCategory {
  key: string;
  name: string;
  icon: string;
  count: number;
  googleTypes: string[];
  priority: number;
}

interface GetDynamicCategoriesResponse {
  dynamicCategories: {
    categories: DynamicCategory[];
    totalPlaces: number;
    lastUpdated: string;
  };
}

/**
 * Hook to fetch dynamic categories for a location
 * Categories are aggregated from cached Google Places data
 * @param location - City name to filter categories by (null for all categories)
 */
export function useDynamicCategories(location: string | null) {
  return useQuery({
    queryKey: ["dynamicCategories", location],
    queryFn: async () => {
      const result = await client.query<GetDynamicCategoriesResponse>({
        query: GET_DYNAMIC_CATEGORIES,
        variables: location ? { location } : {},
        errorPolicy: "all",
      });

      return result.data?.dynamicCategories || {
        categories: [],
        totalPlaces: 0,
        lastUpdated: "",
      };
    },
    enabled: !!location, // Only fetch when location is selected
    staleTime: 1000 * 60 * 15, // 15 minutes - categories may update
    gcTime: 1000 * 60 * 60, // 1 hour cache
    retry: (failureCount, error: any) => {
      // Don't retry on network errors (backend not running)
      if (
        error?.message?.includes("Network Error") ||
        error?.message?.includes("timeout")
      ) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
}

export type { DynamicCategory };
