import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function GET(
  request: NextRequest,
  { params }: { params: { centerId: string; doctorId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start_date') || undefined;
    const end = searchParams.get('end_date') || undefined;

    const qs = new URLSearchParams();
    if (start) qs.set('start_date', start);
    if (end) qs.set('end_date', end);

    const url = `${BACKEND_URL}/api/centers/${params.centerId}/doctors/${params.doctorId}/available-dates${qs.toString() ? `?${qs.toString()}` : ''}`;
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error (available dates):', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch available dates' }, { status: 500 });
  }
}
