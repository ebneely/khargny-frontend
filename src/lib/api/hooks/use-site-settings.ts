import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";

// GET /v1/site-settings — the brand's social links and footer contact, edited in the
// dashboard storefront tab. Public, cached; a blank field means "hide that icon".
export interface SiteSettings {
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  whatsapp: string | null;
  email: string | null;
  phone: string | null;
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: () => apiRequest<SiteSettings>("GET", "/v1/site-settings"),
    staleTime: 60 * 60 * 1000,
  });
}
