"use client";

import * as React from 'react';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { normalizeSiteSettings } from '@/lib/site-socials';

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

const SiteSettingsContext = React.createContext<SiteSettings | null>(null);

export function SiteSettingsProvider({ settings, children }: { settings: SiteSettings | null; children: React.ReactNode }) {
  return React.createElement(SiteSettingsContext.Provider, { value: settings }, children);
}

export function useSiteSettings() {
  const initialData = React.useContext(SiteSettingsContext);
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => normalizeSiteSettings(await apiRequest<SiteSettings>("GET", "/v1/site-settings")),
    initialData: initialData ?? undefined,
    staleTime: 60 * 60 * 1000,
  });
}
