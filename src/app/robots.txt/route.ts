import robots from '@/lib/robots';
import { robotsText } from '@/lib/crawler-responses';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return new Response(robotsText(robots()), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
