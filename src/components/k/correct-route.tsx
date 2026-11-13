'use client';
import { useKPlace } from './placeview';
import { CorrectionPage } from './settings';
import { Shell } from './Shell';

export function CorrectionRoute({ slug }: { slug: string }) {
  const p = useKPlace(slug);
  return p ? <CorrectionPage p={p} /> : <Shell cur="explore" wide noLoc>{null}</Shell>;
}
