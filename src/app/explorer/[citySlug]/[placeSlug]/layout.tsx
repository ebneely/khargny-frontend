import type { Metadata } from "next";
import { API_BASE_URL, SITE_URL } from "@/lib/config";

// Server component wrapper for the (client) place detail page. Its whole job is per-place SEO:
// fetch the place server-side and emit a real title/description + Open Graph so a shared
// 5argny.com/explorer/{city}/{place} link previews with the place's own name, and search engines
// index each place. The client page below renders the interactive UI.
type Params = { citySlug: string; placeSlug: string };

async function fetchPlace(slug: string): Promise<Record<string, unknown> | null> {
  if (!API_BASE_URL) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/places/${slug}`, {
      // revalidate hourly — place detail changes rarely, and this keeps the OG fresh.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { citySlug, placeSlug } = await params;
  const place = await fetchPlace(placeSlug);
  const path = `/explorer/${citySlug}/${placeSlug}`;

  if (!place) {
    return { title: "Place", alternates: { canonical: path } };
  }

  const name = (place.name as string) || (place.nameEn as string) || "Place";
  const desc =
    (place.description as string) ||
    (place.descriptionEn as string) ||
    `${name} — discover it on Khargny, curated outings across Egypt.`;
  const img =
    (Array.isArray(place.images) && (place.images[0] as { url?: string })?.url) ||
    "/images/logo-en.png";

  return {
    title: name,
    description: desc.slice(0, 200),
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: `${name} · Khargny`,
      description: desc.slice(0, 200),
      url: `${SITE_URL}${path}`,
      images: [{ url: img, alt: name }],
      locale: "ar_EG",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} · Khargny`,
      description: desc.slice(0, 200),
      images: [img],
    },
  };
}

export default function PlaceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
