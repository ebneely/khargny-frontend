'use client';
// The full-page map sheet the floating Map pill opens (owner 2026-11-26, round 2). At its top: the search field and the
// page's own location pills (City · Area · Mood, the same LocBar the top bar shows), so the sheet's choices ARE the
// page's choices — the loc store and the address — and closing it leaves the list with the same selection. Below them the
// map fills the rest. Every change re-asks the pins with the same params the Explore list uses (useListQuery + q), pages
// of 50 up to 200 pins, and fits the map to them; with nothing chosen it keeps today's behaviour: the nearest 50 to the
// map's centre, re-asked on pan. maplibre-gl rides in this module's chunk only (see gl-map.tsx), fetched on first open.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { placeHref, toK, type KPlace } from './data';
import { L } from './icons';
import { LocBar } from './Shell';
import { readF, useListQuery, useCatIds, useLocIds, type F } from './filters';
import { useK, useKS, haptic } from './KProvider';
import { usePosition, posAccuracy, askPosition, nearParam, KmAway, ApproxNote } from './near';
import { NearbyMap, type MapPin } from './gl-map';
import { haversineKm } from '@5argny/core/rules';

/** The nearest 50 places to a point (the same /v1/places?near=&sort=distance call the lists use). */
async function fetchNear(near: string): Promise<unknown[]> {
  const raw = await apiRequest<unknown>('GET', '/v1/places', { params: { near, sort: 'distance', limit: 50 } });
  return normalizePlaceList(raw).items;
}

/** One shared pin surface: the map, and the small card a pin opens (the distance from the person only, as today). */
function MapArea({ pins, places, here, accuracy, refit, onMove, error, retry }: {
  pins: MapPin[]; places: KPlace[]; here: { lat: number; lng: number } | null; accuracy: number | null;
  refit: boolean; onMove: (centre: { lat: number; lng: number }) => void; error: unknown; retry: () => void;
}) {
  const { c, lang } = useK();
  const [picked, setPicked] = useState<string | null>(null);
  const card = places.find((p) => p.id === picked);
  return (
    <div className="map-sheet-map">
      <NearbyMap pins={pins} here={here} accuracy={accuracy} picked={picked} lang={lang} onMove={onMove} refit={refit}
        onPick={(id) => { haptic(); setPicked(id); }} />
      {error ? <div className="map-fail" role="alert"><L n="map-pin-off" /><span className="grow">{c.common.failed}</span><button className="btn secondary press" onClick={retry}>{c.states.retry}</button></div> : null}
      <ApproxNote className="map-note" />
      {card ? (
        <div className="map-card card">
          <Link className="map-card-main press" href={placeHref(card, lang)}>
            {card.photos[0] ? <img decoding="async" src={card.photos[0].s} alt="" /> : <span className="map-card-img" />}
            <span className="grow"><b dir="auto">{card.name}</b><span className="t-small">{card.area || card.city}</span>
              {/* the card measures from the person, never from the map's centre (row 20, as today) */}
              {here && card.lat != null && card.lng != null ? <KmAway p={{ ...card, distanceKm: haversineKm(here, { lat: card.lat, lng: card.lng }) }} /> : null}</span>
            <L n="chevron-right" />
          </Link>
          <button className="icon-btn press" aria-label={c.common.close} data-act="map-card-close" onClick={() => setPicked(null)}><L n="x" /></button>
        </div>
      ) : null}
    </div>
  );
}

/** Nothing chosen: today's behaviour, unchanged — the nearest 50 to the map's centre, re-asked (debounced 400 ms) on pan. */
function MapNear() {
  const { lang } = useK();
  const pos = usePosition();
  const [centre, setCentre] = useState<{ lat: number; lng: number } | null>(null);
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
  // one centre handoff per rest: the map says where it stopped, the list follows 400 ms later; the fit stays one-time
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMove = useCallback((p: { lat: number; lng: number }) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCentre(p), 400);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <MapArea pins={pins} places={places} here={pos ? { lat: pos.lat, lng: pos.lng } : null} accuracy={posAccuracy(pos)}
    refit={false} onMove={onMove} error={q.isError ? q.error : null} retry={() => void q.refetch()} />;
}

/** Something chosen (city, area, mood or a search): the same places the Explore list shows, up to 200 pins, framed to fit. */
function MapChosen({ f, q: word }: { f: F; q: string }) {
  const { lang } = useK();
  const pos = usePosition();
  const L = useListQuery(f);
  const cats = useCatIds(f);
  const { cityId } = useLocIds();
  const list = useQuery({
    // pages of 50 up to 200 pins: the same params the Explore list asks (useListQuery) plus the search's q
    queryKey: ['map', 'chosen', ...L.key, word, lang] as const, enabled: L.ready && !L.none, staleTime: 60_000,
    placeholderData: (prev) => prev, // a change keeps the old pins on the map until the new answer lands
    queryFn: async () => {
      if (word) {
        // the search route, as Explore's list asks it, pages of 50 by skip
        const catIds = (f.intent || f.cat) && cats.length ? cats.map((x) => x.id).join(',') : undefined;
        const items: unknown[] = [];
        for (let skip = 0; skip < 200; skip += 50) {
          const raw = normalizePlaceList(await apiRequest<unknown>('GET', '/v1/search/places', { params: { q: word, skip, limit: 50, cityId: cityId ?? undefined, categoryIds: catIds, platform: 'web', locale: lang }, headers: { 'Accept-Language': lang } }));
          items.push(...raw.items);
          if (raw.items.length < 50) break;
        }
        return items;
      }
      // the list route, one cursor per category of the chosen mood (the route takes one categoryId), merged in order
      const cursors: Record<string, string | null> = Object.fromEntries(L.catIds.map((id) => [id ?? 'all', '']));
      const items: unknown[] = [];
      for (let round = 0; round < 4 && items.length < 200; round++) {
        const open = Object.entries(cursors).filter(([, cur]) => cur !== null);
        if (!open.length) break;
        const answers = await Promise.all(open.map(async ([id, cur]) => {
          const raw = await apiRequest<{ meta?: { nextCursor?: string | null } }>('GET', '/v1/places', { params: { ...L.params, categoryId: id === 'all' ? undefined : id, cursor: cur || undefined, limit: 50 } });
          return [id, raw.meta?.nextCursor || null, normalizePlaceList(raw).items] as const;
        }));
        for (const [id, next, page] of answers) { cursors[id] = next; items.push(...page); }
      }
      return items.slice(0, 200);
    },
  });
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const places = useMemo(() => (list.data ?? []).map((r) => toK(r as never, { cities, categories }, lang)).filter((p) => p.photos.length), [list.data, cities, categories, lang]);
  const pins: MapPin[] = useMemo(() => places.filter((p) => p.lat != null && p.lng != null).map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, name: p.name })), [places]);
  return <MapArea pins={pins} places={places} here={pos ? { lat: pos.lat, lng: pos.lng } : null} accuracy={posAccuracy(pos)}
    refit onMove={() => { /* a chosen list is never re-asked by a pan (row 20) */ }} error={list.isError ? list.error : null} retry={() => void list.refetch()} />;
}

/**
 * The map sheet's body. The search word is the sheet's own: typing filters the pins, exactly as the top search filters
 * the page; on Explore it also takes the address when the sheet closes, so the list underneath shows the same search.
 * The three pills under it are the page's own choices (the loc store and the address), stacked over this sheet.
 */
export function MapSheet() {
  const { c } = useK();
  const loc = useKS((s) => s.loc), tab = useKS((s) => s.tab);
  const sp = useSearchParams();
  const f = readF(sp);
  // the page's own search word opens the sheet already applied (?q=), so the sheet shows the pins the list shows
  const [q, setQ] = useState(() => (sp.get('q') || '').trim());
  const [word, setWord] = useState(() => (sp.get('q') || '').trim());
  // the ask follows the typing a beat later, so every keystroke does not re-ask the pins
  useEffect(() => { const t = setTimeout(() => setWord(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  // closing returns to the list with the same search too: on Explore the sheet's word takes the address when it closes
  const last = useRef(q);
  useEffect(() => { last.current = q; }, [q]);
  useEffect(() => () => {
    if (tab !== 'explore') return;
    const n = new URLSearchParams(location.search), w = last.current.trim();
    if (w) n.set('q', w); else n.delete('q');
    history.replaceState(null, '', `${location.pathname}${n.toString() ? '?' + n : ''}`);
  }, [tab]);
  const chosen = !!(loc.city || loc.area || f.intent || f.cat || word);
  return (
    <div className="map-sheet">
      <label className="search map-sheet-q"><L n="search" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={c.search.placeholder} aria-label={c.search.placeholder} autoComplete="off" enterKeyHint="search" /></label>
      <LocBar withFilters={tab === 'explore'} inMap />
      {chosen ? <MapChosen f={f} q={word} /> : <MapNear />}
    </div>
  );
}
