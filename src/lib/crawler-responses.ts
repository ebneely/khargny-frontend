import type { MetadataRoute } from 'next';

function xmlText(value: unknown): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function sitemapXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries.map((entry) => {
    const fields = [`<loc>${xmlText(entry.url)}</loc>`];
    for (const [language, href] of Object.entries(entry.alternates?.languages ?? {})) {
      fields.push(`<xhtml:link rel="alternate" hreflang="${xmlText(language)}" href="${xmlText(href)}" />`);
    }
    if (entry.lastModified) {
      const date = typeof entry.lastModified === 'string' ? entry.lastModified : entry.lastModified.toISOString();
      fields.push(`<lastmod>${xmlText(date)}</lastmod>`);
    }
    if (entry.changeFrequency) fields.push(`<changefreq>${xmlText(entry.changeFrequency)}</changefreq>`);
    if (entry.priority !== undefined) fields.push(`<priority>${entry.priority}</priority>`);
    return `<url>\n${fields.join('\n')}\n</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
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
