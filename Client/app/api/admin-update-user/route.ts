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
        message: 'Admin update user route is active',
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
        const { userId, ...updates } = body;

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
                    method: 'PUT',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updates)
                });

                if (backendResponse.ok) {
                    const responseData = await backendResponse.json().catch(() => ({}));
                    return NextResponse.json(responseData || {
                        success: true,
                        message: 'User updated successfully'
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
                lastError || { success: false, error: 'Failed to update user - no fallback available' },
                { status: 500 }
            );
        }

        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

            // First verify the user exists and get current name fields
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('id, role, email, name, phone, first_name, last_name')
                .eq('id', userId)
                .single();

            if (fetchError || !existingUser) {
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

            // Handle name field updates - sync name with first_name/last_name
            // Priority: if name is provided directly, use it and split. Otherwise, combine first_name/last_name
            if (updates.name !== undefined && updates.name !== null && updates.name.trim() !== '') {
                // If name is updated directly, split it into first_name and last_name
                const nameParts = updates.name.trim().split(' ');
                updateData.name = updates.name.trim();
                updateData.first_name = nameParts[0] || '';
                updateData.last_name = nameParts.slice(1).join(' ') || '';
            } else {
                // Determine final first_name and last_name values
                const firstName = updates.first_name !== undefined ? updates.first_name : (existingUser.first_name || '');
                const lastName = updates.last_name !== undefined ? updates.last_name : (existingUser.last_name || '');
                
                // Always update first_name and last_name if they were provided
                if (updates.first_name !== undefined) {
                    updateData.first_name = firstName;
                }
                if (updates.last_name !== undefined) {
                    updateData.last_name = lastName;
                }
                
                // Always update name field when first_name or last_name are being updated
                if (updates.first_name !== undefined || updates.last_name !== undefined) {
                    updateData.name = `${firstName} ${lastName}`.trim();
                }
            }

            // Apply other updates
            if (updates.email !== undefined) updateData.email = updates.email;
            if (updates.phone !== undefined) updateData.phone = updates.phone;
            if (updates.approval_status !== undefined) updateData.approval_status = updates.approval_status;
            if (updates.role !== undefined) updateData.role = updates.role;


            // Update the user in Supabase
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', userId)
                .select()
                .single();

            if (updateError) {
                return NextResponse.json({
                    success: false,
                    error: 'Failed to update user',
                    details: updateError.message
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: 'User updated successfully',
                data: { user: updatedUser }
            });

        } catch (supabaseError: any) {
            return NextResponse.json(
                lastError || { success: false, error: 'Failed to update user', details: supabaseError.message },
                { status: 500 }
            );
        }

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: 'Failed to update user',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
