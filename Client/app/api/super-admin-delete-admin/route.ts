import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function DELETE(request: NextRequest) {
    try {
        console.log('🗑️ [Super Admin Delete] Request received');
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

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error('❌ Missing Supabase credentials');
            return NextResponse.json({
                success: false,
                error: 'Server configuration error'
            }, { status: 500 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Get the authorization token
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            console.error('❌ Missing authorization header');
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        // Get current user from token (optional - for logging purposes)
        const token = authHeader.replace('Bearer ', '');

        // Get admin info before deletion for validation and logging
        const { data: adminToDelete, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', adminId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                console.error('❌ Admin not found:', adminId);
                return NextResponse.json({
                    success: false,
                    error: 'Admin not found'
                }, { status: 404 });
            }
            throw fetchError;
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
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', adminId);

        if (deleteError) {
            console.error('❌ Failed to delete admin:', deleteError);
            throw deleteError;
        }

        console.log('✅ [Super Admin Delete] Admin deleted successfully:', adminId);

        // TODO: Log the deletion in audit logs
        // This should be handled by the backend service layer

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
        return NextResponse.json({
            success: false,
            error: 'Failed to delete admin',
            details: error.message
        }, { status: 500 });
    }
}
