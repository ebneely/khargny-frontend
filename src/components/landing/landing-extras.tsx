import Link from 'next/link';
import { langPrefix } from '@5argny/core/rules/locale';
import {
  landingFaq,
  type LandingFacts,
} from '@/lib/landing';
import type { Locale } from '@/i18n/dictionaries';

/**
 * The parts below the list on every landing page: the links that narrow the page, and the FAQ
 * built from the same numbers. Server-rendered and dependency-free (no client JavaScript), so
 * both a visitor and a crawler read the same text.
 */
export function LandingExtras({
  facts,
  locale,
  className = 'mt-12',
}: {
  facts: LandingFacts;
  locale: Locale;
  className?: string;
}) {
  const ar = locale === 'ar';
  const prefix = langPrefix(locale);
  const href = (path: string) => `${prefix}${path}/`;
  const citySlug = facts.city?.slug ?? '';
  const faq = landingFaq(facts, locale);
  // Only a link whose target page exists: the same thin-content guard (>= 5 places) the API
  // applies, checked here because every chip count is the count of that target's own scope.
  const linked = <T extends { count: number }>(rows: T[]) => rows.filter((row) => row.count >= 5);
  const areas = linked(facts.topAreas).filter((area) => area.areaKey !== facts.area?.slug);
  const categories = linked(facts.topCategories).filter((item) => item.slug !== facts.category?.slug);

  return (
    <>
      {(areas.length > 0 || categories.length > 0) && (
        <section aria-labelledby="landing-links-heading" className={`${className} border-t border-border pt-8`}>
          <h2 id="landing-links-heading" className="text-lg font-semibold text-foreground">
            {ar ? 'ضيّق البحث' : 'Go narrower'}
          </h2>
          {areas.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground">{ar ? 'بالمنطقة' : 'By area'}</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {areas.map((area) => (
                  <li key={area.areaKey}>
                    <Link
                      href={href(
                        facts.category
                          ? `/explorer/${citySlug}/area/${area.areaKey}/category/${facts.category.slug}`
                          : `/explorer/${citySlug}/area/${area.areaKey}`,
                      )}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm hover:border-foreground"
                    >
                      <span>{ar ? area.nameAr : area.nameEn}</span>
                      <span className="text-muted-foreground">{area.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {categories.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground">{ar ? 'بالتصنيف' : 'By category'}</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {categories.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={href(
                        facts.area
                          ? `/explorer/${citySlug}/area/${facts.area.slug}/category/${item.slug}`
                          : citySlug
                            ? `/explorer/${citySlug}/category/${item.slug}`
                            : `/category/${item.slug}`,
                      )}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm hover:border-foreground"
                    >
                      <span>{ar ? item.nameAr : item.nameEn || item.nameAr}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="landing-faq-heading" className="mt-12 border-t border-border pt-8">
        <h2 id="landing-faq-heading" className="text-lg font-semibold text-foreground">
          {ar ? 'أسئلة بتتكرر' : 'Common questions'}
        </h2>
        <dl className="mt-4 max-w-3xl divide-y divide-border border-y border-border">
          {faq.map((item) => (
            <div key={item.question} className="py-4">
              <dt className="font-medium text-foreground">{item.question}</dt>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

/** The footer's city links: real anchors to the biggest city landing pages. */
export function CityLandingLinks({
  links,
  locale,
  className = '',
}: {
  links: { href: string; label: string; count: number }[];
  locale: Locale;
  className?: string;
}) {
  if (!links.length) return null;
  const ar = locale === 'ar';
  const prefix = langPrefix(locale);
  return (
    <footer className={`${className} mt-12 border-t border-border pt-8`}>
      <h2 className="text-sm font-medium text-muted-foreground">{ar ? 'صفحات المدن' : 'City pages'}</h2>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {links.map((city) => (
          <li key={city.href}>
            <Link href={`${prefix}${city.href}/`} className="hover:underline">
              {city.label}
              <span className="ms-2 text-muted-foreground">{city.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  );
}
