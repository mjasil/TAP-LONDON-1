import { NextRequest, NextResponse } from 'next/server';
import { fetchDirectoryPage } from '@/lib/directoryPage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { section: string } }) {
  const searchParams = request.nextUrl.searchParams;
  try {
    const result = await fetchDirectoryPage(params.section, {
      category: (searchParams.get('category') || 'All').slice(0, 80),
      search: (searchParams.get('q') || '').slice(0, 80),
      filter: (searchParams.get('filter') || '').slice(0, 30),
      cursor: (searchParams.get('cursor') || '').slice(0, 110),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Directory page failed:', error);
    return NextResponse.json({ error: 'Listings are temporarily unavailable' }, { status: 503 });
  }
}
