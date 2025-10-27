import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Proxy: GET /api/doctor-schedule/:doctorId/working-days[?center_id=...]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('center_id') || undefined;
    const { doctorId } = await params;

    const qs = new URLSearchParams();
    if (centerId) qs.set('center_id', centerId);

    const url = `${BACKEND_URL}/api/doctor-schedule/${doctorId}/working-days${qs.toString() ? `?${qs.toString()}` : ''}`;
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error (doctor-schedule working-days):', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch doctor working days' }, { status: 500 });
  }
}
