/**
 * The city segment used to own the city page's metadata and its CollectionPage schema. Both moved
 * into the page itself, which now states its own numbers (count, open now, areas, categories) and
 * emits the ItemList, BreadcrumbList and FAQPage built from them. This layout stays only because
 * the area and city+category landing pages sit beneath the same segment.
 */
export default function CityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
