// This API route is deprecated - use GraphQL query googleFindPlace instead
// Keeping for backward compatibility only
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use GraphQL query googleFindPlace instead.' },
    { status: 410 }
  );
}
