import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth-utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    // Require authentication and verify token
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user: authenticatedUser } = authResult;

    const { uid } = params;

    // Verify uid matches authenticated user (unless admin)
    if (authenticatedUser.role !== 'admin' && authenticatedUser.role !== 'super_admin') {
      if (uid !== authenticatedUser.id && uid !== authenticatedUser.uid) {
        return NextResponse.json({
          error: 'Forbidden - You can only access your own profile'
        }, { status: 403 });
      }
    }

    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/api/users/profile/${uid}`, {
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
    return NextResponse.json(data);

  } catch (error) {
    console.error('User profile API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    // Require authentication and verify token
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user: authenticatedUser } = authResult;

    const { uid } = params;

    // Verify uid matches authenticated user (unless admin)
    if (authenticatedUser.role !== 'admin' && authenticatedUser.role !== 'super_admin') {
      if (uid !== authenticatedUser.id && uid !== authenticatedUser.uid) {
        return NextResponse.json({
          error: 'Forbidden - You can only update your own profile'
        }, { status: 403 });
      }
    }

    const authHeader = request.headers.get('authorization');
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/api/users/profile/${uid}`, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: 'Backend API error', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('User profile update API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    // Require authentication and verify token
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user: authenticatedUser } = authResult;

    const { uid } = params;

    // Verify uid matches authenticated user (unless admin)
    if (authenticatedUser.role !== 'admin' && authenticatedUser.role !== 'super_admin') {
      if (uid !== authenticatedUser.id && uid !== authenticatedUser.uid) {
        return NextResponse.json({
          error: 'Forbidden - You can only delete your own account'
        }, { status: 403 });
      }
    }

    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/api/users/account/${uid}/delete`, {
      method: 'DELETE',
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
    return NextResponse.json(data);

  } catch (error) {
    console.error('User delete API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
