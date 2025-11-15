import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Proxy endpoint for reviewing doctor certificates
 * This routes requests to the backend server since Express routes aren't available on Vercel
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const certificateId = searchParams.get('certificateId');

    if (!certificateId) {
      return NextResponse.json(
        { error: 'Certificate ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 [Admin Review Certificate Proxy] Certificate ID:', certificateId);

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    console.log('📦 [Admin Review Certificate Proxy] Request body:', body);

    // Forward to backend server
    const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const endpoint = `${backendUrl}/api/auth/admin/certificates/${certificateId}/review`;
    
    console.log('📍 [Admin Review Certificate Proxy] Forwarding to:', endpoint);

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📡 [Admin Review Certificate Proxy] Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ [Admin Review Certificate Proxy] Backend error:', errorData);
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ [Admin Review Certificate Proxy] Success');
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('❌ [Admin Review Certificate Proxy] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to review certificate',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
