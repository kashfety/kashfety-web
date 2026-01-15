import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
        // SECURITY: Require admin or super_admin role
        const authResult = requireAdmin(request);
        if (authResult instanceof NextResponse) {
            return authResult; // Returns 401 or 403
        }

        // Get the request body
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        // Get the authorization token from the request (for backend proxy)
        const authHeader = request.headers.get('authorization');

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

                const backendResponse = await fetch(apiUrl, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json',
                    }
                });

                if (backendResponse.ok) {
                    const responseData = await backendResponse.json().catch(() => ({}));
                    return NextResponse.json(responseData || {
                        success: true,
                        message: 'User deleted successfully'
                    });
                }

                lastError = await backendResponse.json().catch(() => ({ error: `HTTP ${backendResponse.status}` }));

            } catch (error: any) {
                lastError = { error: error.message };
                continue;
            }
        }

        // All backend endpoints failed, try Supabase fallback

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json(
                lastError || { success: false, error: 'Failed to delete user - no fallback available' },
                { status: 500 }
            );
        }

        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

            // First verify the user exists
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('id, role, email, name')
                .eq('id', userId)
                .single();

            if (fetchError || !existingUser) {
                return NextResponse.json({
                    success: false,
                    error: 'User not found'
                }, { status: 404 });
            }

            console.log('🔍 [Admin Delete User Proxy] Found user in Supabase:', {
                id: existingUser.id,
                role: existingUser.role,
                email: existingUser.email
            });

            // Delete the user from Supabase
            const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (deleteError) {
                return NextResponse.json({
                    success: false,
                    error: 'Failed to delete user',
                    details: deleteError.message
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: 'User deleted successfully',
                data: { deletedUser: existingUser }
            });

        } catch (supabaseError: any) {
            return NextResponse.json(
                lastError || { success: false, error: 'Failed to delete user', details: supabaseError.message },
                { status: 500 }
            );
        }

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: 'Failed to delete user',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
