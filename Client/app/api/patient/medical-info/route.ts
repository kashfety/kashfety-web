import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth-utils';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET: Fetch patient's medical information
export async function GET(req: NextRequest) {
    try {
        // Require authentication
        const authResult = requireAuth(req);
        if (authResult instanceof NextResponse) {
            return authResult; // Returns 401 error
        }
        const { user: authenticatedUser } = authResult;

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId') || authenticatedUser.id;

        // Verify userId matches authenticated user (unless admin)
        if (authenticatedUser.role !== 'admin' && authenticatedUser.role !== 'super_admin') {
            if (userId !== authenticatedUser.id) {
                return NextResponse.json({
                    success: false,
                    message: 'Forbidden - You can only access your own medical information'
                }, { status: 403 });
            }
        }

        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "User ID is required"
            }, { status: 400 });
        }


        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('id, name, medical_history, allergies, medications, date_of_birth, gender, emergency_contact')
            .eq('id', userId)
            .eq('role', 'patient')
            .single();

        if (error) {
            throw error;
        }

        if (!user) {
            return NextResponse.json({
                success: false,
                message: "Patient not found"
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            medical_info: {
                id: user.id,
                name: user.name,
                date_of_birth: user.date_of_birth,
                gender: user.gender,
                medical_history: user.medical_history || '',
                allergies: user.allergies || '',
                medications: user.medications || '',
                emergency_contact: user.emergency_contact || {}
            }
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to fetch medical information'
        }, { status: 500 });
    }
}

// PUT: Update patient's medical information
export async function PUT(req: NextRequest) {
    try {
        // Require authentication
        const authResult = requireAuth(req);
        if (authResult instanceof NextResponse) {
            return authResult; // Returns 401 error
        }
        const { user: authenticatedUser } = authResult;

        const body = await req.json();
        const { userId, medical_history, allergies, medications, emergency_contact } = body;

        const finalUserId = userId || authenticatedUser.id;

        // Verify userId matches authenticated user (unless admin)
        if (authenticatedUser.role !== 'admin' && authenticatedUser.role !== 'super_admin') {
            if (finalUserId !== authenticatedUser.id) {
                return NextResponse.json({
                    success: false,
                    message: 'Forbidden - You can only update your own medical information'
                }, { status: 403 });
            }
        }

        if (!finalUserId) {
            return NextResponse.json({
                success: false,
                message: "User ID is required"
            }, { status: 400 });
        }


        // Validate that user exists and is a patient
        const { data: existingUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, role')
            .eq('id', finalUserId)
            .single();

        if (userError || !existingUser || existingUser.role !== 'patient') {
            return NextResponse.json({
                success: false,
                message: "Patient not found or invalid user"
            }, { status: 404 });
        }

        // Update medical information
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (medical_history !== undefined) updateData.medical_history = medical_history;
        if (allergies !== undefined) updateData.allergies = allergies;
        if (medications !== undefined) updateData.medications = medications;
        if (emergency_contact !== undefined) updateData.emergency_contact = emergency_contact;

        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', finalUserId);

        if (updateError) {
            throw updateError;
        }


        return NextResponse.json({
            success: true,
            message: "Medical information updated successfully"
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to update medical information'
        }, { status: 500 });
    }
}