import type { Locale } from '@/i18n/dictionaries';
import type { PlaceSeoFacts } from '@/lib/place-seo';
import { aboutParagraph, otherNameLine, placeQuestions } from '@/lib/place-seo';

/**
 * The place page's own text, server-rendered under the place itself (SEO-DIRECTION 4.2): an About
 * paragraph built from the record, the places next to it, and the questions the record answers.
 *
 * It sits in the route's layout because the page body is a client component; everything here is
 * plain HTML a crawler reads before any JavaScript runs. Same visual language as the rest of the
 * page (.group card, .t-head, .t-small), no new design.
 */

export type NearbyPlace = {
  slug: string;
  name: string;
  categoryName: string | null;
  areaName: string | null;
  citySlug: string;
  href: string;
};

export type NearbyGroup = { title: string; places: NearbyPlace[] };

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="khg-place-seo" style={{ padding: '0 clamp(16px, 4vw, 32px) 20px' }}>
      {children}
    </section>
  );
}

function Card({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="group" style={{ margin: 0, padding: 16 }}>
      {children}
    </div>
  );
}

/** One list of real links: the place's name, what it is, and the area it is in. */
function NearbyList({ group, locale }: { group: NearbyGroup; locale: Locale }) {
  return (
    <>
      <h2 className="t-head" style={{ marginBottom: 6 }}>{group.title}</h2>
      <ul style={{ display: 'grid', gap: 2, margin: '0 0 14px', padding: 0, listStyle: 'none' }}>
        {group.places.map((place) => (
          <li key={place.href}>
            <a
              href={place.href}
              style={{
                display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap',
                minHeight: 32, padding: '5px 0', color: 'var(--ink)', textDecoration: 'none',
              }}
            >
              <span style={{ font: '650 13.5px/1.35 var(--text)' }}>{place.name}</span>
              <span className="t-micro" style={{ color: 'var(--ink3)' }}>
                {[place.categoryName, place.areaName].filter(Boolean).join(locale === 'ar' ? '، ' : ', ')}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PlaceSeoSections({
  facts,
  locale,
  nearby,
  menu,
}: {
  facts: PlaceSeoFacts;
  locale: Locale;
  nearby: NearbyGroup[];
  /** The stored menu, when the place has one; rendered here so `menu` in the schema points at real items. */
  menu?: { heading: string; items: { name: string; price: string }[] } | null;
}) {
  const ar = locale === 'ar';
  const about = aboutParagraph(facts, locale);
  const otherName = otherNameLine(facts, locale);
  const questions = placeQuestions(facts, locale);
  const groups = nearby.filter((group) => group.places.length > 0);

  return (
    <>
      <Section>
        <Card>
          <h2 className="t-head" style={{ marginBottom: 8 }}>{about.heading}</h2>
          <p className="t-body" style={{ color: 'var(--ink2)', lineHeight: 1.7 }}>{about.text}</p>
          {otherName ? <p className="t-small" style={{ marginTop: 8, color: 'var(--ink3)' }} dir="auto">{otherName}</p> : null}
          {menu && menu.items.length ? (
            <div id="menu" style={{ marginTop: 14 }}>
              <h3 className="t-head" style={{ marginBottom: 6 }}>{menu.heading}</h3>
              <ul style={{ display: 'grid', gap: 4, margin: 0, padding: 0, listStyle: 'none' }}>
                {menu.items.map((item) => (
                  <li key={item.name} style={{ display: 'flex', gap: 8, minHeight: 26, alignItems: 'baseline' }}>
                    <span className="grow" style={{ font: '500 13.5px/1.4 var(--text)' }}>{item.name}</span>
                    <span className="t-small" style={{ color: 'var(--ink2)' }}>{item.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </Section>

      {groups.length ? (
        <Section>
          <Card>
            <h2 className="t-head" style={{ marginBottom: 10 }}>{ar ? 'أماكن قريبة' : 'Nearby places'}</h2>
            {groups.map((group) => <NearbyList key={group.title} group={group} locale={locale} />)}
            <p className="t-micro" style={{ margin: 0 }}>
              <a href={ar ? '/ar/explorer/' : '/explorer/'} style={{ color: 'var(--accent)' }}>
                {ar ? 'استكشف كل الأماكن' : 'Explore every place'}
              </a>
            </p>
          </Card>
        </Section>
      ) : null}

      {questions.length ? (
        <Section>
          <Card>
            <h2 className="t-head" style={{ marginBottom: 10 }}>{ar ? 'أسئلة شائعة' : 'Common questions'}</h2>
            <dl style={{ margin: 0 }}>
              {questions.map((item) => (
                <div key={item.question} style={{ marginBottom: 10 }}>
                  <dt style={{ font: '650 13.5px/1.4 var(--text)', marginBottom: 2 }}>{item.question}</dt>
                  <dd className="t-body" style={{ margin: 0, color: 'var(--ink2)', lineHeight: 1.6 }}>{item.answer}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </Section>
      ) : null}
    </>
  );
}
