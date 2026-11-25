import { describe, expect, it } from 'vitest';
import { opensearchDescription, opensearchLink } from './opensearch';

describe('OpenSearch description', () => {
  it('sends an English search to the plain explorer address', () => {
    const xml = opensearchDescription('en', 'https://www.example.com');
    expect(xml).toContain('<ShortName>5argny</ShortName>');
    expect(xml).toContain('<Language>en</Language>');
    expect(xml).toContain('template="https://www.example.com/explorer/?q={searchTerms}"');
    expect(xml).not.toContain('/ar/explorer/');
  });

  it('sends an Arabic search under /ar/ with the Arabic short name', () => {
    const xml = opensearchDescription('ar', 'https://www.example.com/');
    expect(xml).toContain('<ShortName>خرجني</ShortName>');
    expect(xml).toContain('<Language>ar</Language>');
    expect(xml).toContain('template="https://www.example.com/ar/explorer/?q={searchTerms}"');
    // A trailing slash on the site URL must not double up.
    expect(xml).not.toContain('//ar/');
  });

  it('points the page link at the language’s own description file', () => {
    expect(opensearchLink('en')).toMatchObject({ rel: 'search', href: '/opensearch.xml', title: '5argny' });
    expect(opensearchLink('ar')).toMatchObject({ rel: 'search', href: '/ar/opensearch.xml', title: 'خرجني' });
    expect(opensearchLink('en').type).toBe('application/opensearchdescription+xml');
  });
});
