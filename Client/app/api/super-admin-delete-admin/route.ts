import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

        // Get adminId from request body
        const body = await request.json();
        const { adminId } = body;

        if (!adminId) {
            return NextResponse.json({
                success: false,
                error: 'Admin ID is required'
            }, { status: 400 });
        }


        // Get the authorization token from the request
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
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
                        message: 'Admin deleted successfully'
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
                lastError || { success: false, error: 'Failed to delete admin - no fallback available' },
                { status: 500 }
            );
        }

        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

            // First verify the admin exists and has the right role
            const { data: existingAdmin, error: fetchError } = await supabase
                .from('users')
                .select('id, role, email, name')
                .eq('id', adminId)
                .in('role', ['admin', 'super_admin'])
                .single();

            if (fetchError || !existingAdmin) {
                return NextResponse.json({
                    success: false,
                    error: 'Admin not found'
                }, { status: 404 });
            }

            console.log('🔍 [Super Admin Delete Proxy] Found admin in Supabase:', {
                id: existingAdmin.id,
                role: existingAdmin.role,
                email: existingAdmin.email
            });

            // Delete the admin from Supabase
            const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', adminId);

            if (deleteError) {
                return NextResponse.json({
                    success: false,
                    error: 'Failed to delete admin',
                    details: deleteError.message
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: 'Admin deleted successfully',
                data: { deletedAdmin: existingAdmin }
            });

        } catch (supabaseError: any) {
            return NextResponse.json(
                lastError || { success: false, error: 'Failed to delete admin', details: supabaseError.message },
                { status: 500 }
            );
        }

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: 'Failed to delete admin',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
