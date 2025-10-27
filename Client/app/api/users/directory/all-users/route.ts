import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    // Build query parameters
    const params = new URLSearchParams({
      page,
      limit,
      ...(search && { search }),
      ...(role && { role }),
      ...(status && { status })
    });

    // Forward the request to the backend
    const response = await fetch(`${API_BASE_URL}/api/users/all?${params}`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: 'Backend API error', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform the data to match expected structure
    const transformedData = {
      success: true,
      data: {
        users: data.data || data.users || [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil((data.total || data.data?.length || 0) / parseInt(limit)),
          totalUsers: data.total || data.data?.length || 0,
          limit: parseInt(limit)
        }
      }
    };

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('Users directory API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
