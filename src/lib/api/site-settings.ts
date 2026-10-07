import { API_BASE_URL } from '@/lib/config';
import { normalizeSiteSettings } from '@/lib/site-socials';

export async function getSiteSettings() {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/site-settings`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.success === true ? normalizeSiteSettings(payload.data) : null;
  } catch {
    return null;
  }
}
