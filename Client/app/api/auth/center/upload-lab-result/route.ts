import { NextRequest, NextResponse } from 'next/server';
import { getUserFromAuth } from '../utils/jwt-auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token
    const user = await getUserFromAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.role !== 'center') {
      return NextResponse.json({ error: 'Only medical centers can upload lab results' }, { status: 403 });
    }

    // Get the form data from the request
    const formData = await request.formData();
    
    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/center-dashboard/upload-lab-result`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
      },
      body: formData
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to upload lab result' }, 
      { status: 500 }
    );
  }
}
