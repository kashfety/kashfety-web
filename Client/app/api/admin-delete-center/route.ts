import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        // Check if user is admin or super_admin
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userError || !userData || (userData.role !== 'admin' && userData.role !== 'super_admin')) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 403 }
            );
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
            .select('user_id')
            .eq('id', centerId)
            .single();

        if (centerError || !center) {
            return NextResponse.json(
                { error: 'Center not found' },
                { status: 404 }
            );
        }

        // Delete the center
        const { error: deleteCenterError } = await supabase
            .from('centers')
            .delete()
            .eq('id', centerId);

        if (deleteCenterError) {
            console.error('Error deleting center:', deleteCenterError);
            return NextResponse.json(
                { error: 'Failed to delete center' },
                { status: 500 }
            );
        }

        // Delete the associated user account if exists
        if (center.user_id) {
            const { error: deleteUserError } = await supabase
                .from('users')
                .delete()
                .eq('id', center.user_id);

            if (deleteUserError) {
                console.error('Error deleting user:', deleteUserError);
                // Continue anyway, center is already deleted
            }
        }

        return NextResponse.json({
            message: 'Center deleted successfully'
        });

    } catch (error) {
        console.error('Delete center error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
