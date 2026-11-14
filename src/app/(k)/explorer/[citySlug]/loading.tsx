import { PlaceLoading } from '@/components/k/placeview';

// A place on its way (desktop, and a full load): its skeleton, shown after 150 ms (web.css .sk), so the old page never just freezes.
export default function PlaceRouteLoading() {
  return <PlaceLoading />;
}
