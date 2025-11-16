import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Test handler to verify route exists
export async function GET(request: NextRequest) {
    return NextResponse.json({
        success: true,
        message: 'Admin delete user route is active',
        methods: ['POST']
    });
}

export async function POST(request: NextRequest) {
    try {
        console.log('🗑️ [Admin Delete User Proxy] Request received');

        // Get the request body
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            console.error('❌ Missing userId in request body');
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        console.log('🗑️ [Admin Delete User Proxy] Forwarding delete request for user:', userId);

        // Get the authorization token from the request
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            console.error('❌ Missing authorization header');
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        // Forward the request to the backend API
        const backendUrl = 'https://kashfety.com';
        const apiUrl = `${backendUrl}/api/auth/admin/users/${userId}`;

        console.log('🔄 [Admin Delete User Proxy] Forwarding to backend Express API:', apiUrl);

        const backendResponse = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            }
        });

        const responseData = await backendResponse.json().catch(() => ({}));

        console.log('📥 [Admin Delete User Proxy] Backend response:', {
            status: backendResponse.status,
            data: responseData
        });

        if (!backendResponse.ok) {
            console.error('❌ Backend request failed:', backendResponse.status, responseData);
            return NextResponse.json(
                responseData || { success: false, error: 'Failed to delete user' },
                { status: backendResponse.status }
            );
        }

        console.log('✅ [Admin Delete User Proxy] User deleted successfully');

        return NextResponse.json(responseData || {
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error: any) {
        console.error('❌ Admin delete user proxy error:', error);
        console.error('❌ Error stack:', error.stack);
        return NextResponse.json({
            success: false,
            error: 'Failed to delete user',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
