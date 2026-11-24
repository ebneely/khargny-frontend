import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';

/**
 * POST /api/revalidate — refresh cached pages the moment the backend's data changes.
 *
 * Every rendered page is one cache entry **per language**, because the middleware rewrites `/explorer/x/` to
 * `/en/explorer/x/` and `/ar/explorer/x/` stays as it is. A public path is therefore refreshed under both language
 * prefixes, plus the bare path (harmless if it is not a cache key).
 *
 * Body: `{ "paths"?: string[], "tags"?: string[] }`
 *   paths  public addresses, e.g. `["/explorer/cairo/maharaja-zamalek/", "/"]`
 *   tags   fetch tags used by src/lib/server/public-data.ts, e.g. `["/v1/places/maharaja-zamalek", "public-discovery"]`
 *
 * Auth: `Authorization: Bearer <REVALIDATE_SECRET>` (or `x-revalidate-secret`). Without a matching secret it answers 401
 * and does nothing. The secret is never logged or echoed.
 *
 *   curl -X POST https://www.5argny.com/api/revalidate/ \
 *     -H "authorization: Bearer $REVALIDATE_SECRET" -H 'content-type: application/json' \
 *     -d '{"paths":["/explorer/cairo/maharaja-zamalek/"],"tags":["/v1/places/maharaja-zamalek"]}'
 *
 * The site serves trailing slashes (`trailingSlash: true`), so the address ends in `/`: a POST to `/api/revalidate`
 * answers 308 to `/api/revalidate/` first, and the body is only read on the second request. Callers must follow it
 * (fetch and curl -L do; a bare POST does not).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function secretMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const LANGS = ['en', 'ar'] as const;

function cacheKeysFor(path: string): string[] {
  if (!path.startsWith('/')) return [];
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const withSlash = clean === '/' ? '/' : `${clean}/`;
  const keys = new Set<string>([withSlash, clean === '/' ? '/en/' : `/en${withSlash}`, clean === '/' ? '/ar/' : `/ar${withSlash}`]);
  return [...keys];
}

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) return NextResponse.json({ ok: false, error: 'not configured' }, { status: 503 });

  const header = request.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : request.headers.get('x-revalidate-secret') ?? '';
  if (!given || !secretMatches(given, expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { paths?: unknown; tags?: unknown };
  try {
    body = (await request.json()) as { paths?: unknown; tags?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === 'string').slice(0, 500) : [];
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string' && t.length > 0 && t.length <= 512).slice(0, 200) : [];
  if (!paths.length && !tags.length) return NextResponse.json({ ok: false, error: 'nothing to revalidate' }, { status: 400 });

  const revalidated: string[] = [];
  for (const path of paths) {
    for (const key of cacheKeysFor(path)) {
      try {
        revalidatePath(key);
        revalidated.push(key);
      } catch {
        // A path that is not a rendered route throws: nothing cached under it, nothing to do.
      }
    }
  }
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  return NextResponse.json({ ok: true, revalidated, tags });
}

export function GET() {
  return NextResponse.json({ ok: false, error: 'method not allowed' }, { status: 405, headers: { allow: 'POST' } });
}
