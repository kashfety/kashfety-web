import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
    try {
        console.log('🗑️ [Super Admin Delete Proxy] Request received');

        const { searchParams } = new URL(request.url);
        const adminId = searchParams.get('adminId');

        if (!adminId) {
            console.error('❌ Missing adminId parameter');
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

        // Forward the request to the backend API
        // Use the serverless function at /api/ which wraps the Express backend
        const backendUrl = 'https://kashfety.com';
        const apiUrl = `${backendUrl}/api/super-admin/admins/${adminId}`;

        console.log('🔄 [Super Admin Delete Proxy] Forwarding to backend Express API:', apiUrl);

        const backendResponse = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            }
        });

        const responseData = await backendResponse.json().catch(() => ({}));

        console.log('📥 [Super Admin Delete Proxy] Backend response:', {
            status: backendResponse.status,
            data: responseData
        });

        if (!backendResponse.ok) {
            console.error('❌ Backend request failed:', backendResponse.status, responseData);
            return NextResponse.json(
                responseData || { success: false, error: 'Failed to delete admin' },
                { status: backendResponse.status }
            );
        }

        console.log('✅ [Super Admin Delete Proxy] Admin deleted successfully');

        return NextResponse.json(responseData || {
            success: true,
            message: 'Admin deleted successfully'
        });

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
