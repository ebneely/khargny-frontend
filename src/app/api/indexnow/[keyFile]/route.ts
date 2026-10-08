export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ keyFile: string }> }): Promise<Response> {
  const key = process.env.INDEXNOW_KEY;
  const { keyFile } = await params;
  if (!key || !/^[A-Za-z0-9-]{8,128}$/.test(key) || keyFile !== `${key}.txt`) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
