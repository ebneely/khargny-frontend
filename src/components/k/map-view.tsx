'use client';
// The Map view of Explore and Near you, and the map on a place page (see gl-map.tsx). Explore imports this module through
// next/dynamic, so maplibre-gl is fetched the first time a map is actually shown and never rides on a first page load.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { placeHref, toK, type KPlace } from './data';
import { L } from './icons';
import { useK, haptic } from './KProvider';
import { usePosition, posAccuracy, askPosition, nearParam, KmAway, ApproxNote } from './near';
import { NearbyMap, type MapPin } from './gl-map';
import { haversineKm } from '@5argny/core/rules';

/** The nearest 50 places to a point (the same /v1/places?near=&sort=distance call the lists use). */
async function fetchNear(near: string): Promise<unknown[]> {
  const raw = await apiRequest<unknown>('GET', '/v1/places', { params: { near, sort: 'distance', limit: 50 } });
  return normalizePlaceList(raw).items;
}

/**
 * The nearby map: pins for the places nearest the map's centre, the person's own position as a blue dot, a tap on a pin
 * opens the place's card, and panning or zooming re-asks by the new centre (debounced 400 ms). A tap on a pin is the
 * only animation: none.
 */
export function MapView() {
  const { c, lang } = useK();
  const pos = usePosition();
  const [centre, setCentre] = useState<{ lat: number; lng: number } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  // opening the map is the person's own choice, so this is where the position is asked for (never on load)
  const asked = useRef(false);
  useEffect(() => {
    if (pos || asked.current) return;
    asked.current = true;
    void askPosition().then((ok) => { if (!ok) setCentre({ lat: 30.0444, lng: 31.2357 }); });
  }, [pos]);
  const near = centre ? `${centre.lat.toFixed(3)},${centre.lng.toFixed(3)}` : nearParam(pos);
  const q = useQuery({
    queryKey: ['map', 'places', near ?? ''], enabled: !!near, staleTime: 60_000,
    queryFn: () => fetchNear(near!), placeholderData: (prev) => prev, // panning keeps the old pins until the new ones land
  });
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const places = useMemo(() => (q.data ?? []).map((r) => toK(r as never, { cities, categories }, lang)), [q.data, cities, categories, lang]);
  const pins: MapPin[] = useMemo(() => places.filter((p) => p.lat != null && p.lng != null).map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, name: p.name })), [places]);
  const here = pos ? { lat: pos.lat, lng: pos.lng } : null;
  // one centre handoff per rest: the map says where it stopped, the list follows 400 ms later
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMove = useCallback((p: { lat: number; lng: number }) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCentre(p), 400);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const card: KPlace | undefined = places.find((p) => p.id === picked);
  return (
    <div className="map-view">
      <NearbyMap pins={pins} here={here} accuracy={posAccuracy(pos)} picked={picked} lang={lang} onMove={onMove}
        onPick={(id) => { haptic(); setPicked(id); }} />
      {q.isError ? <div className="map-fail" role="alert"><L n="map-pin-off" /><span className="grow">{c.common.failed}</span><button className="btn secondary press" onClick={() => void q.refetch()}>{c.states.retry}</button></div> : null}
      <ApproxNote className="map-note" />
      {card ? (
        <div className="map-card card">
          <Link className="map-card-main press" href={placeHref(card, lang)}>
            {card.photos[0] ? <img decoding="async" src={card.photos[0].s} alt="" /> : <span className="map-card-img" />}
            <span className="grow"><b dir="auto">{card.name}</b><span className="t-small">{card.area || card.city}</span>{/* the list's distanceKm is measured from the map's centre once it is panned: the card measures from the person, or shows none */}{here && card.lat != null && card.lng != null ? <KmAway p={{ ...card, distanceKm: haversineKm(here, { lat: card.lat, lng: card.lng }) }} /> : null}</span>
            <L n="chevron-right" />
          </Link>
          <button className="icon-btn press" aria-label={c.common.close} data-act="map-card-close" onClick={() => setPicked(null)}><L n="x" /></button>
        </div>
      ) : null}
    </div>
  );
}
