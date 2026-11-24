import type { MetadataRoute } from 'next';

function xmlText(value: unknown): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function iso(value: string | Date): string {
  return typeof value === 'string' ? value : value.toISOString();
}

export function sitemapXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries.map((entry) => {
    const fields = [`<loc>${xmlText(entry.url)}</loc>`];
    for (const [language, href] of Object.entries(entry.alternates?.languages ?? {})) {
      fields.push(`<xhtml:link rel="alternate" hreflang="${xmlText(language)}" href="${xmlText(href)}" />`);
    }
    if (entry.lastModified) fields.push(`<lastmod>${xmlText(iso(entry.lastModified))}</lastmod>`);
    if (entry.changeFrequency) fields.push(`<changefreq>${xmlText(entry.changeFrequency)}</changefreq>`);
    if (entry.priority !== undefined) fields.push(`<priority>${xmlText(entry.priority)}</priority>`);
    return `<url>\n${fields.join('\n')}\n</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

export type SitemapIndexEntry = { loc: string; lastModified?: string | Date };

/** /sitemap.xml itself: a list of the split sitemaps, never a list of pages. */
export function sitemapIndexXml(entries: SitemapIndexEntry[]): string {
  const maps = entries.map((entry) => {
    const fields = [`<loc>${xmlText(entry.loc)}</loc>`];
    if (entry.lastModified) fields.push(`<lastmod>${xmlText(iso(entry.lastModified))}</lastmod>`);
    return `<sitemap>\n${fields.join('\n')}\n</sitemap>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps.join('\n')}\n</sitemapindex>\n`;
}

export type ImageSitemapEntry = {
  url: string;
  lastModified?: string | Date;
  images: { loc: string; title?: string; caption?: string }[];
};

/** /sitemaps/images.xml: the page URL plus the place photos Google may show in results. */
export function imageSitemapXml(entries: ImageSitemapEntry[]): string {
  const urls = entries.map((entry) => {
    const fields = [`<loc>${xmlText(entry.url)}</loc>`];
    if (entry.lastModified) fields.push(`<lastmod>${xmlText(iso(entry.lastModified))}</lastmod>`);
    for (const image of entry.images) {
      const parts = [`<image:loc>${xmlText(image.loc)}</image:loc>`];
      if (image.title) parts.push(`<image:title>${xmlText(image.title)}</image:title>`);
      if (image.caption) parts.push(`<image:caption>${xmlText(image.caption)}</image:caption>`);
      fields.push(`<image:image>\n${parts.join('\n')}\n</image:image>`);
    }
    return `<url>\n${fields.join('\n')}\n</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robotsText(data: MetadataRoute.Robots): string {
  const lines: string[] = [];
  const rules = Array.isArray(data.rules) ? data.rules : [data.rules];
  for (const rule of rules) {
    for (const agent of [rule.userAgent ?? '*'].flat()) lines.push(`User-Agent: ${agent}`);
    for (const allow of [rule.allow ?? []].flat()) lines.push(`Allow: ${allow}`);
    for (const disallow of [rule.disallow ?? []].flat()) lines.push(`Disallow: ${disallow}`);
    if (rule.crawlDelay !== undefined) lines.push(`Crawl-delay: ${rule.crawlDelay}`);
    lines.push('');
  }
  if (data.host) lines.push(`Host: ${data.host}`);
  for (const url of [data.sitemap ?? []].flat()) lines.push(`Sitemap: ${url}`);
  return `${lines.join('\n').trimEnd()}\n`;
}
