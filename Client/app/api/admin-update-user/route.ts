import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Test handler to verify route exists
export async function GET(request: NextRequest) {
    return NextResponse.json({
        success: true,
        message: 'Admin update user route is active',
        methods: ['POST']
    });
}

export async function POST(request: NextRequest) {
    try {
        console.log('✏️ [Admin Update User Proxy] Request received');

        // Get the request body
        const body = await request.json();
        const { userId, ...updates } = body;

        if (!userId) {
            console.error('❌ Missing userId in request body');
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        console.log('✏️ [Admin Update User Proxy] Forwarding update request for user:', userId);

        // Get the authorization token from the request
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            console.error('❌ Missing authorization header');
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        console.log('📝 [Admin Update User Proxy] Update data:', updates);

        // Try multiple backend endpoints for maximum compatibility
        const backendUrls = [
            'https://kashfety.com/api/auth/admin/users',
            'https://kashfety.com/api/admin/users',
            process.env.NEXT_PUBLIC_API_URL && `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users`,
            process.env.NEXT_PUBLIC_API_URL && `${process.env.NEXT_PUBLIC_API_URL}/admin/users`
        ].filter(Boolean);

        let lastError = null;

        for (const baseUrl of backendUrls) {
            try {
                const apiUrl = `${baseUrl}/${userId}`;
                console.log('🔄 [Admin Update User Proxy] Trying endpoint:', apiUrl);

                const backendResponse = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updates)
                });

                if (backendResponse.ok) {
                    const responseData = await backendResponse.json().catch(() => ({}));
                    console.log('✅ [Admin Update User Proxy] Success with endpoint:', apiUrl);
                    return NextResponse.json(responseData || {
                        success: true,
                        message: 'User updated successfully'
                    });
                }

                lastError = await backendResponse.json().catch(() => ({ error: `HTTP ${backendResponse.status}` }));
                console.log('⚠️ [Admin Update User Proxy] Failed with endpoint:', apiUrl, 'Status:', backendResponse.status);

            } catch (error: any) {
                console.log('⚠️ [Admin Update User Proxy] Network error with endpoint:', baseUrl, error.message);
                lastError = { error: error.message };
                continue;
            }
        }

        // All endpoints failed
        console.error('❌ [Admin Update User Proxy] All backend endpoints failed');
        return NextResponse.json(
            lastError || { success: false, error: 'Failed to update user' },
            { status: 500 }
        );

    } catch (error: any) {
        console.error('❌ Admin update user proxy error:', error);
        console.error('❌ Error stack:', error.stack);
        return NextResponse.json({
            success: false,
            error: 'Failed to update user',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
