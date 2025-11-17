import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

        // All backend endpoints failed, try Supabase fallback
        console.log('🔄 [Admin Update User Proxy] Backend endpoints failed, trying Supabase fallback');

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error('❌ Missing Supabase credentials for fallback');
            return NextResponse.json(
                lastError || { success: false, error: 'Failed to update user - no fallback available' },
                { status: 500 }
            );
        }

        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

            // First verify the user exists
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('id, role, email, name, phone')
                .eq('id', userId)
                .single();

            if (fetchError || !existingUser) {
                console.error('❌ User not found in Supabase:', fetchError);
                return NextResponse.json({
                    success: false,
                    error: 'User not found'
                }, { status: 404 });
            }

            console.log('🔍 [Admin Update User Proxy] Found user in Supabase:', {
                id: existingUser.id,
                role: existingUser.role,
                email: existingUser.email
            });

            // Prepare update data
            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            // Apply updates from the request
            if (updates.first_name !== undefined) updateData.first_name = updates.first_name;
            if (updates.last_name !== undefined) updateData.last_name = updates.last_name;
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.email !== undefined) updateData.email = updates.email;
            if (updates.phone !== undefined) updateData.phone = updates.phone;
            if (updates.approval_status !== undefined) updateData.approval_status = updates.approval_status;
            if (updates.role !== undefined) updateData.role = updates.role;

            console.log('📝 [Admin Update User Proxy] Supabase update data:', updateData);

            // Update the user in Supabase
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', userId)
                .select()
                .single();

            if (updateError) {
                console.error('❌ Failed to update user in Supabase:', updateError);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to update user',
                    details: updateError.message
                }, { status: 500 });
            }

            console.log('✅ [Admin Update User Proxy] User updated successfully in Supabase');
            return NextResponse.json({
                success: true,
                message: 'User updated successfully',
                data: { user: updatedUser }
            });

        } catch (supabaseError: any) {
            console.error('❌ Supabase fallback error:', supabaseError);
            return NextResponse.json(
                lastError || { success: false, error: 'Failed to update user', details: supabaseError.message },
                { status: 500 }
            );
        }

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
