import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function PUT(request: NextRequest, { params }: { params: { centerId: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const body = await request.json();
    const { centerId } = params;

    const response = await fetch(`${BACKEND_URL}/api/auth/doctor/centers/${centerId}`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error (/api/auth/doctor/centers/[centerId] PUT):', error);
    return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { centerId: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const { centerId } = params;

    const response = await fetch(`${BACKEND_URL}/api/auth/doctor/centers/${centerId}`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      try {
        const data = JSON.parse(text);
        return NextResponse.json(data, { status: response.status });
      } catch {
        return NextResponse.json({ error: text || 'Delete failed' }, { status: response.status });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Proxy error (/api/auth/doctor/centers/[centerId] DELETE):', error);
    return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
  }
}
