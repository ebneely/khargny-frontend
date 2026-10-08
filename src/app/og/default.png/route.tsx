import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET(): Promise<ImageResponse> {
  const [mark, arabicName] = await Promise.all([
    readFile(join(process.cwd(), 'public/images/5argny-mark-96.png'), 'base64'),
    readFile(join(process.cwd(), 'public/images/khargny-ar-wordmark.svg'), 'base64'),
  ]);
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60, background: '#D9622A', color: '#fff' }}>
      <img src={`data:image/png;base64,${mark}`} width={192} height={192} alt="5argny" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <img src={`data:image/svg+xml;base64,${arabicName}`} width={392} height={160} alt="خرجني" />
        <div style={{ fontSize: 76, fontWeight: 400 }}>Khargny</div>
        <div style={{ fontSize: 26, opacity: 0.85 }}>Find your next outing in Egypt</div>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=31536000' } },
  );
}
