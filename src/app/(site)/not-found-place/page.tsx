import { notFound } from 'next/navigation';

/** Internal target of the proxy's unknown-place rewrite. The not-found boundary supplies the UI. */
export default function PlaceNotFoundPage(): never {
  notFound();
}
