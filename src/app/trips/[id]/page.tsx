import type { Metadata } from 'next';
import { getApiBaseUrl } from '@/lib/config';
import { currentLocale, pageMetadata } from '@/lib/seo';
import type { Trip } from '@/lib/trips/api';
import { TripClient } from './TripClient';

async function readTrip(id: string): Promise<Trip | null> {
  try {
    const res = await fetch(`${getApiBaseUrl({ browser: false })}/v1/tourism/trips/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? ((await res.json()).data as Trip) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [locale, trip] = await Promise.all([currentLocale(), readTrip(id)]);
  const path = `/trips/${encodeURIComponent(id)}`;
  if (!trip)
    return pageMetadata({ path, locale, title: locale === 'ar' ? 'رحلة' : 'Trip', description: '', noindex: true });
  const title = locale === 'en' && trip.titleEn ? trip.titleEn : trip.title;
  const description = (trip.description ?? '').slice(0, 160) || `${trip.destination} · ${trip.agency.name}`;
  return pageMetadata({ path, locale, title, description });
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripClient id={id} />;
}
