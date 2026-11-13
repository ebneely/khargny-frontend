'use client';
// Saved (proto Saved()): Places, the ones this device saved; Collections, the team ones it saved and its own,
// with New collection (private until shared).
import { useSearchParams } from 'next/navigation';
import { L, Ic } from './icons';
import { Btn, Seg } from './bits';
import { useSavedPlaces } from '@/lib/api/hooks/use-saved-places';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { toK } from './data';
import { Tile } from './place';
import { Shell } from './Shell';
import { withBrand } from './home';
import { ColCard, useCollections, useGroupViews, useMine, useNewCollection, useSavedSections } from './collections';
import { HomeRail } from './settings';
import { useK } from './KProvider';

export function SavedView() {
  const { c, lang, go } = useK();
  const tab = useSearchParams().get('tab') === 'collections' ? 'collections' : 'places';
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const { data: saved = [], isLoading } = useSavedPlaces();
  const places = saved.map((s) => toK(s.place as never, { cities, categories }, lang)).filter((p) => p.photos.length);
  const { data: mine = [] } = useMine();
  const { data: sections = [] } = useSavedSections();
  const team = useCollections(sections.map((s) => s.key));
  const own = useCollections(mine.map((m) => m.slug));
  const views = useGroupViews([...team, ...own].map((x) => x.id));
  const newCol = useNewCollection();
  const body = tab === 'places'
    ? (isLoading ? null : places.length ? <div className="grid">{places.map((p) => <Tile key={p.id} p={p} />)}</div>
      : <div className="group empty"><Ic n="saved" /><p className="t-head">{c.saved.emptyTitle}</p><p className="t-small">{c.saved.emptyBody}</p><Btn label={c.common.findPlaces} kind="primary" act="go-explore" onClick={() => go(`/${lang}/explorer/`)} /></div>)
    : <>{team.length ? <><h2 className="t-head page-pad saved-sub"><L n="badge-check" /> {withBrand(c.saved.fromTeam)}</h2><div className="col-grid">{team.map((col) => <ColCard key={col.id} col={col} views={views[col.id]} />)}</div></> : null}
      <h2 className="t-head page-pad saved-sub"><L n="user" /> {c.saved.yours}</h2><div className="col-grid">{own.map((col) => <ColCard key={col.id} col={col} views={views[col.id]} />)}
        <button className="card col-new press" data-act="new-collection" onClick={() => newCol()}><L n="plus" /><b>{c.saved.newCollection}</b><span className="t-small">{c.saved.privateUntilShared}</span></button></div></>;
  return <Shell cur="saved" right={<HomeRail />}>
    <div className="page-pad" style={{ margin: '4px 0 12px' }}><h1 className="t-display" style={{ marginBottom: 10 }}>{c.nav.saved}</h1>
      <Seg opts={[['places', c.saved.places], ['collections', c.saved.collections]]} val={tab} onPick={(v) => go(`/${lang}/saved/${v === 'collections' ? '?tab=collections' : ''}`)} /></div>
    {body}
  </Shell>;
}
