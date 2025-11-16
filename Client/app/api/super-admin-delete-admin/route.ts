import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: NextRequest) {
    try {
        console.log('🗑️ [Super Admin Delete] Request received');

        // Check environment variables explicitly
        const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

        console.log('� [Super Admin Delete] Environment check:', {
            hasSupabaseUrl: !!SUPABASE_URL,
            hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
            urlValue: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 20)}...` : 'missing'
        });

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error('❌ Missing Supabase credentials:', {
                SUPABASE_URL: !!SUPABASE_URL,
                SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY
            });
            return NextResponse.json({
                success: false,
                error: 'Server configuration error - missing Supabase credentials'
            }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const adminId = searchParams.get('adminId');

        if (!adminId) {
            console.error('❌ Missing adminId parameter');
            return NextResponse.json({
                success: false,
                error: 'Admin ID is required'
            }, { status: 400 });
        }

        console.log('🗑️ [Super Admin Delete] Deleting admin:', adminId);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Get the authorization token
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            console.error('❌ Missing authorization header');
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        // Get admin info before deletion for validation and logging
        console.log('🔍 [Super Admin Delete] Fetching admin details...');
        const { data: adminToDelete, error: fetchError } = await supabase
            .from('users')
            .select('id, name, email, role, is_active')
            .eq('id', adminId)
            .in('role', ['admin', 'super_admin'])
            .single();

        if (fetchError) {
            console.error('❌ Error fetching admin:', fetchError);
            if (fetchError.code === 'PGRST116') {
                return NextResponse.json({
                    success: false,
                    error: 'Admin not found'
                }, { status: 404 });
            }
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch admin',
                details: fetchError.message
            }, { status: 500 });
        }

        if (!adminToDelete) {
            console.error('❌ Admin not found:', adminId);
            return NextResponse.json({
                success: false,
                error: 'Admin not found'
            }, { status: 404 });
        }

        console.log('👤 [Super Admin Delete] Found admin:', {
            id: adminToDelete.id,
            name: adminToDelete.name,
            email: adminToDelete.email,
            role: adminToDelete.role
        });

        // Prevent deletion of super admins (additional safety check)
        if (adminToDelete.role === 'super_admin') {
            console.error('❌ Cannot delete super admin:', adminId);
            return NextResponse.json({
                success: false,
                error: 'Cannot delete super admin accounts'
            }, { status: 403 });
        }

        // Delete the admin
        console.log('🗑️ [Super Admin Delete] Executing delete...');
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', adminId);

        if (deleteError) {
            console.error('❌ Failed to delete admin:', deleteError);
            console.error('❌ Delete error details:', {
                message: deleteError.message,
                code: deleteError.code,
                details: deleteError.details,
                hint: deleteError.hint
            });
            return NextResponse.json({
                success: false,
                error: 'Failed to delete admin',
                details: deleteError.message
            }, { status: 500 });
        }

        console.log('✅ [Super Admin Delete] Admin deleted successfully:', adminId);

        return NextResponse.json({
            success: true,
            message: 'Admin deleted successfully',
            data: {
                id: adminId,
                name: adminToDelete.name,
                email: adminToDelete.email
            }
        });

    } catch (error: any) {
        console.error('❌ Super admin delete API error:', error);
        console.error('❌ Error stack:', error.stack);
        return NextResponse.json({
            success: false,
            error: 'Failed to delete admin',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
