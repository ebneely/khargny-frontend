import type { SiteSettings } from '@/lib/api/hooks/use-site-settings';

const SOCIAL_HOSTS = {
  instagram: 'instagram.com',
  facebook: 'facebook.com',
  tiktok: 'tiktok.com',
  youtube: 'youtube.com',
} as const;

export function socialUrl(value: unknown, host: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || ![host, `www.${host}`].includes(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeSiteSettings(raw: unknown): SiteSettings | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const text = (key: string) => typeof input[key] === 'string' ? input[key].trim().slice(0, 500) || null : null;
  return {
    instagram: socialUrl(input.instagram, SOCIAL_HOSTS.instagram),
    facebook: socialUrl(input.facebook, SOCIAL_HOSTS.facebook),
    tiktok: socialUrl(input.tiktok, SOCIAL_HOSTS.tiktok),
    youtube: socialUrl(input.youtube, SOCIAL_HOSTS.youtube),
    whatsapp: text('whatsapp'),
    email: text('email'),
    phone: text('phone'),
  };
}

export function siteSocialUrls(raw: unknown): string[] {
  const settings = normalizeSiteSettings(raw);
  return Object.keys(SOCIAL_HOSTS).flatMap((key) => {
    const url = settings?.[key as keyof typeof SOCIAL_HOSTS];
    return url ? [url] : [];
  });
}

export function siteContactLinks(raw: unknown) {
  const settings = normalizeSiteSettings(raw);
  let whatsapp: string | null = null;
  if (settings?.whatsapp) {
    const candidate = settings.whatsapp.startsWith('https:') ? socialUrl(settings.whatsapp, 'wa.me') : null;
    const number = candidate ? new URL(candidate).pathname.slice(1) : settings.whatsapp;
    if (/^\+?[\d\s().-]+$/.test(number)) {
      const digits = number.replace(/\D/g, '');
      if (digits.length >= 5 && digits.length <= 15) whatsapp = `https://wa.me/${digits}`;
    }
  }
  return {
    whatsapp,
    email: settings?.email && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(settings.email) ? `mailto:${settings.email}` : null,
    phone: settings?.phone && /^\+?[\d\s().-]{5,30}$/.test(settings.phone) ? `tel:${settings.phone}` : null,
  };
}
