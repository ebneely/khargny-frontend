'use client';
// A sheet address landed on directly (a collection, a listing, a host). Desktop: the page. Phone: as the prototype,
// the screen it belongs to with the sheet over it. The server renders the page, so search engines get the full content.
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useK } from './KProvider';

const watchWidth = (f: () => void) => { const mq = matchMedia('(min-width:1024px)'); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); };
export function SheetRoot({ page, base }: { page: ReactNode; base: ReactNode }) {
  const phone = useSyncExternalStore(watchWidth, () => !matchMedia('(min-width:1024px)').matches, () => false);
  return phone ? <Landed base={base} /> : <>{page}</>;
}
function Landed({ base }: { base: ReactNode }) {
  const { openLanded } = useK();
  useEffect(() => { openLanded(location.pathname); }, [openLanded]);
  return <>{base}</>;
}
