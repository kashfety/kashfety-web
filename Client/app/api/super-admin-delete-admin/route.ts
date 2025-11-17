import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Add a GET handler to verify the route exists
export async function GET(request: NextRequest) {
    return NextResponse.json({
        success: true,
        message: 'Super admin delete route is active',
        methods: ['POST']
    });
}

export async function POST(request: NextRequest) {
    try {
        console.log('🗑️ [Super Admin Delete Proxy] Request received');

        // Get adminId from request body
        const body = await request.json();
        const { adminId } = body;

        if (!adminId) {
            console.error('❌ Missing adminId in request body');
            return NextResponse.json({
                success: false,
                error: 'Admin ID is required'
            }, { status: 400 });
        }

        console.log('🗑️ [Super Admin Delete Proxy] Forwarding delete request for admin:', adminId);

        // Get the authorization token from the request
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            console.error('❌ Missing authorization header');
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        // Try multiple backend endpoints for maximum compatibility
        const backendUrls = [
            'https://kashfety.com/api/super-admin/admins',
            'https://kashfety.com/api/admin/admins',
            process.env.NEXT_PUBLIC_API_URL && `${process.env.NEXT_PUBLIC_API_URL}/super-admin/admins`,
            process.env.NEXT_PUBLIC_API_URL && `${process.env.NEXT_PUBLIC_API_URL}/admin/admins`
        ].filter(Boolean);

        let lastError = null;

        for (const baseUrl of backendUrls) {
            try {
                const apiUrl = `${baseUrl}/${adminId}`;
                console.log('🔄 [Super Admin Delete Proxy] Trying endpoint:', apiUrl);

                const backendResponse = await fetch(apiUrl, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json',
                    }
                });

                if (backendResponse.ok) {
                    const responseData = await backendResponse.json().catch(() => ({}));
                    console.log('✅ [Super Admin Delete Proxy] Success with endpoint:', apiUrl);
                    return NextResponse.json(responseData || {
                        success: true,
                        message: 'Admin deleted successfully'
                    });
                }

                lastError = await backendResponse.json().catch(() => ({ error: `HTTP ${backendResponse.status}` }));
                console.log('⚠️ [Super Admin Delete Proxy] Failed with endpoint:', apiUrl, 'Status:', backendResponse.status);

            } catch (error: any) {
                console.log('⚠️ [Super Admin Delete Proxy] Network error with endpoint:', baseUrl, error.message);
                lastError = { error: error.message };
                continue;
            }
        }

        // All endpoints failed
        console.error('❌ [Super Admin Delete Proxy] All backend endpoints failed');
        return NextResponse.json(
            lastError || { success: false, error: 'Failed to delete admin' },
            { status: 500 }
        );

    } catch (error: any) {
        console.error('❌ Super admin delete proxy error:', error);
        console.error('❌ Error stack:', error.stack);
        return NextResponse.json({
            success: false,
            error: 'Failed to delete admin',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
