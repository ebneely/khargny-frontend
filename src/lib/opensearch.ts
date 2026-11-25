import type { Locale } from '@/i18n/dictionaries';

/**
 * OpenSearch description (SEO-DIRECTION 4.5 item 3): the file a browser reads so its address bar can offer
 * "search 5argny". The template goes straight to the search page, in the reader's language, and carries no tracking
 * parameter: the term the person typed is the only thing in the URL.
 */
export function opensearchDescription(locale: Locale, siteUrl: string): string {
  const isAr = locale === 'ar';
  const base = siteUrl.replace(/\/$/, '');
  const prefix = isAr ? '/ar' : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${isAr ? 'خرجني' : '5argny'}</ShortName>
  <LongName>${isAr ? 'خرجني — اكتشف أماكن الخروج في مصر' : '5argny — places to go out in Egypt'}</LongName>
  <Description>${isAr ? 'دوّر على مطاعم وكافيهات وشواطئ وفنادق ومعالم في مصر.' : 'Search restaurants, cafes, beaches, hotels and landmarks across Egypt.'}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Language>${isAr ? 'ar' : 'en'}</Language>
  <Url type="text/html" method="get" template="${base}${prefix}/explorer/?q={searchTerms}" />
</OpenSearchDescription>
`;
}

/** The <link rel="search"> every page carries, so the browser finds the description file. */
export const opensearchLink = (locale: Locale) => ({
  rel: 'search',
  type: 'application/opensearchdescription+xml',
  title: locale === 'ar' ? 'خرجني' : '5argny',
  href: locale === 'ar' ? '/ar/opensearch.xml' : '/opensearch.xml',
});
