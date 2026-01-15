import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Require admin or super_admin role
        const authResult = requireAdmin(request);
        if (authResult instanceof NextResponse) {
            return authResult; // Returns 401 or 403
        }

        const body = await request.json();
        const { centerId } = body;

        if (!centerId) {
            return NextResponse.json(
                { error: 'Center ID is required' },
                { status: 400 }
            );
        }


        // Get center details first
        const { data: center, error: centerError } = await supabase
            .from('centers')
            .select('id, name')
            .eq('id', centerId)
            .single();

        if (centerError || !center) {
            return NextResponse.json(
                { error: 'Center not found' },
                { status: 404 }
            );
        }


        // Find users associated with this center (users with role 'center' and matching center_id)
        const { data: centerUsers, error: usersError } = await supabase
            .from('users')
            .select('id')
            .eq('center_id', centerId);

        if (usersError) {
        } else if (centerUsers && centerUsers.length > 0) {
            // Delete associated users
            const { error: deleteUsersError } = await supabase
                .from('users')
                .delete()
                .eq('center_id', centerId);

            if (deleteUsersError) {
            } else {
            }
        }


        // Delete the center
        const { error: deleteCenterError } = await supabase
            .from('centers')
            .delete()
            .eq('id', centerId);

        if (deleteCenterError) {
            return NextResponse.json(
                { error: 'Failed to delete center' },
                { status: 500 }
            );
        }


        return NextResponse.json({
            success: true,
            message: 'Center deleted successfully'
        });

    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
