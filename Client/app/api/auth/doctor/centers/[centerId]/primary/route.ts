import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function POST(request: NextRequest, { params }: { params: { centerId: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const { centerId } = params;

    const response = await fetch(`${BACKEND_URL}/api/auth/doctor/centers/${centerId}/primary`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(data || { error: 'Failed to set primary center' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error (/api/auth/doctor/centers/[centerId]/primary POST):', error);
    return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
  }
}
