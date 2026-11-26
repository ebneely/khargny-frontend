'use client';
// The map, free and keyless (owner 2026-11-26): MapLibre GL with OpenFreeMap's Liberty vector tiles, no Google key and no
// billing. This module is only ever loaded through next/dynamic (see explore.tsx and placeview.tsx) and maplibre-gl itself
// is imported here inside an effect, so neither the first page load nor a place page's HTML budget carries it.
//
// Nothing bounces or wobbles (apple-design): pins are drawn once, no entrance animation.
import { useEffect, useRef, useState } from 'react';
import type { Map as MlMap, Marker as MlMarker } from 'maplibre-gl';

/** OpenFreeMap's Liberty style: vector tiles, sprites and fonts, all from one keyless origin. */
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
/** Arabic labels are shaped by MapLibre's RTL plugin, vendored under public/ so the CSP keeps script-src 'self'. */
const RTL_PLUGIN = '/maplibre/rtl-text.js';
/** MapLibre finds its worker next to its own script, which inside a Next chunk is the wrong place: it is served from
 *  public/ instead (a copy of the installed package's file; map-worker.test.ts fails when the versions drift). */
export const WORKER_URL = '/maplibre/maplibre-gl-worker.mjs';
/** MapLibre accepts the RTL plugin once per page; a second call rejects, so every map asks only while it is unset. */
function shapeArabic(maplibre: typeof import('maplibre-gl')) {
  if (maplibre.getRTLTextPluginStatus() === 'unavailable') void maplibre.setRTLTextPlugin(RTL_PLUGIN, true).catch(() => undefined);
}
/** Cairo, for the first frame before anyone's position is known. */
const EGYPT = { lat: 30.0444, lng: 31.2357 };

export type MapPin = { id: string; lat: number; lng: number; name: string };
export type LatLng = { lat: number; lng: number };

/** A circle of `metres` around a point, as a GeoJSON polygon (it keeps its size on the ground at every zoom). */
function circle({ lat, lng }: LatLng, metres: number) {
  const n = 64, r = 6371000, d = metres / r, points: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const b = (i / n) * 2 * Math.PI, la = (lat * Math.PI) / 180, lo = (lng * Math.PI) / 180;
    const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
    const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
    points.push([(lo2 * 180) / Math.PI, (la2 * 180) / Math.PI]);
  }
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [points] } };
}

/** Arabic pages read `name:ar` where the tiles carry it (OpenFreeMap ships every name:* field), Latin pages keep the
 *  style's own choice. */
function arabicLabels(map: MlMap) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol' || !map.getLayoutProperty(layer.id, 'text-field')) continue;
    map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:ar'], ['get', 'name:en'], ['get', 'name']]);
  }
}

/** The pin element: a single dot, no animation, the picked one larger. */
function pinElement(name: string, picked: boolean) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `map-pin press${picked ? ' on' : ''}`;
  el.setAttribute('aria-label', name);
  el.innerHTML = '<i></i>';
  return el;
}

/**
 * The nearby map: the places of the current list (at most 50 pins), the person as a blue dot with an accuracy circle,
 * a tap on a pin picks it, and panning or zooming hands the new centre to `onMove` (the caller re-asks with near=,
 * debounced 400 ms).
 */
export function NearbyMap({ pins, here, accuracy, picked, onPick, onMove, lang }: {
  pins: MapPin[]; here: LatLng | null; accuracy: number | null; picked: string | null;
  onPick: (id: string) => void; onMove: (centre: LatLng) => void; lang: 'en' | 'ar';
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef(new Map<string, MlMarker>());
  const dot = useRef<MlMarker | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const fits = useRef(false);

  // Create the map once it is in the document; every later change is applied by the effects below.
  useEffect(() => {
    let alive = true;
    (async () => {
      const maplibre = await import('maplibre-gl');
      if (!alive || !box.current) return;
      maplibre.setWorkerUrl(WORKER_URL);
      if (lang === 'ar') shapeArabic(maplibre);
      const m = new maplibre.Map({
        container: box.current, style: MAP_STYLE, center: [EGYPT.lng, EGYPT.lat], zoom: 11,
        attributionControl: false, // our own compact instance below, in the corner that matches the reading direction
        dragRotate: false, pitchWithRotate: false,
      });
      map.current = m;
      // the credit OpenStreetMap's ODbL requires, quietly (owner 2026-11-26, round 2): MapLibre's own compact ⓘ,
      // translucent, that opens the full credit on tap — bottom-left in English, bottom-right in Arabic
      m.addControl(new maplibre.AttributionControl({ compact: true, customAttribution: '© OpenFreeMap · © OpenStreetMap' }), lang === 'ar' ? 'bottom-right' : 'bottom-left');
      m.on('load', () => { if (lang === 'ar') arabicLabels(m); });
      m.on('moveend', () => { const c = m.getCenter(); onMoveRef.current({ lat: c.lat, lng: c.lng }); });
    })();
    return () => { alive = false; markers.current.clear(); dot.current = null; map.current?.remove(); map.current = null; };
  }, [lang]);

  // Pins: add, move and drop markers by id (no re-animation for the ones already on screen).
  useEffect(() => {
    (async () => {
      const maplibre = await import('maplibre-gl');
      const m = map.current;
      if (!m) return;
      const seen = new Set<string>();
      for (const p of pins) {
        seen.add(p.id);
        const have = markers.current.get(p.id);
        if (have) { have.setLngLat([p.lng, p.lat]); have.getElement().classList.toggle('on', p.id === picked); continue; }
        const el = pinElement(p.name, p.id === picked);
        el.addEventListener('click', (e) => { e.stopPropagation(); onPickRef.current(p.id); });
        markers.current.set(p.id, new maplibre.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(m));
      }
      for (const [id, marker] of markers.current) if (!seen.has(id)) { marker.remove(); markers.current.delete(id); }
      // the first list frames the places once; panning afterwards is the person's, never fought by a re-fit
      if (!fits.current && pins.length) {
        fits.current = true;
        const b = new maplibre.LngLatBounds();
        for (const p of pins) b.extend([p.lng, p.lat]);
        m.fitBounds(b, { padding: 48, maxZoom: 14, duration: 0 });
      }
    })();
  }, [pins, picked]);

  // The person: a blue dot and the accuracy circle the browser reported (at least 100 m, the rounding of the position).
  useEffect(() => {
    (async () => {
      const maplibre = await import('maplibre-gl');
      const m = map.current;
      if (!m || !here) return;
      if (!dot.current) {
        const el = document.createElement('div');
        el.className = 'map-me';
        el.innerHTML = '<i></i>';
        dot.current = new maplibre.Marker({ element: el }).setLngLat([here.lng, here.lat]).addTo(m);
        m.jumpTo({ center: [here.lng, here.lat] });
      } else dot.current.setLngLat([here.lng, here.lat]);
      const data = circle(here, Math.max(accuracy ?? 100, 100));
      const src = m.getSource('me') as { setData?: (d: unknown) => void } | undefined;
      if (src?.setData) src.setData(data);
      else {
        m.addSource('me', { type: 'geojson', data: data as never });
        m.addLayer({ id: 'me-fill', type: 'fill', source: 'me', paint: { 'fill-color': '#2f7cf6', 'fill-opacity': 0.12 } });
        m.addLayer({ id: 'me-line', type: 'line', source: 'me', paint: { 'line-color': '#2f7cf6', 'line-opacity': 0.35, 'line-width': 1 } });
      }
    })();
  }, [here, accuracy]);

  return (
    <div className="gl-map">
      <div ref={box} className="gl-map-canvas" role="application" aria-label={lang === 'ar' ? 'خريطة الأماكن القريبة' : 'Map of nearby places'} />
    </div>
  );
}

/**
 * A place's own map: the exact pin, still and quiet (no drag, no zoom), with "Open in Maps" beside it — Apple Maps on an
 * iPhone, Google Maps elsewhere, the geo: scheme on Android. No extra API and no key.
 */
export function PlaceMapCard({ lat, lng, name, address, lang }: { lat: number; lng: number; name: string; address: string | null; lang: 'en' | 'ar' }) {
  const box = useRef<HTMLDivElement>(null);
  // this component is only ever mounted in the browser (next/dynamic, ssr: false), so the platform is known here
  const [href] = useState(() => openMapsHref({ lat, lng }, name));
  useEffect(() => {
    let alive = true;
    let own: MlMap | null = null;
    (async () => {
      const maplibre = await import('maplibre-gl');
      if (!alive || !box.current) return;
      maplibre.setWorkerUrl(WORKER_URL);
      if (lang === 'ar') shapeArabic(maplibre);
      const m = new maplibre.Map({
        container: box.current, style: MAP_STYLE, center: [lng, lat], zoom: 15,
        attributionControl: false, interactive: false,
      });
      // the same compact ⓘ credit as the nearby map (OpenStreetMap's ODbL), opposite corner in Arabic
      m.addControl(new maplibre.AttributionControl({ compact: true, customAttribution: '© OpenFreeMap · © OpenStreetMap' }), lang === 'ar' ? 'bottom-right' : 'bottom-left');
      own = m;
      const el = document.createElement('div');
      el.className = 'map-pin big';
      el.innerHTML = '<i></i>';
      new maplibre.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(m);
      m.on('load', () => { if (lang === 'ar') arabicLabels(m); });
    })();
    return () => { alive = false; own?.remove(); };
  }, [lat, lng, lang]);
  const label = lang === 'ar' ? 'افتح في الخرايط' : 'Open in Maps';
  return (
    <section className="place-map" aria-label={address ?? name}>
      <div ref={box} className="gl-map-canvas" role="img" aria-label={name} />
      <div className="place-map-foot">
        {address ? <span className="t-small grow" dir="auto">{address}</span> : <span className="grow" />}
        <a className="btn secondary press" href={href} target="_blank" rel="noopener noreferrer" data-act="open-maps">{label}</a>
      </div>
    </section>
  );
}

/** Apple Maps on an iPhone or iPad, the geo: scheme on Android, Google Maps everywhere else. */
export function openMapsHref(p: LatLng, name: string): string {
  const at = `${p.lat},${p.lng}`;
  if (typeof navigator === 'undefined') return `https://www.google.com/maps/search/?api=1&query=${at}`;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iOS) return `https://maps.apple.com/?ll=${at}&q=${encodeURIComponent(name)}`;
  if (/Android/i.test(ua)) return `geo:${at}?q=${at}(${encodeURIComponent(name)})`;
  return `https://www.google.com/maps/search/?api=1&query=${at}`;
}
