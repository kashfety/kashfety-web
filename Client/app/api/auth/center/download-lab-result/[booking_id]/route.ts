import { NextRequest, NextResponse } from 'next/server';
import { getUserFromAuth } from '../../utils/jwt-auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function GET(
  request: NextRequest,
  { params }: { params: { booking_id: string } }
) {
  try {
    // Get user from JWT token
    const user = await getUserFromAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { booking_id } = params;

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/center-dashboard/download-lab-result/${booking_id}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate download link' }, 
      { status: 500 }
    );
  }
}
