import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the auth token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Get form data from the request
    const formData = await request.formData();
    
    // Forward the request to the backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/center-dashboard/upload-lab-result`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: formData, // Forward the form data as-is
    });

    // Get the response data
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle non-JSON responses (like HTML error pages)
      const text = await response.text();
      data = { error: `Server returned non-JSON response: ${text.substring(0, 200)}...` };
    }
    
    // Return the response with the same status code
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Frontend API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
