import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
    try {
        console.log('📝 [Admin Delete Center] Starting center deletion');
        
        // Get authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { centerId } = body;

        if (!centerId) {
            console.log('❌ [Admin Delete Center] Center ID missing');
            return NextResponse.json(
                { error: 'Center ID is required' },
                { status: 400 }
            );
        }

        console.log('📝 [Admin Delete Center] Fetching center details:', centerId);

        // Get center details first
        const { data: center, error: centerError } = await supabase
            .from('centers')
            .select('id, name')
            .eq('id', centerId)
            .single();

        if (centerError || !center) {
            console.error('❌ [Admin Delete Center] Center not found:', centerError);
            return NextResponse.json(
                { error: 'Center not found' },
                { status: 404 }
            );
        }

        console.log('📝 [Admin Delete Center] Found center:', center.name);

        // Find users associated with this center (users with role 'center' and matching center_id)
        console.log('📝 [Admin Delete Center] Finding users linked to this center');
        const { data: centerUsers, error: usersError } = await supabase
            .from('users')
            .select('id')
            .eq('center_id', centerId);

        if (usersError) {
            console.error('❌ [Admin Delete Center] Error finding users:', usersError);
        } else if (centerUsers && centerUsers.length > 0) {
            console.log('📝 [Admin Delete Center] Found', centerUsers.length, 'user(s) to delete');
            
            // Delete associated users
            const { error: deleteUsersError } = await supabase
                .from('users')
                .delete()
                .eq('center_id', centerId);

            if (deleteUsersError) {
                console.error('❌ [Admin Delete Center] Error deleting users:', deleteUsersError);
            } else {
                console.log('✅ [Admin Delete Center] Users deleted successfully');
            }
        }

        console.log('📝 [Admin Delete Center] Deleting center from database');

        // Delete the center
        const { error: deleteCenterError } = await supabase
            .from('centers')
            .delete()
            .eq('id', centerId);

        if (deleteCenterError) {
            console.error('❌ [Admin Delete Center] Error deleting center:', deleteCenterError);
            return NextResponse.json(
                { error: 'Failed to delete center' },
                { status: 500 }
            );
        }

        console.log('✅ [Admin Delete Center] Center deleted successfully');

        return NextResponse.json({
            success: true,
            message: 'Center deleted successfully'
        });

    } catch (error) {
        console.error('❌ [Admin Delete Center] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
