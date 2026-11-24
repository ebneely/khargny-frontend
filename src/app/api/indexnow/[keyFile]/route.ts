import { publishedIndexNowKey } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ keyFile: string }> }): Promise<Response> {
  const { keyFile } = await params;
  const key = publishedIndexNowKey(process.env.INDEXNOW_KEY, keyFile);
  if (!key) return new Response('Not found', { status: 404 });
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
